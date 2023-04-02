import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Movie } from '@portfolio/models';

@Component({
  selector: 'dvoss-movie-card',
  standalone: true,
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.scss'],
  imports: [CommonModule]
})
export class MovieCardComponent {

  @Input() movie!: Movie;
  @Output() movieSelected: EventEmitter<Movie> = new EventEmitter<Movie>();

  constructor() { }

}