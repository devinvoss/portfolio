import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DestroyableComponent } from '@app/core/components';
import { MovieService, ToastService, UserService } from '@app/services';
import { fadeInAnimation } from '@app/shared/animations';
import { Movie } from '@portfolio/models';

@Component({
  selector: 'portfolio-detail',
  animations: [
    fadeInAnimation()
  ],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent extends DestroyableComponent implements OnInit {

  movie!: Movie;
  user$ = this.userService.user$;

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService,
    private router: Router,
    private toastService: ToastService,
    private userService: UserService
  ) {
    super();
  }

  ngOnInit(): void {
    this.route.params.pipe(this.takeUntilDestroyed).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.movieService.getMovie(id).subscribe({
          next: (movie) => this.movie = movie,
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
    this.router.navigate([`/movie/edit/${this.movie.id}`]);
  }
}
