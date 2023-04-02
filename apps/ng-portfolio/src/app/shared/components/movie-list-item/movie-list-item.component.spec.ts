import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieListItemComponent } from './movie-list-item.component';

describe('MovieListItemComponent', () => {
  let component: MovieListItemComponent;
  let fixture: ComponentFixture<MovieListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MovieListItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
