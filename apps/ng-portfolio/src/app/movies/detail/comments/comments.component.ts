import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, Injector, input, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CommentService, ToastService, UserService } from '@app/services';
import { MovieComment } from '@portfolio/models';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CommentComposerComponent } from './comment-composer.component';
import { CommentComponent } from './comment.component';

export interface ThreadView {
  comment: MovieComment;
  replies: MovieComment[];
  /** Replies on the server that haven't been loaded yet. */
  hiddenReplies: number;
  /** The last reply loaded from the server, where "show more" continues from. */
  cursor?: string;
  loadingReplies: boolean;
}

export function toThreadView({ replies = [], replyCount = 0, ...comment }: MovieComment): ThreadView {
  return {
    comment,
    replies,
    hiddenReplies: Math.max(replyCount - replies.length, 0),
    cursor: replies.at(-1)?.id,
    loadingReplies: false
  };
}

// Object ids start with a timestamp, so sorting them puts replies in the order they were posted.
const byId = (a: MovieComment, b: MovieComment) => a.id.localeCompare(b.id);

@Component({
  selector: 'portfolio-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  imports: [ButtonComponent, CommentComponent, CommentComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsComponent {
  private commentService = inject(CommentService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private router = inject(Router);
  private location = inject(Location);
  private injector = inject(Injector);

  movieId = input.required<string>();
  /** A comment to show first and highlight, from a notification link. */
  focusCommentId = input<string | null>(null);

  user = toSignal(this.userService.user$, { initialValue: null });

  threads = signal<ThreadView[]>([]);
  totalCount = signal(0);
  hasMore = signal(false);
  loading = signal(true);
  loadFailed = signal(false);
  loadingMore = signal(false);
  posting = signal(false);
  highlightId = signal<string | null>(null);
  replyingTo = signal<{ threadId: string; target: MovieComment } | null>(null);
  replying = signal(false);

  private composer = viewChild<CommentComposerComponent>('composer');
  private cursor?: string;
  private loadSub?: Subscription;

  constructor() {
    effect(() => {
      const movieId = this.movieId();
      const focusId = this.focusCommentId();
      untracked(() => this.load(movieId, focusId));
    });
    inject(DestroyRef).onDestroy(() => this.loadSub?.unsubscribe());
  }

  load(movieId = this.movieId(), focusId = this.focusCommentId()) {
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.loadFailed.set(false);
    this.replyingTo.set(null);

    const focused$ = focusId ? this.commentService.getThread(focusId).pipe(catchError(() => of(null))) : of(null);
    this.loadSub = forkJoin([this.commentService.getComments(movieId), focused$]).subscribe({
      next: ([page, focused]) => {
        const pinned = focused?.movieId === movieId ? focused : null;
        const listed = page.comments.filter(comment => comment.id !== pinned?.id);
        this.threads.set((pinned ? [pinned, ...listed] : listed).map(toThreadView));
        this.totalCount.set(page.totalCount);
        this.hasMore.set(page.hasMore);
        this.cursor = page.comments.at(-1)?.id;
        this.loading.set(false);

        this.highlightId.set(pinned ? focusId : null);
        if (pinned && focusId) {
          this.scrollTo(focusId);
        } else if (focusId) {
          this.toastService.info('That comment has been deleted.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  loadMore() {
    this.loadingMore.set(true);
    this.commentService.getComments(this.movieId(), this.cursor).subscribe({
      next: page => {
        const known = new Set(this.threads().map(thread => thread.comment.id));
        this.threads.update(threads => [...threads, ...page.comments.filter(c => !known.has(c.id)).map(toThreadView)]);
        this.hasMore.set(page.hasMore);
        this.cursor = page.comments.at(-1)?.id ?? this.cursor;
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.toastService.error('More comments could not be loaded.');
      }
    });
  }

  loadMoreReplies(thread: ThreadView) {
    const id = thread.comment.id;
    this.updateThread(id, t => ({ ...t, loadingReplies: true }));
    this.commentService.getReplies(id, thread.cursor).subscribe({
      next: page => this.updateThread(id, t => {
        // Replies posted here are already shown, so merge rather than append.
        const known = new Set(t.replies.map(reply => reply.id));
        const fresh = page.replies.filter(reply => !known.has(reply.id));
        return {
          ...t,
          replies: [...t.replies, ...fresh].sort(byId),
          hiddenReplies: page.hasMore ? Math.max(t.hiddenReplies - page.replies.length, 1) : 0,
          cursor: page.replies.at(-1)?.id ?? t.cursor,
          loadingReplies: false
        };
      }),
      error: () => {
        this.updateThread(id, t => ({ ...t, loadingReplies: false }));
        this.toastService.error('Replies could not be loaded.');
      }
    });
  }

  signIn() {
    this.router.navigate(['/login'], { queryParams: { returnTo: this.location.path(true) } });
  }

  post(body: string) {
    this.posting.set(true);
    this.commentService.addComment(this.movieId(), body).subscribe({
      next: comment => {
        this.posting.set(false);
        this.composer()?.clear();
        this.threads.update(threads => [toThreadView(comment), ...threads]);
        this.totalCount.update(count => count + 1);
      },
      error: err => {
        this.posting.set(false);
        this.toastService.error(this.postErrorMessage(err));
      }
    });
  }

  startReply(thread: ThreadView, target: MovieComment) {
    this.replyingTo.set({ threadId: thread.comment.id, target });
  }

  cancelReply() {
    this.replyingTo.set(null);
  }

  postReply(body: string) {
    const replyingTo = this.replyingTo();
    if (!replyingTo) {
      return;
    }

    this.replying.set(true);
    this.commentService.addComment(this.movieId(), body, replyingTo.target.id).subscribe({
      next: reply => {
        this.replying.set(false);
        this.replyingTo.set(null);
        this.updateThread(replyingTo.threadId, t => ({ ...t, replies: [...t.replies, reply] }));
        this.totalCount.update(count => count + 1);
      },
      error: err => {
        this.replying.set(false);
        this.toastService.error(this.postErrorMessage(err));
      }
    });
  }

  onCommentChanged(thread: ThreadView, comment: MovieComment) {
    this.updateThread(thread.comment.id, t => t.comment.id === comment.id
      ? { ...t, comment }
      : { ...t, replies: t.replies.map(reply => reply.id === comment.id ? comment : reply) });
  }

  // Mirrors the API: a top-level comment with replies stays as a placeholder, and a
  // placeholder goes once its last reply does.
  onCommentRemoved(thread: ThreadView, comment: MovieComment) {
    this.totalCount.update(count => count - 1);
    const id = thread.comment.id;
    if (comment.id === id) {
      if (thread.replies.length || thread.hiddenReplies) {
        this.updateThread(id, t => ({ ...t, comment: { ...t.comment, deleted: true, body: '', author: null, likeCount: 0, likedByMe: false, editedDate: undefined } }));
      } else {
        this.removeThread(id);
      }
      return;
    }

    this.updateThread(id, t => ({ ...t, replies: t.replies.filter(reply => reply.id !== comment.id) }));
    const updated = this.threads().find(t => t.comment.id === id);
    if (updated?.comment.deleted && !updated.replies.length && !updated.hiddenReplies) {
      this.removeThread(id);
    }
    if (this.replyingTo()?.target.id === comment.id) {
      this.replyingTo.set(null);
    }
  }

  replyPlaceholder(target: MovieComment): string {
    return target.parentId && target.author ? `Reply to @${target.author.displayName}...` : 'Add a reply...';
  }

  private updateThread(id: string, change: (thread: ThreadView) => ThreadView) {
    this.threads.update(threads => threads.map(thread => thread.comment.id === id ? change(thread) : thread));
  }

  private removeThread(id: string) {
    this.threads.update(threads => threads.filter(thread => thread.comment.id !== id));
  }

  private scrollTo(commentId: string) {
    afterNextRender(() => {
      document.getElementById(`comment-${commentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, { injector: this.injector });
  }

  private postErrorMessage(err: { status?: number }): string {
    if (err?.status === 429) {
      return 'You are commenting too quickly. Please wait a minute and try again.';
    }
    if (err?.status === 404) {
      return 'That comment no longer exists.';
    }
    if (err?.status === 401 || err?.status === 403) {
      return 'Please sign in again to comment.';
    }
    return 'Your comment could not be posted.';
  }
}
