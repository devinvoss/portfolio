import { Injectable, inject } from '@angular/core';
import { RecommendationService } from '@app/services';
import { StateToken, Action, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import * as RecommendationActions from '../actions/recommendation.actions';
import { RecommendationStateModel } from '../models/recommendation-state.model';

export const RECOMMENDATION_STATE_TOKEN = new StateToken<RecommendationStateModel>('recommendationState');
const defaultState = <RecommendationStateModel>{
  lastSearchCriteria: null,
  searchResults: [],
  genreCounts: null
}

// Works like MovieState: newer searches cancel older ones, and later pages are appended.
@State({
  name: RECOMMENDATION_STATE_TOKEN,
  defaults: defaultState
})
@Injectable()
export class RecommendationState {
  private recommendationService = inject(RecommendationService);

  @Action(RecommendationActions.SearchRecommendations, { cancelUncompleted: true })
  searchRecommendations(ctx: StateContext<RecommendationStateModel>, action: RecommendationActions.SearchRecommendations) {
    const { criteria } = action;

    if (!criteria) {
      return;
    }

    return this.recommendationService.searchRecommendations(criteria).pipe(
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
