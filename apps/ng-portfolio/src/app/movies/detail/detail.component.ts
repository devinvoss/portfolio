import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService, ToastService, UserService } from '@app/services';
import { Movie } from '@portfolio/models';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip } from '@angular/material/chips';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { AsyncPipe } from '@angular/common';
import { MinutesPipe } from '../../shared/pipes/minutes.pipe';

@Component({
  selector: 'portfolio-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  imports: [ButtonComponent, MatIcon, MatChipSet, MatChip, SkeletonLoaderComponent, AsyncPipe, MinutesPipe]
})
export class DetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private movieService = inject(MovieService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  movie = signal<Movie | undefined>(undefined);
  user$ = this.userService.user$;

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.movieService.getMovie(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (movie) => this.movie.set(movie),
          error: () => {
            this.toastService.error('Movie not found.');
            this.router.navigate(['/movie']);
          }
        });
      } else {
        this.toastService.error('Movie not found.');
        this.router.navigate(['/movie']);
      }
    });
  }

  editMovie() {
    this.router.navigate([`/movie/edit/${this.movie()?.id}`]);
  }
}
