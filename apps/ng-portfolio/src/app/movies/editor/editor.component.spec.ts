import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastService } from '@app/services';
import { EditorMode } from '@app/shared/common/enums';
import { MovieListKind } from '../movie-list-kind';
import { EditorComponent } from './editor.component';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe(EditorMode.ADD);
  });
});

describe('EditorComponent recommending a movie', () => {
  let component: EditorComponent;
  let harness: RouterTestingHarness;
  let httpTesting: HttpTestingController;
  let router: Router;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'recommendations/add', data: { kind: MovieListKind.Recommended }, component: EditorComponent },
          { path: '**', children: [] }
        ])
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl('/recommendations/add', EditorComponent);
  });

  it('should hide the rating and poster URL fields', () => {
    expect(component.mode()).toBe(EditorMode.RECOMMEND);
    const page = harness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Recommend a Movie');
    expect(page.querySelector('[aria-label="Rating"]')).toBeNull();
    expect(page.querySelector('input[type="url"]')).toBeNull();
  });

  it('should ask for a movie from the search results before sending anything', () => {
    const error = jest.spyOn(toastService, 'error');
    component.save();
    expect(error).toHaveBeenCalledWith('Pick a movie from the search results first.');
    httpTesting.expectNone('api/recommendation');
  });

  it('should send the TMDB id, chosen poster and note, then open the recommendation', async () => {
    component.tmdbId.set(949);
    component.movieForm.patchValue({ notes: '  You have to see this  ', imageUrl: 'https://image.tmdb.org/t/p/original/a.jpg' });
    const navigate = jest.spyOn(router, 'navigate');

    component.save();
    const req = httpTesting.expectOne('api/recommendation');
    expect(req.request.body).toEqual({ tmdbId: 949, imageUrl: 'https://image.tmdb.org/t/p/original/a.jpg', note: 'You have to see this' });
    req.flush({ recommendation: { id: 'r1', title: 'Heat' }, alreadyRecommended: true });

    expect(navigate).toHaveBeenCalledWith(['/recommendations', 'r1']);
  });

  it('should send people to the watched movie when Devin has already seen it', () => {
    // Typing a title clears a picked movie, so pick it after
    component.movieForm.patchValue({ title: 'Heat' });
    component.tmdbId.set(949);
    const navigate = jest.spyOn(router, 'navigate');

    component.save();
    httpTesting.expectOne('api/recommendation').flush(
      { message: 'Devin has already watched this movie.', movieId: 'm1' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(navigate).toHaveBeenCalledWith(['/movie/detail', 'm1']);
    expect(component.isSaving()).toBe(false);
  });
});

describe('EditorComponent converting a recommendation', () => {
  it('should fill in the recommendation and save it through the convert endpoint', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([{ path: 'movie/add', component: EditorComponent }, { path: '**', children: [] }])
      ],
    }).compileComponents();
    const httpTesting = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/movie/add?recommendation=r1', EditorComponent);

    httpTesting.expectOne('api/recommendation/r1').flush({
      id: 'r1', tmdbId: 155, title: 'The Dark Knight', year: 2008, genre: ['Action'], synopsis: '', actors: [], director: 'Christopher Nolan',
      runtimeMinutes: 152, mpaaRating: 'PG-13', imageUrl: 'https://image.tmdb.org/t/p/original/a.jpg', recommendedBy: null, commentCount: 2, createdDate: ''
    });
    httpTesting.expectOne('api/tmdb/movie/155').flush({ posters: [] });

    expect(component.mode()).toBe(EditorMode.ADD);
    expect(component.movieForm.controls.title.disabled).toBe(true);
    expect(component.recommendation()?.id).toBe('r1');

    component.setRating(5);
    component.save();
    const req = httpTesting.expectOne('api/recommendation/r1/convert');
    expect(req.request.body).toEqual(expect.objectContaining({ title: 'The Dark Knight', rating: 5, tmdbId: 155, imageUrl: 'https://image.tmdb.org/t/p/original/a.jpg' }));
    httpTesting.expectNone('api/movie');
  });
});
