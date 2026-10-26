// Shapes the API returns after trimming TMDB responses down to what the movie editor uses

export interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year: number | null;
  director: string;
  posterThumbnailUrl: string | null;
}

export interface TmdbMovieDetails {
  tmdbId: number;
  title: string;
  year: number | null;
  // TMDB's genre names; the editor maps these onto its own genre list
  genres: string[];
  synopsis: string;
  director: string;
  actors: string[];
  runtimeMinutes: number | null;
  mpaaRating: string;
  posters: TmdbPoster[];
}

export interface TmdbPoster {
  thumbnailUrl: string;
  fullUrl: string;
}
