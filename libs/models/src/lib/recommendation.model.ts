import { CommentAuthor } from './comment.model';
import { GenreCount, MovieSearchCriteria } from './movie.model';

/** A movie someone thinks Devin should watch. It has no rating until it's converted into a watched movie. */
export interface Recommendation {
  id: string;
  tmdbId: number;
  title: string;
  year: number | null;
  genre: string[];
  synopsis: string;
  /** A TMDB poster; it's only copied to ImageKit when the recommendation is converted. */
  imageUrl: string;
  actors: string[];
  director: string;
  runtimeMinutes: number | null;
  mpaaRating: string;
  /** Who recommended it first; null when their account was deleted. */
  recommendedBy: CommentAuthor | null;
  /** Visible comments and replies. */
  commentCount: number;
  createdDate: string;
  /** Whether the viewer can delete it: the admin, or the recommender while nobody else has commented. */
  canRemove?: boolean;
}

export interface NewRecommendation {
  tmdbId: number;
  /** One of the movie's TMDB posters; the main poster is used otherwise. */
  imageUrl?: string;
  /** Posted as the recommender's comment. */
  note?: string;
}

export interface RecommendResult {
  recommendation: Recommendation;
  /** Someone had already recommended it, so the note was added to theirs. */
  alreadyRecommended: boolean;
}

export interface RecommendationSearch {
  criteria: MovieSearchCriteria;
  results: Recommendation[];
  genreCounts?: GenreCount[];
}

/** The body of a 409 when the movie was already watched. */
export interface AlreadyWatchedError {
  message: string;
  movieId: string;
}
