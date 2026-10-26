import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, ToastService } from '@app/services';
import { EditorMode } from '@app/shared/common/enums';
import { MinutesPipe } from '@app/shared/pipes';
import { Movie, TmdbMovieDetails, TmdbPoster, TmdbSearchResult } from '@portfolio/models';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption, MatOptionSelectionChange } from '@angular/material/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';

const MIN_TMDB_QUERY_LENGTH = 2;

// The parts of a movie that come from TMDB and are shown read-only
// (TMDB doesn't always know the year or runtime)
type MovieInfo = Pick<Movie, 'genre' | 'actors' | 'director' | 'synopsis' | 'mpaaRating'> & {
  year: number | null;
  runtimeMinutes: number | null;
};

@Component({
  selector: 'portfolio-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  imports: [ReactiveFormsModule, CdkTextareaAutosize, MatAutocomplete, MatAutocompleteTrigger, MatOption, MatProgressBar, ButtonComponent, MinutesPipe, NgTemplateOutlet]
})
export class EditorComponent implements OnInit {
  private movieService = inject(MovieService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  mode = signal(EditorMode.ADD);
  movieId = '';

  // Only what I fill in myself; everything else comes from TMDB via movieInfo
  movieForm = this.fb.nonNullable.group({
    title: '',
    rating: 0,
    notes: '',
    imageUrl: ''
  });

  movieInfo = signal<MovieInfo | null>(null);
  stars = [1, 2, 3, 4, 5];
  hoveredRating = signal(0);
  isSaving = signal(false);

  imageUrl = toSignal(this.movieForm.controls.imageUrl.valueChanges, { initialValue: '' });
  rating = toSignal(this.movieForm.controls.rating.valueChanges, { initialValue: 0 });

  tmdbResults = signal<TmdbSearchResult[]>([]);
  posters = signal<TmdbPoster[]>([]);
  isLoadingTmdbMovie = signal(false);
  // Title that was just filled in, so filling it in doesn't kick off another search
  private filledTitle = '';

  ngOnInit(): void {
    this.searchTmdbAsTitleIsTyped();

    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.mode.set(EditorMode.EDIT);
        // The movie's details are locked once added; only my own fields and the poster change
        this.movieForm.controls.title.disable();
        this.movieService.getMovie(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(movie => {
          this.movieId = movie.id;
          this.populateMovieForm(movie);
          this.loadPosterChoices(movie);
        });
      } else {
        this.mode.set(EditorMode.ADD);
        this.movieForm.controls.title.enable();
      }
    })
  }

  // Clicking the current rating again clears it
  setRating(rating: number) {
    const control = this.movieForm.controls.rating;
    control.setValue(control.value === rating ? 0 : rating);
  }

  save() {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    if (this.mode() === EditorMode.ADD) {
      this.movieService.addMovie(this.getMovieFromForm())
        .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.toastService.success(`${res.title} successfully added.`);
          this.router.navigateByUrl(`movie/detail/${res.id}`);
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Add Movie Failed');
        }
      })
    }

    if (this.mode() === EditorMode.EDIT) {
      this.movieService.updateMovie(this.getMovieFromForm())
        .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.toastService.success(`${res.title} successfully updated.`);
          this.router.navigateByUrl(`movie/detail/${res.id}`);
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Update Movie Failed');
        }
      })
    }
  }

  selectTmdbMovie(event: MatOptionSelectionChange, result: TmdbSearchResult) {
    // Also fires for the previously selected option being deselected
    if (!event.isUserInput || !event.source.selected) {
      return;
    }

    this.filledTitle = result.title;
    this.isLoadingTmdbMovie.set(true);
    this.movieService.getTmdbMovie(result.tmdbId)
      .pipe(
        finalize(() => this.isLoadingTmdbMovie.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: details => this.populateFromTmdb(details),
        error: () => this.toastService.error('Could not load the movie from TMDB')
      });
  }

  selectPoster(poster: TmdbPoster) {
    this.movieForm.controls.imageUrl.setValue(poster.fullUrl);
  }

  private searchTmdbAsTitleIsTyped() {
    this.movieForm.controls.title.valueChanges.pipe(
      debounceTime(300),
      map(title => title.trim()),
      distinctUntilChanged(),
      switchMap(title => {
        if (title.length < MIN_TMDB_QUERY_LENGTH || title === this.filledTitle) {
          return of([]);
        }
        return this.movieService.searchTmdb(title).pipe(catchError(() => of([])));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.tmdbResults.set(results));
  }

  // Fills in everything TMDB knows; notes and rating are left alone since they're mine
  private populateFromTmdb(details: TmdbMovieDetails) {
    this.filledTitle = details.title;
    this.posters.set(details.posters);
    this.movieInfo.set({
      year: details.year,
      genre: this.movieService.mapTmdbGenres(details.genres),
      actors: details.actors,
      director: details.director,
      synopsis: details.synopsis,
      mpaaRating: details.mpaaRating,
      runtimeMinutes: details.runtimeMinutes
    });
    this.movieForm.patchValue({
      title: details.title,
      imageUrl: details.posters[0]?.fullUrl ?? ''
    });
  }

  private populateMovieForm(movie: Movie) {
    this.filledTitle = movie.title;
    this.movieInfo.set({
      year: movie.year,
      genre: movie.genre,
      actors: movie.actors,
      director: movie.director,
      synopsis: movie.synopsis,
      mpaaRating: movie.mpaaRating,
      runtimeMinutes: movie.runtimeMinutes
    });
    this.movieForm.patchValue({
      title: movie.title,
      rating: movie.rating,
      notes: movie.notes,
      imageUrl: movie.imageUrl
    })
  }

  // Saved movies don't keep their TMDB id, so find it again by title (and year when it matches).
  // The current poster goes first so it can be picked again after trying another.
  private loadPosterChoices(movie: Movie) {
    const currentPoster: TmdbPoster[] = movie.imageUrl
      // Saved posters are on ImageKit, which can serve a thumbnail-sized copy
      ? [{ thumbnailUrl: `${movie.imageUrl}?tr=w-160`, fullUrl: movie.imageUrl }]
      : [];
    this.posters.set(currentPoster);

    this.movieService.searchTmdb(movie.title).pipe(
      map(results => results.find(result => result.year === movie.year) ?? results[0]),
      switchMap(result => result ? this.movieService.getTmdbMovie(result.tmdbId) : of(null)),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(details => {
      if (details) {
        this.posters.set([...currentPoster, ...details.posters]);
      }
    });
  }

  private getMovieFromForm(): Movie {
    return <Movie>{
      ...this.movieInfo(),
      ...this.movieForm.getRawValue(),
      id: this.movieId
    };
  }
}
