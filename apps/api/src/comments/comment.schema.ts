import * as mongoose from 'mongoose';
import { Role } from '@portfolio/models';

const ROLES: Role[] = ['admin', 'member'];

// Replies are one level deep: every reply points at a top-level comment through parentId, and
// replyTo records whose reply it answered so the UI can show an @mention.
export interface Comment {
  _id: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  // Admins and members live in different collections, so each reference carries its role.
  authorId: mongoose.Types.ObjectId;
  authorRole: Role;
  replyToId?: mongoose.Types.ObjectId;
  replyToRole?: Role;
  body: string;
  deleted: boolean;
  likedBy: mongoose.Types.ObjectId[];
  likeCount: number;
  replyCount: number;
  createdDate: Date;
  editedDate?: Date;
}

export const CommentSchema = new mongoose.Schema({
  movieId: { type: mongoose.Schema.Types.ObjectId, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  authorRole: { type: String, enum: ROLES, required: true },
  replyToId: mongoose.Schema.Types.ObjectId,
  replyToRole: { type: String, enum: ROLES },
  body: { type: String, default: '' },
  deleted: { type: Boolean, default: false },
  likedBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  likeCount: { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },
  createdDate: { type: Date, required: true },
  editedDate: Date
});

// Top-level comments newest first, and each comment's replies oldest first.
CommentSchema.index({ movieId: 1, parentId: 1, _id: -1 });
CommentSchema.index({ parentId: 1, _id: 1 });
CommentSchema.index({ authorId: 1 });
