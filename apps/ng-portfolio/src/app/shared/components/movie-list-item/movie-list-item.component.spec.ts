import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagekitioAngularModule } from 'imagekitio-angular';
import { Movie } from '@portfolio/models';
import { MovieListItemComponent } from './movie-list-item.component';

describe('MovieListItemComponent', () => {
  let component: MovieListItemComponent;
  let fixture: ComponentFixture<MovieListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MovieListItemComponent,
        ImagekitioAngularModule.forRoot({ publicKey: 'test', urlEndpoint: 'https://ik.imagekit.io/test' })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieListItemComponent);
    component = fixture.componentInstance;
    component.movie = { title: 'Test Movie', imageUrl: 'https://ik.imagekit.io/test/test.jpg', rating: 3 } as Movie;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
