import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Movie } from '@portfolio/models';
import { ImagekitioAngularModule } from 'imagekitio-angular';

/** A watched movie, which shows its rating, or a recommendation, which shows how many comments it has. */
export type ListedMovie = Pick<Movie, 'id' | 'title' | 'imageUrl'> & { rating?: number; commentCount?: number };

// Recommendations keep TMDB's full-size poster; a smaller size is plenty for the list
const TMDB_FULL_SIZE = 'https://image.tmdb.org/t/p/original/';
const TMDB_LIST_SIZE = 'https://image.tmdb.org/t/p/w780/';

@Component({
  selector: 'dvoss-movie-list-item',
  imports: [ImagekitioAngularModule],
  templateUrl: './movie-list-item.component.html',
  styleUrls: ['./movie-list-item.component.scss']
})
export class MovieListItemComponent {
  @Input() movie!: ListedMovie;
  @Output() movieSelected: EventEmitter<ListedMovie> = new EventEmitter<ListedMovie>();

  transformations = [
    { width: '700' }
  ]

  get tmdbPosterUrl(): string | null {
    return this.movie.imageUrl?.startsWith(TMDB_FULL_SIZE) ? this.movie.imageUrl.replace(TMDB_FULL_SIZE, TMDB_LIST_SIZE) : null;
  }

  get rating(): number | undefined {
    return this.movie.rating;
  }

  get commentCount(): number | undefined {
    return this.movie.commentCount;
  }
}
