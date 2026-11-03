import { Component, OnInit, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MovieService, RecommendationService, ToastService } from '@app/services';
import { EditorMode } from '@app/shared/common/enums';
import { MinutesPipe } from '@app/shared/pipes';
import { AlreadyWatchedError, Movie, Recommendation, TmdbMovieDetails, TmdbPoster, TmdbSearchResult } from '@portfolio/models';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, Observable, of, switchMap, tap } from 'rxjs';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption, MatOptionSelectionChange } from '@angular/material/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { getListKind, MovieListKind } from '../movie-list-kind';

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
  imports: [ReactiveFormsModule, RouterLink, CdkTextareaAutosize, MatAutocomplete, MatAutocompleteTrigger, MatOption, MatProgressBar, ButtonComponent, MinutesPipe, NgTemplateOutlet]
})
export class EditorComponent implements OnInit {
  private movieService = inject(MovieService);
  private recommendationService = inject(RecommendationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // On the recommended list's add page, visitors recommend a movie with the same editor, minus the rating
  mode = signal(getListKind(this.route) === MovieListKind.Recommended ? EditorMode.RECOMMEND : EditorMode.ADD);
  isRecommending = computed(() => this.mode() === EditorMode.RECOMMEND);
  movieId = '';

  // Only what I fill in myself; everything else comes from TMDB via movieInfo
  movieForm = this.fb.nonNullable.group({
    title: '',
    rating: 0,
    notes: '',
    imageUrl: ''
  });

  movieInfo = signal<MovieInfo | null>(null);
  tmdbId = signal<number | null>(null);
  // An existing recommendation of the chosen movie. Adding it converts the recommendation;
  // recommending it again adds the note to the recommendation.
  recommendation = signal<Recommendation | null>(null);
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
          this.tmdbId.set(movie.tmdbId ?? null);
          this.populateMovieForm(movie);
          this.loadPosterChoices(movie);
        });
      } else if (!this.isRecommending()) {
        this.mode.set(EditorMode.ADD);
        this.movieForm.controls.title.enable();
      }
    });

    // "Add to watched" on a recommendation opens this page with the recommendation filled in
    const recommendationId = this.route.snapshot.queryParamMap.get('recommendation');
    if (this.mode() === EditorMode.ADD && recommendationId) {
      this.recommendationService.getRecommendation(recommendationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: recommendation => this.populateFromRecommendation(recommendation),
        error: () => this.toastService.error('That recommendation no longer exists.')
      });
    }
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

    if (this.isRecommending()) {
      this.recommend();
      return;
    }

    this.isSaving.set(true);

    if (this.mode() === EditorMode.ADD) {
      const recommendation = this.recommendation();
      const save$: Observable<Movie> = recommendation
        ? this.recommendationService.convertToMovie(recommendation.id, this.getMovieFromForm())
        : this.movieService.addMovie(this.getMovieFromForm());
      save$.pipe(takeUntilDestroyed(this.destroyRef))
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

  private recommend() {
    const tmdbId = this.tmdbId();
    if (!tmdbId) {
      this.toastService.error('Pick a movie from the search results first.');
      return;
    }

    this.isSaving.set(true);
    const { notes, imageUrl } = this.movieForm.getRawValue();
    this.recommendationService.recommend({ tmdbId, imageUrl, note: notes.trim() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ recommendation, alreadyRecommended }) => {
          this.isSaving.set(false);
          this.toastService.success(alreadyRecommended
            ? `${recommendation.title} was already recommended, so ${notes.trim() ? 'your note was added to it' : "you're in good company"}.`
            : `Thanks for recommending ${recommendation.title}!`);
          this.router.navigate(['/recommendations', recommendation.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving.set(false);
          const watched = err.status === 409 ? err.error as AlreadyWatchedError : null;
          if (watched?.movieId) {
            this.toastService.info(`Devin has already watched ${this.movieForm.controls.title.value}. Leave your thoughts there instead.`);
            this.router.navigate(['/movie/detail', watched.movieId]);
          } else if (err.status === 429) {
            this.toastService.error('You are recommending too quickly. Please wait a minute and try again.');
          } else {
            this.toastService.error('Your recommendation could not be saved.');
          }
        }
      });
  }

  private searchTmdbAsTitleIsTyped() {
    this.movieForm.controls.title.valueChanges.pipe(
      tap(title => {
        // Typing another title means the picked movie no longer applies. Locking the
        // field also emits a change, so only an editable title counts.
        if (this.movieForm.controls.title.enabled && title.trim() !== this.filledTitle && this.tmdbId()) {
          this.tmdbId.set(null);
          this.recommendation.set(null);
        }
      }),
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
    this.tmdbId.set(details.tmdbId);
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
    this.checkForRecommendation(details.tmdbId);
  }

  // Whether someone already recommended the chosen movie, so the page can say what saving will do
  private checkForRecommendation(tmdbId: number) {
    this.recommendation.set(null);
    this.recommendationService.findByTmdbId(tmdbId).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(recommendation => {
      // Ignore a late answer for a movie that's no longer selected
      if (this.tmdbId() === tmdbId) {
        this.recommendation.set(recommendation);
      }
    });
  }

  private populateFromRecommendation(recommendation: Recommendation) {
    this.recommendation.set(recommendation);
    this.tmdbId.set(recommendation.tmdbId);
    this.filledTitle = recommendation.title;
    this.movieForm.controls.title.disable();
    this.movieInfo.set({
      year: recommendation.year,
      genre: recommendation.genre,
      actors: recommendation.actors,
      director: recommendation.director,
      synopsis: recommendation.synopsis,
      mpaaRating: recommendation.mpaaRating,
      runtimeMinutes: recommendation.runtimeMinutes
    });
    this.movieForm.patchValue({
      title: recommendation.title,
      imageUrl: recommendation.imageUrl
    });

    // The recommender's poster first, then the rest of TMDB's
    const chosen = recommendation.imageUrl;
    this.posters.set(chosen ? [{ thumbnailUrl: chosen.replace('/t/p/original/', '/t/p/w342/'), fullUrl: chosen }] : []);
    this.movieService.getTmdbMovie(recommendation.tmdbId).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(details => {
      if (details) {
        this.posters.update(current => [...current, ...details.posters.filter(poster => poster.fullUrl !== chosen)]);
      }
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

  // Saved movies don't always have their TMDB id, so find it again by title (and year when it matches).
  // The current poster goes first so it can be picked again after trying another.
  private loadPosterChoices(movie: Movie) {
    const currentPoster: TmdbPoster[] = movie.imageUrl
      // Saved posters are on ImageKit, which can serve a thumbnail-sized copy
      ? [{ thumbnailUrl: `${movie.imageUrl}?tr=w-160`, fullUrl: movie.imageUrl }]
      : [];
    this.posters.set(currentPoster);

    const tmdbId$ = movie.tmdbId
      ? of(movie.tmdbId)
      : this.movieService.searchTmdb(movie.title).pipe(
        map(results => (results.find(result => result.year === movie.year) ?? results[0])?.tmdbId)
      );
    tmdbId$.pipe(
      switchMap(tmdbId => tmdbId ? this.movieService.getTmdbMovie(tmdbId) : of(null)),
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(details => {
      if (details) {
        this.posters.set([...currentPoster, ...details.posters]);
      }
    });
  }

  private getMovieFromForm(): Movie {
    const tmdbId = this.tmdbId();
    return <Movie>{
      ...this.movieInfo(),
      ...this.movieForm.getRawValue(),
      ...(tmdbId ? { tmdbId } : {}),
      id: this.movieId
    };
  }
}
