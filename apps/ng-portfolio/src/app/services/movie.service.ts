import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GENRES, GenreCount, mapTmdbGenres, Movie, MovieSearch, MovieSearchCriteria, TmdbMovieDetails, TmdbSearchResult } from '@portfolio/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private http = inject(HttpClient);

  getAllMovies(): Observable<Movie[]> {
    return this.http.get<Movie[]>('api/movie');
  }

  searchMovies(criteria: MovieSearchCriteria): Observable<MovieSearch> {
    const movieSearch: MovieSearch = { criteria, results: [] };
    return this.http.post<MovieSearch>('api/movie/search', movieSearch);
  }

  getGenreCounts(): Observable<GenreCount[]> {
    return this.http.get<GenreCount[]>('api/movie/genres');
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

  searchTmdb(query: string): Observable<TmdbSearchResult[]> {
    return this.http.get<TmdbSearchResult[]>('api/tmdb/search', { params: { query } });
  }

  getTmdbMovie(tmdbId: number): Observable<TmdbMovieDetails> {
    return this.http.get<TmdbMovieDetails>(`api/tmdb/movie/${tmdbId}`);
  }

  // Maps TMDB's genre names onto this site's genres; shared with the API, which does the same for recommendations
  mapTmdbGenres(tmdbGenres: string[]): string[] {
    return mapTmdbGenres(tmdbGenres);
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
    return [...GENRES];
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
