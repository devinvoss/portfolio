import * as mongoose from 'mongoose';
import { Role } from '@portfolio/models';

export const NOTIFICATION_TYPES = ['reply', 'mention'] as const;

// Old notifications are dropped by a TTL index, so the collection doesn't grow forever.
const NOTIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;

// The actor's name and movie title are copied in when the notification is created, so
// listing them takes one query.
export interface Notification {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  recipientRole: Role;
  type: typeof NOTIFICATION_TYPES[number];
  actorName: string;
  movieId: mongoose.Types.ObjectId;
  movieTitle: string;
  commentId: mongoose.Types.ObjectId;
  read: boolean;
  createdDate: Date;
}

export const NotificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipientRole: { type: String, enum: ['admin', 'member'], required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  actorName: { type: String, required: true },
  movieId: { type: mongoose.Schema.Types.ObjectId, required: true },
  movieTitle: { type: String, default: '' },
  commentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  read: { type: Boolean, default: false },
  createdDate: { type: Date, required: true }
});

NotificationSchema.index({ recipientId: 1, recipientRole: 1, _id: -1 });
NotificationSchema.index({ commentId: 1 });
NotificationSchema.index({ createdDate: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_SECONDS });
