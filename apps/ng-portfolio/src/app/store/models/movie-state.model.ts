import { GenreCount, Movie, MovieSearchCriteria } from "@portfolio/models";

export interface MovieStateModel {
  lastSearchCriteria: MovieSearchCriteria | null,
  searchResults: Movie[],
  genreCounts: GenreCount[] | null
}
