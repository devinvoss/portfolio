import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { GenreCount, Movie, MovieSearchCriteria } from '@portfolio/models';
import { MovieService, ToastService } from '@app/services';
import { catchError, debounce, distinctUntilChanged, map, Observable, of, pairwise, skip, startWith, tap, timer } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { MOVIE_STATE_TOKEN } from '@app/store/state/movie.state';
import * as MovieActions from '@app/store/actions/movie.actions';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { MovieListItemComponent } from '../../shared/components/movie-list-item/movie-list-item.component';
import { AsyncPipe } from '@angular/common';

export const defaultCriteria: MovieSearchCriteria = {
  page: 0,
  pageSize: 20,
  searchFields: {
    title: '',
    person: '',
    rating: [],
    genre: []
  },
  sortFields: {
    createdDate: -1
  }
}

// Delay before a text field change triggers a search, so typing doesn't spam the API
export const TEXT_SEARCH_DEBOUNCE_MS = 300;

// How many genres show before the "Show more" toggle
export const COLLAPSED_GENRE_COUNT = 10;

// A genre chip; count is missing when counts couldn't be loaded
type GenreOption = Omit<GenreCount, 'count'> & { count?: number };

@Component({
  selector: 'portfolio-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  imports: [ReactiveFormsModule, SkeletonLoaderComponent, MovieListItemComponent, MatPaginator, AsyncPipe]
})
export class SearchComponent implements OnInit {
  private movieService = inject(MovieService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  searchCriteria = signal<MovieSearchCriteria>({ ...defaultCriteria });

  $movies: Observable<Movie[]> = this.store.select(MOVIE_STATE_TOKEN).pipe(
    tap((data) => {
      this.loading.set(false);
      if (data.lastSearchCriteria) {
        this.searchCriteria.set({ ...data.lastSearchCriteria });
      }
    }),
    map(x => x.searchResults),
    takeUntilDestroyed()
  );

  ratingOptions = this.movieService.getRatingOptions();
  loading = signal(false);

  movieSearchForm = this.fb.nonNullable.group({
    title: [''],
    person: [''],
    genre: [(<string[]>[])],
    rating: [(<number[]>[])]
  })

  // Every genre in use, most popular overall first. This fixes the chip order so it doesn't shuffle as filters change.
  // Falls back to the static list (without counts) if the request fails.
  private allGenres = toSignal(this.movieService.getGenreCounts().pipe(
    catchError(() => of(this.movieService.getGenres().map((genre): GenreOption => ({ genre }))))
  ), { initialValue: <GenreOption[]>[] });
  // Counts from the latest search, reflecting the current filters
  private filteredGenreCounts = toSignal(this.store.select(MOVIE_STATE_TOKEN).pipe(map(x => x.genreCounts)), {
    initialValue: null
  });

  genreCounts = computed((): GenreOption[] => {
    const allGenres = this.allGenres();
    const filtered = this.filteredGenreCounts();
    if (!filtered) {
      return allGenres;
    }

    const counts = new Map(filtered.map(x => [x.genre, x.count]));
    const known = new Set(allGenres.map(x => x.genre));
    return [
      ...allGenres.map(x => ({ genre: x.genre, count: counts.get(x.genre) ?? 0 })),
      // Genres added since the overall list was fetched
      ...filtered.filter(x => !known.has(x.genre))
    ];
  });
  selectedGenres = toSignal(this.movieSearchForm.controls.genre.valueChanges, {
    initialValue: this.movieSearchForm.controls.genre.value
  });
  showAllGenres = signal(false);

  // Collapsed, show the most popular genres plus any selected ones so active filters stay visible
  visibleGenres = computed(() => {
    const genres = this.genreCounts();
    if (this.showAllGenres()) {
      return genres;
    }
    const selected = this.selectedGenres();
    return genres.filter((x, index) => index < COLLAPSED_GENRE_COUNT || selected.includes(x.genre));
  });
  hasMoreGenres = computed(() => this.genreCounts().length > COLLAPSED_GENRE_COUNT);

  ngOnInit(): void {
    const previousCriteria = this.store.selectSnapshot(MOVIE_STATE_TOKEN).lastSearchCriteria;
    if (previousCriteria) {
      this.searchCriteria.set({ ...previousCriteria });
      this.movieSearchForm.reset({
        title: previousCriteria.searchFields?.title || '',
        person: previousCriteria.searchFields?.person || '',
        genre: previousCriteria.searchFields?.genre || [],
        rating: previousCriteria.searchFields?.rating || []
      });
    }
    this.listenForFilterChanges();
    this.search();
  }

  private listenForFilterChanges() {
    const initialFilters = this.currentFilters();

    this.movieSearchForm.valueChanges.pipe(
      map(() => this.currentFilters()),
      startWith(initialFilters),
      pairwise(),
      // Only text changes are debounced; toggling a genre or rating searches right away
      debounce(([prev, next]) => prev.title !== next.title || prev.person !== next.person
        ? timer(TEXT_SEARCH_DEBOUNCE_MS)
        : timer(0)),
      map(([, next]) => next),
      startWith(initialFilters),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      skip(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      // New filters mean a new result set, so start back at the first page
      this.searchCriteria.update(criteria => ({ ...criteria, page: 0 }));
      this.search();
    });
  }

  private currentFilters(): MovieSearchCriteria['searchFields'] {
    const { title, person, genre, rating } = this.movieSearchForm.getRawValue();
    return {
      title: title.trim(),
      person: person.trim(),
      genre: [...genre].sort(),
      rating: [...rating].sort()
    };
  }

  search() {
    this.searchCriteria.update(criteria => ({
      ...criteria,
      searchFields: this.currentFilters()
    }));

    this.loading.set(true);
    this.store.dispatch(new MovieActions.SearchMovies(this.searchCriteria()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.loading.set(false);
          this.toastService.error('Movie search failed.');
        }
      });
  }

  toggleOption<T>(control: FormControl<T[]>, option: T) {
    const selected = control.value;
    control.setValue(selected.includes(option)
      ? selected.filter(x => x !== option)
      : [...selected, option]);
  }

  hasFilters(): boolean {
    const { title, person, genre, rating } = this.currentFilters();
    return !!(title || person || genre.length || rating.length);
  }

  clearFilters() {
    this.movieSearchForm.reset();
  }

  navigateToMovie(movie: Movie) {
    this.router.navigate([`/movie/detail/${movie.id}`]);
  }

  handlePage(event: PageEvent) {
    this.searchCriteria.update(criteria => ({
      ...criteria,
      page: event.pageIndex,
      pageSize: event.pageSize
    }));
    this.search();
  }
}
