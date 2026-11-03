import { Role } from './session.model';

export const COMMENT_MAX_LENGTH = 2000;

export interface CommentAuthor {
  id: string;
  role: Role;
  displayName: string;
  avatarUrl?: string;
}

export interface MovieComment {
  id: string;
  movieId: string;
  /** The top-level comment a reply belongs to; absent on top-level comments. */
  parentId?: string;
  /** Null when the author's account was deleted. */
  author: CommentAuthor | null;
  /** Who a reply was aimed at, shown as an @mention. */
  replyTo?: { displayName: string } | null;
  body: string;
  /** A deleted top-level comment stays as a placeholder while it has replies. */
  deleted: boolean;
  createdDate: string;
  editedDate?: string;
  likeCount: number;
  likedByMe: boolean;
  /** Top-level comments only: the first replies, oldest first. */
  replies?: MovieComment[];
  replyCount?: number;
}

export interface CommentPage {
  comments: MovieComment[];
  hasMore: boolean;
  /** Every visible comment and reply on the movie. */
  totalCount: number;
}

export interface ReplyPage {
  replies: MovieComment[];
  hasMore: boolean;
}

export interface NewComment {
  body: string;
  /** Set when replying; may be a top-level comment or a reply. */
  replyToCommentId?: string;
}

export interface LikeResult {
  likeCount: number;
  likedByMe: boolean;
}

export interface ReplyNotification {
  id: string;
  type: 'reply' | 'mention';
  actorName: string;
  movieId: string;
  movieTitle: string;
  commentId: string;
  read: boolean;
  createdDate: string;
}
