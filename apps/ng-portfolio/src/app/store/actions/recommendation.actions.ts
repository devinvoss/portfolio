import { MovieSearchCriteria } from "@portfolio/models";

export class SearchRecommendations {
  static readonly type = '[Recommendation Search] Search';
  constructor(public criteria: MovieSearchCriteria) {}
}
