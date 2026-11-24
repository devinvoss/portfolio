import {
  AppTokenResponse,
  CommentPage,
  CommentSubjectType,
  GenreCount,
  LikeResult,
  Movie,
  MovieComment,
  MovieSearch,
  MovieSearchCriteria,
  NewRecommendation,
  Recommendation,
  RecommendationSearch,
  RecommendResult,
  ReplyNotification,
  ReplyPage,
  SessionResponse,
  SessionUser,
  SsoProvider,
  TmdbMovieDetails,
  TmdbSearchResult
} from '@portfolio/models';
import { api } from './client';

// The same calls as ng-portfolio's services, grouped the same way.

export const authApi = {
  me: () => api<SessionResponse>('auth/me'),
  providers: () => api<{ providers: SsoProvider[] }>('auth/providers').then(res => res.providers),
  exchangeCode: (code: string, codeVerifier: string) => api<AppTokenResponse>('auth/app/token', { method: 'POST', body: { code, codeVerifier } }),
  logout: () => api<void>('auth/logout', { method: 'POST', body: {} })
};

export const accountApi = {
  updateDisplayName: (displayName: string) => api<SessionUser>('account/me', { method: 'PATCH', body: { displayName } }),
  deleteAccount: () => api<void>('account/me', { method: 'DELETE' })
};

export const movieApi = {
  search: (criteria: MovieSearchCriteria, signal?: AbortSignal) =>
    api<MovieSearch>('movie/search', { method: 'POST', body: { criteria, results: [] }, signal }),
  genreCounts: () => api<GenreCount[]>('movie/genres'),
  get: (id: string) => api<Movie>(`movie/${id}`)
};

export const recommendationApi = {
  search: (criteria: MovieSearchCriteria, signal?: AbortSignal) =>
    api<RecommendationSearch>('recommendation/search', { method: 'POST', body: { criteria, results: [] }, signal }),
  genreCounts: () => api<GenreCount[]>('recommendation/genres'),
  get: (id: string) => api<Recommendation>(`recommendation/${id}`),
  /** Null when nobody has recommended that movie. */
  findByTmdbId: (tmdbId: number) => api<Recommendation | null>(`recommendation/tmdb/${tmdbId}`),
  /** Fails with a 409 carrying an AlreadyWatchedError when the movie was already watched. */
  recommend: (recommendation: NewRecommendation) => api<RecommendResult>('recommendation', { method: 'POST', body: recommendation }),
  remove: (id: string) => api<void>(`recommendation/${id}`, { method: 'DELETE' })
};

export const tmdbApi = {
  search: (query: string) => api<TmdbSearchResult[]>('tmdb/search', { query: { query } }),
  movie: (tmdbId: number) => api<TmdbMovieDetails>(`tmdb/movie/${tmdbId}`)
};

const subjectPath = (type: CommentSubjectType, id: string) => type === 'recommendation' ? `recommendation/${id}` : `movie/${id}`;

export const commentApi = {
  list: (movieId: string, before?: string, subjectType: CommentSubjectType = 'movie') =>
    api<CommentPage>(`${subjectPath(subjectType, movieId)}/comments`, { query: { before } }),
  replies: (commentId: string, after?: string) => api<ReplyPage>(`comments/${commentId}/replies`, { query: { after } }),
  /** The top-level comment and replies of the thread a comment belongs to. */
  thread: (commentId: string) => api<MovieComment>(`comments/${commentId}/thread`),
  add: (movieId: string, body: string, replyToCommentId?: string, subjectType: CommentSubjectType = 'movie') =>
    api<MovieComment>(`${subjectPath(subjectType, movieId)}/comments`, { method: 'POST', body: { body, replyToCommentId } }),
  edit: (commentId: string, body: string) => api<MovieComment>(`comments/${commentId}`, { method: 'PATCH', body: { body } }),
  remove: (commentId: string) => api<void>(`comments/${commentId}`, { method: 'DELETE' }),
  setLiked: (commentId: string, liked: boolean) =>
    api<LikeResult>(`comments/${commentId}/like`, { method: liked ? 'PUT' : 'DELETE', body: liked ? {} : undefined }),
  banAuthor: (commentId: string) => api<{ removedComments: number }>(`comments/${commentId}/ban-author`, { method: 'POST', body: {} })
};

export const notificationApi = {
  list: () => api<ReplyNotification[]>('notifications'),
  unreadCount: () => api<{ count: number }>('notifications/unread-count').then(res => res.count),
  markAllRead: () => api<void>('notifications/read', { method: 'POST', body: {} })
};
