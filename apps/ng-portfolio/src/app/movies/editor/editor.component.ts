import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DestroyableComponent } from '@app/core/components';
import { MovieService, ToastService } from '@app/services';
import { EditorMode } from '@app/shared/common/enums';
import { Movie } from '@portfolio/models';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { fadeInAnimation } from '@app/shared/animations';
import { map } from 'rxjs';

@Component({
  selector: 'portfolio-editor',
  animations: [
    fadeInAnimation()
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent extends DestroyableComponent implements OnInit {

  mode: EditorMode = EditorMode.ADD;
  movieId = '';

  movieForm = this.fb.group({
    title: '',
    year: <number | null>null,
    rating: 0,
    genre: [<string[]>[]],
    actors: [<string[]>[]],
    director: '',
    synopsis: '',
    notes: '',
    imageUrl: '',
    mpaaRating: '',
    runtimeMinutes: <number | null>null
  });

  genres = this.movieService.getGenres();
  ratings = this.movieService.getRatingOptions();
  mpaaRatings = this.movieService.getMPAARatings();
  yearRange = this.movieService.getCurrentMovieYears();
  separatorKeysCodes: number[] = [ENTER, COMMA];

  selectedActors: string[] = [];
  isSaving: boolean = false;

  imageUrl$ = this.movieForm.controls.imageUrl?.valueChanges.pipe(this.takeUntilDestroyed)

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private toastService: ToastService) {
    super();
  }

  ngOnInit(): void {
    this.route.params.pipe(this.takeUntilDestroyed).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.mode = EditorMode.EDIT;
        this.movieService.getMovie(id).pipe(this.takeUntilDestroyed).subscribe(movie => {
          this.movieId = movie.id;
          this.populateMovieForm(movie);
        });
      } else {
        this.mode = EditorMode.ADD;
      }
    })
  }

  removeActor(index: number) {
    this.selectedActors.splice(index, 1);
    this.selectedActors = [...this.selectedActors];
  }

  addActor(event: MatChipInputEvent) {
    const input = event.chipInput.inputElement;
    const value = event.value.trim();

    if (value) {
      this.selectedActors = [...this.selectedActors, value]
    }

    input.value = '';
  }
  
  save() {
    if (this.isSaving) {
      return;
    }
    
    this.isSaving = true;

    if (this.mode === EditorMode.ADD) {
      this.movieService.addMovie(this.getMovieFromForm())
        .pipe(this.takeUntilDestroyed)
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toastService.success(`${res.title} successfully added.`);
          this.router.navigateByUrl(`movie/detail/${res.id}`);
        },
        error: () => {
          this.isSaving = false;
          this.toastService.error('Add Movie Failed');
        }
      })
    }

    if (this.mode === EditorMode.EDIT) {
      this.movieService.updateMovie(this.getMovieFromForm())
        .pipe(this.takeUntilDestroyed)
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toastService.success(`${res.title} successfully updated.`);
          this.router.navigateByUrl(`movie/detail/${res.id}`);
        },
        error: () => {
          this.isSaving = false;
          this.toastService.error('Update Movie Failed');
        }
      })
    }
  }

  private populateMovieForm(movie: Movie) {
    this.selectedActors = movie.actors;
    this.movieForm.patchValue({
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      genre: movie.genre,
      director: movie.director,
      synopsis: movie.synopsis,
      notes: movie.notes,
      imageUrl: movie.imageUrl,
      mpaaRating: movie.mpaaRating,
      runtimeMinutes: movie.runtimeMinutes
    })
  }

  private getMovieFromForm(): Movie {
    const form = this.movieForm.value;
    return <Movie>{
      id: this.movieId,
      title: form.title,
      year: form.year,
      rating: form.rating,
      genre: form.genre,
      actors: this.selectedActors,
      director: form.director,
      synopsis: form.synopsis,
      notes: form.notes,
      imageUrl: form.imageUrl,
      mpaaRating: form.mpaaRating,
      runtimeMinutes: form.runtimeMinutes
    };
  }
}
