import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReplyNotification, Role, SessionUser } from '@portfolio/models';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Notification } from './notification.schema';

const LIST_LIMIT = 30;

export interface NotificationRecipient {
  id: Types.ObjectId;
  role: Role;
  type: Notification['type'];
}

export interface NotificationEvent {
  actorName: string;
  movieId: Types.ObjectId;
  movieTitle: string;
  commentId: Types.ObjectId;
}

export function toReplyNotification(doc: Notification): ReplyNotification {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    actorName: doc.actorName,
    movieId: doc.movieId.toHexString(),
    movieTitle: doc.movieTitle,
    commentId: doc.commentId.toHexString(),
    read: doc.read,
    createdDate: doc.createdDate.toISOString()
  };
}

@Injectable()
export class NotificationsService {

  constructor(@InjectModel('Notification') private notificationModel: Model<Notification>) {}

  async notify(recipients: NotificationRecipient[], event: NotificationEvent): Promise<void> {
    if (!recipients.length) {
      return;
    }
    const createdDate = new Date();
    await this.notificationModel.insertMany(recipients.map(recipient => ({
      recipientId: recipient.id,
      recipientRole: recipient.role,
      type: recipient.type,
      ...event,
      createdDate
    })));
  }

  async list(user: SessionUser): Promise<ReplyNotification[]> {
    const docs = await this.notificationModel.find(this.recipientFilter(user))
      .sort({ _id: -1 })
      .limit(LIST_LIMIT)
      .exec();
    return docs.map(toReplyNotification);
  }

  unreadCount(user: SessionUser): Promise<number> {
    return this.notificationModel.countDocuments({ ...this.recipientFilter(user), read: false }).exec();
  }

  async markAllRead(user: SessionUser): Promise<void> {
    await this.notificationModel.updateMany({ ...this.recipientFilter(user), read: false }, { $set: { read: true } }).exec();
  }

  /** Removes notifications pointing at comments that no longer exist. */
  async deleteForComments(commentIds: Types.ObjectId[]): Promise<void> {
    if (commentIds.length) {
      await this.notificationModel.deleteMany({ commentId: { $in: commentIds } }).exec();
    }
  }

  private recipientFilter(user: SessionUser) {
    // A session id is always a valid ObjectId, but guard anyway so a bad one matches nothing.
    const recipientId = isValidObjectId(user.id) ? new Types.ObjectId(user.id) : new Types.ObjectId();
    return { recipientId, recipientRole: user.role };
  }
}
