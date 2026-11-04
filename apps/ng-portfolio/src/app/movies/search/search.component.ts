import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GenreCount, MovieSearchCriteria, MovieSortFields } from '@portfolio/models';
import { MovieService, RecommendationService, ToastService, UserService } from '@app/services';
import { catchError, debounce, distinctUntilChanged, map, Observable, of, pairwise, skip, startWith, tap, timer } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { MOVIE_STATE_TOKEN } from '@app/store/state/movie.state';
import * as MovieActions from '@app/store/actions/movie.actions';
import { RECOMMENDATION_STATE_TOKEN } from '@app/store/state/recommendation.state';
import * as RecommendationActions from '@app/store/actions/recommendation.actions';
import { ListedMovie } from '../../shared/components/movie-list-item/movie-list-item.component';
import { getListKind, MovieListKind } from '../movie-list-kind';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { MovieListItemComponent } from '../../shared/components/movie-list-item/movie-list-item.component';
import { InViewportDirective } from '../../shared/directives';

export const defaultCriteria: MovieSearchCriteria = {
  page: 0,
  pageSize: 40,
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

// Remembers whether the filters were collapsed, per browser
export const FILTERS_OPEN_STORAGE_KEY = 'movieFiltersOpen';

// Recommendations can be sorted by how much they've been talked about
export const SORT_OPTIONS: { label: string; fields: MovieSortFields }[] = [
  { label: 'Newest', fields: { createdDate: -1 } },
  { label: 'Most discussed', fields: { commentCount: -1 } }
];

// What both the movie and recommendation stores hold for their list
interface ListState {
  lastSearchCriteria: MovieSearchCriteria | null;
  searchResults: ListedMovie[];
  genreCounts: GenreCount[] | null;
}

// A genre chip; count is missing when counts couldn't be loaded
type GenreOption = Omit<GenreCount, 'count'> & { count?: number };

@Component({
  selector: 'portfolio-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  imports: [ReactiveFormsModule, RouterLink, SkeletonLoaderComponent, MovieListItemComponent, InViewportDirective]
})
export class SearchComponent implements OnInit {
  private movieService = inject(MovieService);
  private recommendationService = inject(RecommendationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  // The same page lists both the watched movies and the recommendations
  readonly kind = getListKind(this.route);
  readonly isRecommended = this.kind === MovieListKind.Recommended;
  private state$: Observable<ListState> = this.isRecommended ? this.store.select(RECOMMENDATION_STATE_TOKEN) : this.store.select(MOVIE_STATE_TOKEN);
  readonly sortOptions = SORT_OPTIONS;
  isAdmin = toSignal(this.userService.isAdmin$, { initialValue: false });

  searchCriteria = signal<MovieSearchCriteria>({ ...defaultCriteria });
  // A fresh search, which replaces the results
  loading = signal(false);
  // The next page of the current results, which is appended
  loadingMore = signal(false);
  // Whether the end of the list is close enough to start loading the next page
  nearEndOfList = signal(false);

  movies = toSignal(this.state$.pipe(
    tap((data) => {
      this.loading.set(false);
      this.loadingMore.set(false);
      if (data.lastSearchCriteria) {
        this.searchCriteria.set({ ...data.lastSearchCriteria });
      }
    }),
    map(x => x.searchResults)
  ), { initialValue: <ListedMovie[]>[] });
  hasMoreMovies = computed(() => this.movies().length < (this.searchCriteria().totalCount ?? 0));

  ratingOptions = this.movieService.getRatingOptions();

  movieSearchForm =this.fb.nonNullable.group({
    title: [''],
    person: [''],
    genre: [(<string[]>[])],
    rating: [(<number[]>[])]
  })

  // Every genre in use, most popular overall first. This fixes the chip order so it doesn't shuffle as filters change.
  // Falls back to the static list (without counts) if the request fails.
  private allGenres = toSignal((this.isRecommended ? this.recommendationService.getGenreCounts() : this.movieService.getGenreCounts()).pipe(
    catchError(() => of(this.movieService.getGenres().map((genre): GenreOption => ({ genre }))))
  ), { initialValue: <GenreOption[]>[] });
  // Counts from the latest search, reflecting the current filters
  private filteredGenreCounts = toSignal(this.state$.pipe(map(x => x.genreCounts)), {
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

  filtersOpen = signal(readFiltersOpen());

  constructor() {
    // Keep loading pages while the end of the list is in view, so a tall screen still fills up
    effect(() => {
      if (this.nearEndOfList() && this.hasMoreMovies() && !this.loading() && !this.loadingMore()) {
        untracked(() => this.loadMore());
      }
    });
  }

  ngOnInit(): void {
    const previousState: ListState = this.isRecommended
      ? this.store.selectSnapshot(RECOMMENDATION_STATE_TOKEN)
      : this.store.selectSnapshot(MOVIE_STATE_TOKEN);
    const previousCriteria = previousState.lastSearchCriteria;
    if (previousCriteria) {
      // Reload from the first page rather than appending onto the list from last time
      this.searchCriteria.set({ ...previousCriteria, page: 0 });
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
    this.store.dispatch(this.searchAction(this.searchCriteria()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.loading.set(false);
          this.toastService.error(this.isRecommended ? 'Loading recommendations failed.' : 'Movie search failed.');
        }
      });
  }

  toggleOption<T>(control: FormControl<T[]>, option: T) {
    const selected = control.value;
    control.setValue(selected.includes(option)
      ? selected.filter(x => x !== option)
      : [...selected, option]);
  }

  toggleFilters() {
    const open = !this.filtersOpen();
    this.filtersOpen.set(open);
    try {
      localStorage.setItem(FILTERS_OPEN_STORAGE_KEY, String(open));
    } catch {
      // Storage can be blocked; the toggle still works for this visit
    }
  }

  // How many filters are set, shown in the header so collapsed filters aren't forgotten
  activeFilterCount(): number {
    const { title, person, genre, rating } = this.currentFilters();
    return (title ? 1 : 0) + (person ? 1 : 0) + genre.length + rating.length;
  }

  hasFilters(): boolean {
    const { title, person, genre, rating } = this.currentFilters();
    return !!(title || person || genre.length || rating.length);
  }

  clearFilters() {
    this.movieSearchForm.reset();
  }

  navigateToMovie(movie: ListedMovie) {
    this.router.navigate(this.isRecommended ? ['/recommendations', movie.id] : ['/movie/detail', movie.id]);
  }

  isSortedBy(option: typeof SORT_OPTIONS[number]): boolean {
    return JSON.stringify(this.searchCriteria().sortFields ?? defaultCriteria.sortFields) === JSON.stringify(option.fields);
  }

  sortBy(option: typeof SORT_OPTIONS[number]) {
    if (this.isSortedBy(option)) {
      return;
    }
    this.searchCriteria.update(criteria => ({ ...criteria, sortFields: option.fields, page: 0 }));
    this.search();
  }

  private searchAction(criteria: MovieSearchCriteria) {
    return this.isRecommended ? new RecommendationActions.SearchRecommendations(criteria) : new MovieActions.SearchMovies(criteria);
  }

  loadMore() {
    this.loadingMore.set(true);
    this.store.dispatch(this.searchAction({
      ...this.searchCriteria(),
      page: this.searchCriteria().page + 1
    }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.loadingMore.set(false);
          this.toastService.error('Loading more movies failed.');
        }
      });
  }
}

function readFiltersOpen(): boolean {
  try {
    return localStorage.getItem(FILTERS_OPEN_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}
