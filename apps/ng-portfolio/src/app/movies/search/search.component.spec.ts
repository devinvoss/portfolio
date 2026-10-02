import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgxsModule } from '@ngxs/store';
import { ToastService } from '@app/services';
import { MovieState } from '@app/store/state/movie.state';
import { MoviesModule } from '../movies.module';
import { SearchComponent } from './search.component';

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
