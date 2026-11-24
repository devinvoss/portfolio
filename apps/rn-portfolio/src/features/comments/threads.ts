import { MovieComment, ReplyPage } from '@portfolio/models';

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
    cursor: replies[replies.length - 1]?.id,
    loadingReplies: false
  };
}

// Object ids start with a timestamp, so sorting them puts replies in the order they were posted.
const byId = (a: MovieComment, b: MovieComment) => a.id.localeCompare(b.id);

/** Adds a page of replies. Replies posted here are already shown, so this merges rather than appends. */
export function addReplyPage(thread: ThreadView, page: ReplyPage): ThreadView {
  const known = new Set(thread.replies.map(reply => reply.id));
  const fresh = page.replies.filter(reply => !known.has(reply.id));
  return {
    ...thread,
    replies: [...thread.replies, ...fresh].sort(byId),
    hiddenReplies: page.hasMore ? Math.max(thread.hiddenReplies - page.replies.length, 1) : 0,
    cursor: page.replies[page.replies.length - 1]?.id ?? thread.cursor,
    loadingReplies: false
  };
}

/** Puts an edited or liked comment in place, whether it's the thread's comment or one of its replies. */
export function replaceComment(thread: ThreadView, comment: MovieComment): ThreadView {
  return thread.comment.id === comment.id
    ? { ...thread, comment }
    : { ...thread, replies: thread.replies.map(reply => reply.id === comment.id ? comment : reply) };
}

/**
 * Mirrors the API: a top-level comment with replies stays as a "[deleted]" placeholder, and a placeholder
 * goes once its last reply does. Returns null when the whole thread goes.
 */
export function removeComment(thread: ThreadView, commentId: string): ThreadView | null {
  if (commentId === thread.comment.id) {
    if (thread.replies.length || thread.hiddenReplies) {
      return {
        ...thread,
        comment: { ...thread.comment, deleted: true, body: '', author: null, likeCount: 0, likedByMe: false, editedDate: undefined }
      };
    }
    return null;
  }

  const updated = { ...thread, replies: thread.replies.filter(reply => reply.id !== commentId) };
  return updated.comment.deleted && !updated.replies.length && !updated.hiddenReplies ? null : updated;
}

export function replyPlaceholder(target: MovieComment): string {
  return target.parentId && target.author ? `Reply to @${target.author.displayName}...` : 'Add a reply...';
}

export function postErrorMessage(status: number | undefined): string {
  if (status === 429) {
    return 'You are commenting too quickly. Please wait a minute and try again.';
  }
  if (status === 404) {
    return 'That comment no longer exists.';
  }
  if (status === 401 || status === 403) {
    return 'Please sign in again to comment.';
  }
  return 'Your comment could not be posted.';
}
