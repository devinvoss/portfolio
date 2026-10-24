import { Injectable, inject } from '@angular/core';
import { MovieService } from '@app/services';
import { StateToken, Action, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import * as MovieActions from '../actions/movie.actions';
import { MovieStateModel } from '../models/movie-state.model';

export const MOVIE_STATE_TOKEN = new StateToken<MovieStateModel>('movieState');
const defaultState = <MovieStateModel>{
  lastSearchCriteria: null,
  searchResults: [],
  genreCounts: null
}

@State({
  name: MOVIE_STATE_TOKEN,
  defaults: defaultState
})
@Injectable()
export class MovieState {
  private movieService = inject(MovieService);

  // Searches fire as filters change, so drop any in-flight search when a newer one starts.
  // Page 0 replaces the results; later pages are appended for infinite scroll.
  @Action(MovieActions.SearchMovies, { cancelUncompleted: true })
  searchMovies(ctx: StateContext<MovieStateModel>, action: MovieActions.SearchMovies) {
    const { criteria } = action;

    if (!criteria) {
      return;
    }

    return this.movieService.searchMovies(action.criteria).pipe(
      tap(result => {
        const state = ctx.getState();
        ctx.setState({
          ...state,
          lastSearchCriteria: result.criteria,
          searchResults: criteria.page > 0 ? [...state.searchResults, ...result.results] : result.results,
          genreCounts: result.genreCounts ?? null
        });
      })
    );
  }

}