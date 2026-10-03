import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { Movie } from '@portfolio/models';
import { ImagekitioAngularModule } from 'imagekitio-angular';

@Component({
  selector: 'dvoss-movie-list-item',
  imports: [ImagekitioAngularModule],
  templateUrl: './movie-list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./movie-list-item.component.scss']
})
export class MovieListItemComponent {
  @Input() movie!: Movie;
  @Output() movieSelected: EventEmitter<Movie> = new EventEmitter<Movie>();

  transformations = [
    { width: '700' }
  ]
}
