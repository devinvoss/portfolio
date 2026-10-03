import { MovieSearchCriteria } from "@portfolio/models";

export class SearchMovies {
  static readonly type = '[Movie Search] Search';
  constructor(public criteria: MovieSearchCriteria) {}
}
