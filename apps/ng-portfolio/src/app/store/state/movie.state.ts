import { Injectable } from '@angular/core';
import { MovieService } from '@app/services';
import { StateToken, Action, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import { MovieActions } from '../actions/movie.actions';
import { MovieStateModel } from '../models/movie-state.model';

export const MOVIE_STATE_TOKEN = new StateToken<MovieStateModel>('movieState');
const defaultState = <MovieStateModel>{
  lastSearchCriteria: null,
  searchResults: []
}

@State({
  name: MOVIE_STATE_TOKEN,
  defaults: defaultState
})
@Injectable()
export class MovieState {

  constructor(private movieService: MovieService) {}

  @Action(MovieActions.SearchMovies)
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
          searchResults: result.results
        });
      })
    );
  }

}