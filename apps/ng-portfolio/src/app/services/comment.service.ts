import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CommentPage, LikeResult, MovieComment, ReplyPage } from '@portfolio/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);

  getComments(movieId: string, before?: string): Observable<CommentPage> {
    return this.http.get<CommentPage>(`api/movie/${movieId}/comments`, { params: before ? { before } : {} });
  }

  getReplies(commentId: string, after?: string): Observable<ReplyPage> {
    return this.http.get<ReplyPage>(`api/comments/${commentId}/replies`, { params: after ? { after } : {} });
  }

  /** The top-level comment and replies of the thread a comment belongs to. */
  getThread(commentId: string): Observable<MovieComment> {
    return this.http.get<MovieComment>(`api/comments/${commentId}/thread`);
  }

  addComment(movieId: string, body: string, replyToCommentId?: string): Observable<MovieComment> {
    return this.http.post<MovieComment>(`api/movie/${movieId}/comments`, { body, replyToCommentId });
  }

  editComment(commentId: string, body: string): Observable<MovieComment> {
    return this.http.patch<MovieComment>(`api/comments/${commentId}`, { body });
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`api/comments/${commentId}`);
  }

  setLiked(commentId: string, liked: boolean): Observable<LikeResult> {
    const url = `api/comments/${commentId}/like`;
    return liked ? this.http.put<LikeResult>(url, {}) : this.http.delete<LikeResult>(url);
  }

  banAuthor(commentId: string): Observable<{ removedComments: number }> {
    return this.http.post<{ removedComments: number }>(`api/comments/${commentId}/ban-author`, {});
  }
}
