import { GenreCount, Movie, MovieSearchCriteria } from '@portfolio/models';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isAbortError } from '../api/client';
import { movieApi, recommendationApi } from '../api/endpoints';
import { persistStorage } from './storage';

/** Which list a movie page shows: the movies Devin has watched, or ones visitors recommended. */
export type MovieListKind = 'watched' | 'recommended';

/** A watched movie, which shows its rating, or a recommendation, which shows how many comments it has. */
export type ListedMovie = Pick<Movie, 'id' | 'title' | 'imageUrl'> & { rating?: number; commentCount?: number };

export interface ListState {
  lastSearchCriteria: MovieSearchCriteria | null;
  searchResults: ListedMovie[];
  genreCounts: GenreCount[] | null;
}

const emptyList: ListState = { lastSearchCriteria: null, searchResults: [], genreCounts: null };

interface MovieListsState {
  watched: ListState;
  recommended: ListState;
}

/**
 * ng-portfolio's MovieState and RecommendationState. Both are kept on the device (the website keeps them in
 * localStorage) so the list and its filters are still there when you come back.
 */
export const useMovieLists = create<MovieListsState>()(
  persist(
    () => ({ watched: emptyList, recommended: emptyList }),
    { name: 'dvoss-movie-lists', storage: persistStorage }
  )
);

// Searches fire as filters change, so a newer search cancels the one in flight
const inFlight: Partial<Record<MovieListKind, AbortController>> = {};

/**
 * Runs a search for a list. Page 0 replaces the results; later pages are appended for infinite scroll.
 * Resolves false when a newer search replaced it.
 */
export async function searchMovieList(kind: MovieListKind, criteria: MovieSearchCriteria): Promise<boolean> {
  inFlight[kind]?.abort();
  const controller = new AbortController();
  inFlight[kind] = controller;

  try {
    const result = kind === 'recommended'
      ? await recommendationApi.search(criteria, controller.signal)
      : await movieApi.search(criteria, controller.signal);
    if (controller.signal.aborted) {
      return false;
    }

    useMovieLists.setState(state => ({
      [kind]: {
        lastSearchCriteria: result.criteria,
        searchResults: criteria.page > 0 ? [...state[kind].searchResults, ...result.results] : result.results,
        genreCounts: result.genreCounts ?? null
      }
    }));
    return true;
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      return false;
    }
    throw error;
  } finally {
    if (inFlight[kind] === controller) {
      delete inFlight[kind];
    }
  }
}
