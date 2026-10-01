import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Movie } from '@portfolio/models';

@Component({
  selector: 'dvoss-movie-card',
  standalone: true,
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.scss']
})
export class MovieCardComponent {

  @Input() movie!: Movie;
  @Output() movieSelected: EventEmitter<Movie> = new EventEmitter<Movie>();

  constructor() { }

}