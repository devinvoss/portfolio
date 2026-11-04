import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GenreCount, Movie, MovieSearchCriteria, NewRecommendation, Recommendation, RecommendationSearch, RecommendResult } from '@portfolio/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private http = inject(HttpClient);

  searchRecommendations(criteria: MovieSearchCriteria): Observable<RecommendationSearch> {
    const search: RecommendationSearch = { criteria, results: [] };
    return this.http.post<RecommendationSearch>('api/recommendation/search', search);
  }

  getGenreCounts(): Observable<GenreCount[]> {
    return this.http.get<GenreCount[]>('api/recommendation/genres');
  }

  getRecommendation(id: string): Observable<Recommendation> {
    return this.http.get<Recommendation>(`api/recommendation/${id}`);
  }

  /** Null when nobody has recommended that movie. */
  findByTmdbId(tmdbId: number): Observable<Recommendation | null> {
    return this.http.get<Recommendation | null>(`api/recommendation/tmdb/${tmdbId}`);
  }

  /** Fails with a 409 carrying an AlreadyWatchedError when the movie was already watched. */
  recommend(recommendation: NewRecommendation): Observable<RecommendResult> {
    return this.http.post<RecommendResult>('api/recommendation', recommendation);
  }

  removeRecommendation(id: string): Observable<void> {
    return this.http.delete<void>(`api/recommendation/${id}`);
  }

  /** Adds the recommendation to the watched movies; its comments move to the new movie. */
  convertToMovie(id: string, movie: Movie): Observable<Movie> {
    return this.http.post<Movie>(`api/recommendation/${id}/convert`, movie);
  }
}
