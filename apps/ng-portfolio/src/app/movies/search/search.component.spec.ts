import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgxsModule } from '@ngxs/store';
import { MovieService, ToastService } from '@app/services';
import { MovieState } from '@app/store/state/movie.state';
import { MoviesModule } from '../movies.module';
import { COLLAPSED_GENRE_COUNT, SearchComponent, TEXT_SEARCH_DEBOUNCE_MS } from './search.component';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoviesModule, NgxsModule.forRoot([MovieState])],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search after the debounce when a text field changes', () => {
    jest.useFakeTimers();
    try {
      httpTesting.expectOne('api/movie/search').flush({ criteria: component.searchCriteria(), results: [] });

      component.movieSearchForm.controls.title.setValue('Ali');
      jest.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
      component.movieSearchForm.controls.title.setValue('Alien');
      jest.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
      httpTesting.expectNone('api/movie/search');

      jest.advanceTimersByTime(1);
      const req = httpTesting.expectOne('api/movie/search');
      expect(req.request.body.criteria.searchFields.title).toBe('Alien');
      expect(req.request.body.criteria.page).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should search right away when a genre or rating is toggled', () => {
    jest.useFakeTimers();
    try {
      httpTesting.expectOne('api/movie/search').flush({ criteria: component.searchCriteria(), results: [] });

      component.toggleOption(component.movieSearchForm.controls.genre, 'Horror');
      jest.advanceTimersByTime(0);
      expect(httpTesting.expectOne('api/movie/search').request.body.criteria.searchFields.genre).toEqual(['Horror']);

      component.toggleOption(component.movieSearchForm.controls.rating, 5);
      jest.advanceTimersByTime(0);
      expect(httpTesting.expectOne('api/movie/search').request.body.criteria.searchFields.rating).toEqual([5]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should search once when filters are cleared', () => {
    jest.useFakeTimers();
    try {
      httpTesting.expectOne('api/movie/search').flush({ criteria: component.searchCriteria(), results: [] });
      component.toggleOption(component.movieSearchForm.controls.genre, 'Horror');
      jest.advanceTimersByTime(0);
      httpTesting.expectOne('api/movie/search');

      component.clearFilters();
      jest.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
      expect(httpTesting.expectOne('api/movie/search').request.body.criteria.searchFields.genre).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should not search again when a text change ends up back where it started', () => {
    jest.useFakeTimers();
    try {
      httpTesting.expectOne('api/movie/search').flush({ criteria: component.searchCriteria(), results: [] });

      component.movieSearchForm.controls.title.setValue('A');
      component.movieSearchForm.controls.title.setValue(' ');
      jest.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
      httpTesting.expectNone('api/movie/search');
    } finally {
      jest.useRealTimers();
    }
  });

  it('should show the most popular genres, plus any selected ones, until expanded', () => {
    const genreCounts = Array.from({ length: 12 }, (_, i) => ({ genre: `Genre ${i}`, count: 12 - i }));
    httpTesting.expectOne('api/movie/genres').flush(genreCounts);

    expect(component.visibleGenres().map(x => x.genre)).toEqual(genreCounts.slice(0, COLLAPSED_GENRE_COUNT).map(x => x.genre));
    expect(component.hasMoreGenres()).toBe(true);

    component.toggleOption(component.movieSearchForm.controls.genre, 'Genre 11');
    expect(component.visibleGenres().map(x => x.genre)).toContain('Genre 11');
    expect(component.visibleGenres().length).toBe(COLLAPSED_GENRE_COUNT + 1);

    component.showAllGenres.set(true);
    expect(component.visibleGenres()).toEqual(genreCounts);
  });

  it('should show the latest search\'s genre counts in the overall popularity order', () => {
    httpTesting.expectOne('api/movie/genres').flush([{ genre: 'Drama', count: 5 }, { genre: 'Horror', count: 2 }]);
    expect(component.genreCounts()).toEqual([{ genre: 'Drama', count: 5 }, { genre: 'Horror', count: 2 }]);

    httpTesting.expectOne('api/movie/search').flush({
      criteria: component.searchCriteria(),
      results: [],
      genreCounts: [{ genre: 'Horror', count: 1 }, { genre: 'Western', count: 1 }]
    });

    expect(component.genreCounts()).toEqual([
      { genre: 'Drama', count: 0 },
      { genre: 'Horror', count: 1 },
      { genre: 'Western', count: 1 }
    ]);
  });

  it('should fall back to the static genre list when the genre request fails', () => {
    httpTesting.expectOne('api/movie/genres').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.genreCounts().map(x => x.genre)).toEqual(TestBed.inject(MovieService).getGenres());
  });

  it('should stop loading and show an error when the search fails', () => {
    const toastError = jest.spyOn(TestBed.inject(ToastService), 'error');
    httpTesting.expectOne('api/movie/search').flush({ criteria: component.searchCriteria(), results: [] });

    component.search();
    expect(component.loading()).toBe(true);
    httpTesting.expectOne('api/movie/search').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Movie search failed.');
  });
});
