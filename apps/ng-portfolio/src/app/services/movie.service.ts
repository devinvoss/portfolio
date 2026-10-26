import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GenreCount, Movie, MovieSearch, MovieSearchCriteria, TmdbMovieDetails, TmdbSearchResult } from '@portfolio/models';
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

  // Maps TMDB's genre names onto this site's genres, renaming the few that differ
  mapTmdbGenres(tmdbGenres: string[]): string[] {
    const renamed: Record<string, string> = {
      'Science Fiction': 'Sci-Fi',
      'History': 'Historical',
      'Music': 'Musical'
    };
    const genres = tmdbGenres.map(genre => renamed[genre] ?? genre);
    if (genres.includes('Romance') && genres.includes('Comedy')) {
      genres.push('Rom-Com');
    }
    return this.getGenres().filter(genre => genres.includes(genre));
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
      'Animation',
      'Biopic',
      'Comedy',
      'Crime',
      'Dark Comedy',
      'Documentary',
      'Drama',
      'Family',
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
      'TV Movie',
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
