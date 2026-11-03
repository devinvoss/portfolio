import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgxsModule } from '@ngxs/store';
import { ImagekitioAngularModule } from 'imagekitio-angular';
import { MovieService, ToastService, UserService } from '@app/services';
import { MovieState } from '@app/store/state/movie.state';
import { RecommendationState } from '@app/store/state/recommendation.state';
import { RouterTestingHarness } from '@angular/router/testing';
import { MovieListKind } from '../movie-list-kind';
import { COLLAPSED_GENRE_COUNT, FILTERS_OPEN_STORAGE_KEY, SearchComponent, TEXT_SEARCH_DEBOUNCE_MS } from './search.component';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SearchComponent,
        NgxsModule.forRoot([MovieState, RecommendationState]),
        // Results render movie list items, which need ImageKit configured
        ImagekitioAngularModule.forRoot({ publicKey: 'test', urlEndpoint: 'https://ik.imagekit.io/test' })
      ],
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

  it('should show the Add a movie button to the admin only', () => {
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('h1')?.textContent).toContain("Devin's Watched");
    expect(page.textContent).not.toContain('Add a movie');

    TestBed.inject(UserService).user$.next({ id: '1', role: 'admin', displayName: 'Devin' });
    fixture.detectChanges();
    expect(page.querySelector('a[href="/movie/add"]')?.textContent).toContain('Add a movie');
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

  it('should append the next page when the end of the list scrolls into view, until every movie is loaded', () => {
    const movie = (id: number) => ({ id: `${id}`, title: `Movie ${id}`, imageUrl: 'https://ik.imagekit.io/test/movie.jpg' });
    const firstPage = Array.from({ length: 40 }, (_, i) => movie(i));
    httpTesting.expectOne('api/movie/search').flush({
      criteria: { ...component.searchCriteria(), totalCount: 41 },
      results: firstPage
    });
    expect(component.hasMoreMovies()).toBe(true);

    component.nearEndOfList.set(true);
    TestBed.tick();
    const req = httpTesting.expectOne('api/movie/search');
    expect(req.request.body.criteria.page).toBe(1);
    expect(component.loadingMore()).toBe(true);

    req.flush({ criteria: { ...req.request.body.criteria, totalCount: 41 }, results: [movie(40)] });
    TestBed.tick();
    expect(component.movies().length).toBe(41);
    expect(component.loadingMore()).toBe(false);
    expect(component.hasMoreMovies()).toBe(false);
    httpTesting.expectNone('api/movie/search');
  });

  it('should go back to the first page and replace the list when the filters change', () => {
    jest.useFakeTimers();
    try {
      httpTesting.expectOne('api/movie/search').flush({
        criteria: { ...component.searchCriteria(), page: 2, totalCount: 200 },
        results: [{ id: '1', title: 'Alien', imageUrl: 'https://ik.imagekit.io/test/alien.jpg' }]
      });

      component.toggleOption(component.movieSearchForm.controls.genre, 'Horror');
      jest.advanceTimersByTime(0);
      const req = httpTesting.expectOne('api/movie/search');
      expect(req.request.body.criteria.page).toBe(0);
      req.flush({ criteria: req.request.body.criteria, results: [{ id: '2', title: 'Halloween', imageUrl: 'https://ik.imagekit.io/test/halloween.jpg' }] });

      expect(component.movies().map(x => x.title)).toEqual(['Halloween']);
    } finally {
      jest.useRealTimers();
    }
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

  describe('collapsing the filters', () => {
    const toggle = () => fixture.nativeElement.querySelector('.filters-toggle') as HTMLButtonElement;
    const body = () => fixture.nativeElement.querySelector('#movieFilters') as HTMLElement;

    afterEach(() => localStorage.removeItem(FILTERS_OPEN_STORAGE_KEY));

    it('should start open, and collapse and reopen from the header', () => {
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(body().inert).toBe(false);

      toggle().click();
      fixture.detectChanges();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(body().classList).not.toContain('open');
      // Collapsed fields can't be tabbed to
      expect(body().inert).toBe(true);

      toggle().click();
      fixture.detectChanges();
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
    });

    it('should remember being collapsed', () => {
      toggle().click();
      expect(localStorage.getItem(FILTERS_OPEN_STORAGE_KEY)).toBe('false');

      const next = TestBed.createComponent(SearchComponent);
      expect(next.componentInstance.filtersOpen()).toBe(false);
    });

    it('should show how many filters are active', () => {
      const count = () => fixture.nativeElement.querySelector('.filters-count')?.textContent?.trim();
      expect(count()).toBeUndefined();

      component.movieSearchForm.patchValue({ title: 'Alien', genre: ['Horror', 'Sci-Fi'], rating: [5] });
      fixture.detectChanges();
      expect(count()).toBe('4 active');
    });
  });

  describe('listing recommendations', () => {
    let recommended: SearchComponent;
    let harness: RouterTestingHarness;

    beforeEach(async () => {
      // Drop the watched list's search from the outer setup
      httpTesting.match(() => true);
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [
          NgxsModule.forRoot([MovieState, RecommendationState]),
          ImagekitioAngularModule.forRoot({ publicKey: 'test', urlEndpoint: 'https://ik.imagekit.io/test' })
        ],
        providers: [
          provideHttpClient(withXhr()),
          provideHttpClientTesting(),
          provideRouter([{ path: 'recommendations', data: { kind: MovieListKind.Recommended }, component: SearchComponent }])
        ],
      }).compileComponents();
      httpTesting = TestBed.inject(HttpTestingController);
      harness = await RouterTestingHarness.create();
      recommended = await harness.navigateByUrl('/recommendations', SearchComponent);
    });

    it('should search recommendations and their genres instead of watched movies', () => {
      httpTesting.expectOne('api/recommendation/genres').flush([{ genre: 'Horror', count: 2 }]);
      httpTesting.expectOne('api/recommendation/search').flush({
        criteria: { ...recommended.searchCriteria(), totalCount: 1 },
        results: [{ id: 'r1', title: 'Heat', imageUrl: 'https://image.tmdb.org/t/p/original/a.jpg', commentCount: 3 }]
      });
      httpTesting.expectNone('api/movie/search');
      harness.detectChanges();

      const page: HTMLElement = harness.routeNativeElement as HTMLElement;
      expect(page.textContent).toContain('Recommend a movie');
      expect(page.textContent).toContain('3 comments');
      // No ratings on recommendations, so no rating filter
      expect(page.querySelector('legend')?.textContent).not.toContain('Rating');
      expect(page.querySelector('.movie-list-item-image')?.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w780/a.jpg');
    });

    it('should sort by most discussed from the first page', () => {
      httpTesting.expectOne('api/recommendation/genres').flush([]);
      httpTesting.expectOne('api/recommendation/search').flush({ criteria: recommended.searchCriteria(), results: [] });

      recommended.sortBy(recommended.sortOptions[1]);

      const req = httpTesting.expectOne('api/recommendation/search');
      expect(req.request.body.criteria.sortFields).toEqual({ commentCount: -1 });
      expect(req.request.body.criteria.page).toBe(0);
    });
  });
});
