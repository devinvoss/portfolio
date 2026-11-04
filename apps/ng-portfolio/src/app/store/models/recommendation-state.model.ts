import { GenreCount, MovieSearchCriteria, Recommendation } from "@portfolio/models";

export interface RecommendationStateModel {
  lastSearchCriteria: MovieSearchCriteria | null,
  searchResults: Recommendation[],
  genreCounts: GenreCount[] | null
}
