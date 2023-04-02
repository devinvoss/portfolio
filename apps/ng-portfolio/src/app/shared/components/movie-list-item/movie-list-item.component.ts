import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie } from '@portfolio/models';
import { ImagekitioAngularModule } from 'imagekitio-angular';

@Component({
  selector: 'dvoss-movie-list-item',
  standalone: true,
  imports: [CommonModule, ImagekitioAngularModule],
  templateUrl: './movie-list-item.component.html',
  styleUrls: ['./movie-list-item.component.scss']
})
export class MovieListItemComponent {
  @Input() movie!: Movie;
  @Output() movieSelected: EventEmitter<Movie> = new EventEmitter<Movie>();

  transformations = [
    { width: '700' }
  ]
}
