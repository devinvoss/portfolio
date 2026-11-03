import { ActivatedRoute } from '@angular/router';

/** Which list a movie page shows: the movies I've watched, or ones visitors recommended. Set in the route data. */
export enum MovieListKind {
  Watched = 'watched',
  Recommended = 'recommended'
}

export function getListKind(route: ActivatedRoute): MovieListKind {
  return route.snapshot.data['kind'] ?? MovieListKind.Watched;
}
