import { Movie, MovieSearchCriteria } from "@portfolio/models";

export interface MovieStateModel {
  lastSearchCriteria: MovieSearchCriteria | null,
  searchResults: Movie[]
}