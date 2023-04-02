import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Movie, MovieSearch, MovieSearchCriteria } from '@portfolio/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MovieService {

  constructor(private http: HttpClient) { }

  getAllMovies(): Observable<Movie[]> {
    return this.http.get<Movie[]>('api/movie');
  }

  searchMovies(criteria: MovieSearchCriteria): Observable<MovieSearch> {
    const movieSearch: MovieSearch = { criteria, results: [] };
    return this.http.post<MovieSearch>('api/movie/search', movieSearch);
  }

  addMovie(movie: Movie): Observable<Movie> {
    return this.http.post<Movie>('api/movie', movie);
  }

  getMovie(id: string): Observable<Movie> {
    return this.http.get<Movie>(`api/movie/${id}`);
  }

  updateMovie(movie: Movie): Observable<Movie> {
    return this.http.put<Movie>('api/movie', movie);
  }

  getCurrentMovieYears(): number[] {
    let year = new Date().getFullYear();
    const range: number[] = [];
    while(year >= 1920) {
      range.push(year);
      year--;
    }
    return range;
  }

  getGenres(): string[] {
    return [
      'Action',
      'Adventure',
      'Biopic',
      'Comedy',
      'Dark Comedy',
      'Documentary',
      'Drama',
      'Fantasy',
      'Horror',
      'Historical',
      'Indie',
      'Musical',
      'Mystery',
      'Period',
      'Romance',
      'Rom-Com',
      'Sci-Fi',
      'Thriller',
      'War',
      'Western'
    ]
  }

  getRatingOptions(): number[] {
    return [
      5,
      4,
      3,
      2,
      1
    ]
  }

  getMPAARatings(): string[] {
    return [
      'G',
      'PG',
      'PG-13',
      'R',
      'NC-17',
      'NR'
    ]
  }
}
