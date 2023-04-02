import { trigger, transition, style, animate } from '@angular/animations';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { Movie, MovieSearchCriteria } from '@portfolio/models';
import { MovieService } from '@app/services';
import { map, Observable, tap } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { OnInit } from '@angular/core';
import { DestroyableComponent } from '@app/core/components';
import { Store } from '@ngxs/store';
import { MOVIE_STATE_TOKEN } from '@app/store/state/movie.state';
import { MovieActions } from '@app/store/actions/movie.actions';
import { PageEvent } from '@angular/material/paginator';

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

@Component({
  selector: 'portfolio-search',
  animations: [
    trigger('trigger', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100%)' }),
        animate('.3s', style({ opacity: 1, transform: 'translateY(0)'}))
      ])
    ])
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent extends DestroyableComponent implements OnInit {

  searchCriteria: MovieSearchCriteria = { ...defaultCriteria };

  $movies: Observable<Movie[]> = this.store.select(MOVIE_STATE_TOKEN).pipe(
    this.takeUntilDestroyed,
    tap((data) => {
      this.loading = false;
      if (data.lastSearchCriteria) {
        this.searchCriteria = { ...data.lastSearchCriteria };
      }
      this.cdr.detectChanges();
    }),
    map(x => x.searchResults)
  );

  ratingOptions = this.movieService.getRatingOptions();
  genres = this.movieService.getGenres();
  loading = false;

  movieSearchForm = this.fb.group({
    title: [''],
    person: [''],
    genre: [(<string[]>[])],
    rating: [(<number[]>[])]
  })

  constructor(private movieService: MovieService,
    private router: Router,
    private fb: FormBuilder,
    private store: Store,
    private cdr: ChangeDetectorRef) {
    super();
  }

  ngOnInit(): void {
    const previousCriteria = this.store.selectSnapshot(MOVIE_STATE_TOKEN).lastSearchCriteria;
    if (previousCriteria) {
      this.searchCriteria = { ...previousCriteria };
      this.movieSearchForm.reset({
        title: previousCriteria.searchFields?.title || '',
        person: previousCriteria.searchFields?.person || '',
        genre: previousCriteria?.searchFields?.genre || [],
        rating: previousCriteria.searchFields?.rating || []
      });
    }
    this.search();
  }

  search() {
    if (this.loading) {
      return;
    }

    if (this.criteriaChanged()) {
      this.searchCriteria.page = 0;
    }

    this.searchCriteria = {
      ...this.searchCriteria,
      searchFields: {
        title: this.movieSearchForm.get('title')?.value || '',
        person: this.movieSearchForm.get('person')?.value || '',
        genre: this.movieSearchForm.get('genre')?.value || [],
        rating: this.movieSearchForm.get('rating')?.value || []
      }
    };

    this.loading = true;
    this.cdr.detectChanges();
    this.store.dispatch(new MovieActions.SearchMovies(this.searchCriteria));
  }

  navigateToMovie(movie: Movie) {
    this.router.navigate([`/movie/detail/${movie.id}`]);
  }

  trackByMovie(index: number, movie: Movie): string {
    return movie.id;
  }
  
  handlePage(event: PageEvent) {
    this.searchCriteria = {
      ...this.searchCriteria,
      page: event.pageIndex,
      pageSize: event.pageSize
    }
    this.search();
  }

  criteriaChanged(): boolean {
    const previousCriteria = this.store.selectSnapshot(MOVIE_STATE_TOKEN).lastSearchCriteria;
    if (!previousCriteria) {
      return false;
    }

    if (previousCriteria.searchFields.title !== this.movieSearchForm.get('title')?.value) {
      return true;
    }
    if (previousCriteria.searchFields.person !== this.movieSearchForm.get('person')?.value) {
      return true;
    }
    if (!this.arraysHaveSameValues(previousCriteria.searchFields.rating, this.movieSearchForm.get('rating')?.value || [])) {
      return true;
    }
    if (!this.arraysHaveSameValues(previousCriteria.searchFields.genre, this.movieSearchForm.get('genre')?.value || [])) {
      return true;
    }

    return false;
  }

  arraysHaveSameValues(a: any[], b: any[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let retValue = true;
    a.forEach((_value, index) => {
      if (a[index] !== b[index]) {
        retValue = false;
        return;
      }
    });

    return retValue;
  }
}
