import { Component, OnInit, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, RecommendationService, ToastService, UserService } from '@app/services';
import { Movie, Recommendation } from '@portfolio/models';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip } from '@angular/material/chips';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MinutesPipe } from '../../shared/pipes/minutes.pipe';
import { map, Observable } from 'rxjs';
import { CommentsComponent } from './comments/comments.component';
import { Dialog } from '@angular/cdk/dialog';
import { PosterViewerComponent, PosterViewerData } from './poster-viewer/poster-viewer.component';
import { getListKind, MovieListKind } from '../movie-list-kind';

export const COMMENT_FRAGMENT_PREFIX = 'comment-';

@Component({
  selector: 'portfolio-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  imports: [ButtonComponent, MatIcon, MatChipSet, MatChip, SkeletonLoaderComponent, AsyncPipe, DatePipe, MinutesPipe, CommentsComponent]
})
export class DetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private movieService = inject(MovieService);
  private recommendationService = inject(RecommendationService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(Dialog);

  // The same page shows a watched movie or a recommendation
  readonly isRecommended = getListKind(this.route) === MovieListKind.Recommended;
  private listUrl = this.isRecommended ? '/recommendations' : '/movie';

  movie = signal<Movie | Recommendation | undefined>(undefined);
  watched = computed(() => this.isRecommended ? null : this.movie() as Movie | undefined);
  recommendation = computed(() => this.isRecommended ? this.movie() as Recommendation | undefined : null);
  confirmingRemove = signal(false);
  removing = signal(false);

  isAdmin$ = this.userService.isAdmin$;
  // Notification links point at a comment with a #comment-<id> fragment.
  focusCommentId = toSignal(this.route.fragment.pipe(
    map(fragment => fragment?.startsWith(COMMENT_FRAGMENT_PREFIX) ? fragment.slice(COMMENT_FRAGMENT_PREFIX.length) : null)
  ), { initialValue: null });

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['id'];
      if (id) {
        const movie$: Observable<Movie | Recommendation> = this.isRecommended
          ? this.recommendationService.getRecommendation(id)
          : this.movieService.getMovie(id);
        movie$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (movie) => this.movie.set(movie),
          error: () => this.notFound()
        });
      } else {
        this.notFound();
      }
    });
  }

  openPoster(movie: Movie | Recommendation) {
    this.dialog.open<void, PosterViewerData>(PosterViewerComponent, {
      data: { imageUrl: movie.imageUrl, title: movie.title },
      ariaLabel: `${movie.title} poster`,
      // The viewer covers the page itself, so no backdrop
      hasBackdrop: false,
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
    });
  }

  editMovie() {
    this.router.navigate([`/movie/edit/${this.movie()?.id}`]);
  }

  // Opens the add page filled in from the recommendation, ready for a rating and notes
  addToWatched() {
    this.router.navigate(['/movie/add'], { queryParams: { recommendation: this.movie()?.id } });
  }

  // The admin dismisses a recommendation; the recommender withdraws it. Either way it takes a second click.
  removeRecommendation() {
    const recommendation = this.recommendation();
    if (!recommendation || this.removing()) {
      return;
    }
    if (!this.confirmingRemove()) {
      this.confirmingRemove.set(true);
      return;
    }

    this.removing.set(true);
    this.recommendationService.removeRecommendation(recommendation.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(`${recommendation.title} was removed from the recommendations.`);
        this.router.navigate(['/recommendations']);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.removing.set(false);
        this.confirmingRemove.set(false);
        this.toastService.error(err?.status === 403 && err.error?.message ? err.error.message : 'The recommendation could not be removed.');
      }
    });
  }

  private notFound() {
    this.toastService.error(this.isRecommended ? 'Recommendation not found.' : 'Movie not found.');
    this.router.navigate([this.listUrl]);
  }
}
