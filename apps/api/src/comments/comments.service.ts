import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CommentAuthor, CommentPage, LikeResult, MovieComment, ReplyPage, Role, SessionUser } from '@portfolio/models';
import { Model, QueryFilter, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { MovieService } from '../movie/movie.service';
import { NotificationRecipient, NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Comment } from './comment.schema';
import { CreateCommentDto } from './comment.dto';

export const COMMENT_PAGE_SIZE = 20;
export const REPLY_PREVIEW_SIZE = 3;
export const REPLY_PAGE_SIZE = 50;

// Shown for the admin when the admin user has no display name, so the login username stays private.
const ADMIN_FALLBACK_NAME = 'Site author';
const DELETED_USER_NAME = 'Deleted user';

type Viewer = SessionUser | null;
type People = Map<string, CommentAuthor>;

const personKey = (role: Role, id: Types.ObjectId | string) => `${role}:${id.toString()}`;
const isAuthor = (comment: Comment, user: SessionUser) => comment.authorRole === user.role && comment.authorId.equals(user.id);

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel('Comment') private commentModel: Model<Comment>,
    private movieService: MovieService,
    private accountsService: AccountsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService
  ) {}

  /** Top-level comments newest first, each with its first few replies. */
  async list(movieId: Types.ObjectId, viewer: Viewer, before?: string): Promise<CommentPage> {
    const filter: QueryFilter<Comment> = { movieId, parentId: null };
    if (before) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    const [found, totalCount] = await Promise.all([
      this.commentModel.find(filter).sort({ _id: -1 }).limit(COMMENT_PAGE_SIZE + 1).lean<Comment[]>().exec(),
      this.commentModel.countDocuments({ movieId, deleted: false }).exec()
    ]);
    const comments = found.slice(0, COMMENT_PAGE_SIZE);
    const replies = await this.replyPreviews(comments.filter(c => c.replyCount > 0).map(c => c._id));

    const people = await this.loadPeople([...comments, ...[...replies.values()].flat()]);
    return {
      comments: comments.map(comment => ({
        ...this.toMovieComment(comment, people, viewer),
        replies: (replies.get(comment._id.toHexString()) ?? []).map(reply => this.toMovieComment(reply, people, viewer)),
        replyCount: comment.replyCount
      })),
      hasMore: found.length > COMMENT_PAGE_SIZE,
      totalCount
    };
  }

  /** A comment's replies oldest first, after the given reply. */
  async listReplies(parentId: Types.ObjectId, viewer: Viewer, after?: string): Promise<ReplyPage> {
    const filter: QueryFilter<Comment> = { parentId };
    if (after) {
      filter._id = { $gt: new Types.ObjectId(after) };
    }
    const found = await this.commentModel.find(filter).sort({ _id: 1 }).limit(REPLY_PAGE_SIZE + 1).lean<Comment[]>().exec();
    const replies = found.slice(0, REPLY_PAGE_SIZE);
    const people = await this.loadPeople(replies);
    return {
      replies: replies.map(reply => this.toMovieComment(reply, people, viewer)),
      hasMore: found.length > REPLY_PAGE_SIZE
    };
  }

  async create(movieId: Types.ObjectId, user: SessionUser, dto: CreateCommentDto): Promise<MovieComment> {
    const movie = await this.movieService.findMovie(movieId.toHexString());

    // Replying to a reply files the new reply under the same top-level comment and mentions the reply's author.
    let parent: Comment | null = null;
    let target: Comment | null = null;
    if (dto.replyToCommentId) {
      target = await this.commentModel.findById(dto.replyToCommentId).lean<Comment>().exec();
      if (!target || target.deleted || !target.movieId.equals(movieId)) {
        throw new NotFoundException('That comment no longer exists.');
      }
      parent = target.parentId ? await this.commentModel.findById(target.parentId).lean<Comment>().exec() : target;
      if (!parent) {
        throw new NotFoundException('That comment no longer exists.');
      }
    }
    const mentioned = target?.parentId ? target : null;

    const created = await this.commentModel.create({
      movieId,
      parentId: parent?._id ?? null,
      authorId: new Types.ObjectId(user.id),
      authorRole: user.role,
      replyToId: mentioned?.authorId,
      replyToRole: mentioned?.authorRole,
      body: dto.body,
      createdDate: new Date()
    });
    const comment = created.toObject<Comment>();

    if (parent) {
      await this.commentModel.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } }).exec();
      await this.notifyReply(user, parent, mentioned, { actorName: user.displayName, movieId, movieTitle: movie.title, commentId: comment._id });
    }

    const people = await this.loadPeople([comment]);
    const result = this.toMovieComment(comment, people, user);
    return parent ? result : { ...result, replies: [], replyCount: 0 };
  }

  async edit(id: Types.ObjectId, user: SessionUser, body: string): Promise<MovieComment> {
    const comment = await this.findVisible(id);
    if (!isAuthor(comment, user)) {
      throw new ForbiddenException('Only the author can edit a comment.');
    }

    const updated = await this.commentModel.findByIdAndUpdate(id, { $set: { body, editedDate: new Date() } }, { returnDocument: 'after' }).lean<Comment>().exec();
    if (!updated) {
      throw new NotFoundException('Comment not found.');
    }
    const people = await this.loadPeople([updated]);
    return this.toMovieComment(updated, people, user);
  }

  async remove(id: Types.ObjectId, user: SessionUser): Promise<void> {
    const comment = await this.findVisible(id);
    if (!isAuthor(comment, user) && user.role !== 'admin') {
      throw new ForbiddenException('Only the author or the admin can delete a comment.');
    }
    await this.removeComment(comment);
  }

  async like(id: Types.ObjectId, user: SessionUser): Promise<LikeResult> {
    const userId = new Types.ObjectId(user.id);
    const updated = await this.commentModel.findOneAndUpdate(
      { _id: id, deleted: false, likedBy: { $ne: userId } },
      { $push: { likedBy: userId }, $inc: { likeCount: 1 } },
      { returnDocument: 'after' }
    ).lean<Comment>().exec();
    // No match means it was already liked, or the comment is gone.
    return { likeCount: (updated ?? await this.findVisible(id)).likeCount, likedByMe: true };
  }

  async unlike(id: Types.ObjectId, user: SessionUser): Promise<LikeResult> {
    const userId = new Types.ObjectId(user.id);
    const updated = await this.commentModel.findOneAndUpdate(
      { _id: id, deleted: false, likedBy: userId },
      { $pull: { likedBy: userId }, $inc: { likeCount: -1 } },
      { returnDocument: 'after' }
    ).lean<Comment>().exec();
    return { likeCount: (updated ?? await this.findVisible(id)).likeCount, likedByMe: false };
  }

  /** Bans a comment's author and removes all of their comments. */
  async banAuthor(id: Types.ObjectId): Promise<{ removedComments: number }> {
    const comment = await this.commentModel.findById(id).lean<Comment>().exec();
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    if (comment.authorRole !== 'member') {
      throw new BadRequestException('Only member accounts can be banned.');
    }

    await this.accountsService.ban(comment.authorId);

    const theirs = await this.commentModel.find({ authorId: comment.authorId, authorRole: 'member', deleted: false }).lean<Comment[]>().exec();
    // Replies first, so a top-level comment whose replies were all theirs is deleted outright.
    const ordered = [...theirs.filter(c => c.parentId), ...theirs.filter(c => !c.parentId)];
    for (const own of ordered) {
      await this.removeComment(own);
    }
    return { removedComments: theirs.length };
  }

  private async findVisible(id: Types.ObjectId): Promise<Comment> {
    const comment = await this.commentModel.findById(id).lean<Comment>().exec();
    if (!comment || comment.deleted) {
      throw new NotFoundException('Comment not found.');
    }
    return comment;
  }

  // A top-level comment with replies becomes a "[deleted]" placeholder so the thread still
  // reads; anything else is deleted outright, along with a placeholder left with no replies.
  private async removeComment(comment: Comment): Promise<void> {
    const removedIds = [comment._id];

    if (!comment.parentId && await this.commentModel.exists({ parentId: comment._id })) {
      await this.commentModel.updateOne(
        { _id: comment._id },
        { $set: { deleted: true, body: '', likedBy: [], likeCount: 0 }, $unset: { editedDate: 1 } }
      ).exec();
    } else {
      await this.commentModel.deleteOne({ _id: comment._id }).exec();
      if (comment.parentId) {
        const parent = await this.commentModel.findByIdAndUpdate(comment.parentId, { $inc: { replyCount: -1 } }, { returnDocument: 'after' }).lean<Comment>().exec();
        if (parent?.deleted && !await this.commentModel.exists({ parentId: parent._id })) {
          await this.commentModel.deleteOne({ _id: parent._id }).exec();
          removedIds.push(parent._id);
        }
      }
    }

    await this.notificationsService.deleteForComments(removedIds);
  }

  // The top-level author hears about every reply in their thread; a mentioned reply author
  // hears about replies aimed at them. Nobody is notified about their own comment.
  private async notifyReply(actor: SessionUser, parent: Comment, mentioned: Comment | null, event: Parameters<NotificationsService['notify']>[1]) {
    const recipients: NotificationRecipient[] = [];
    if (!parent.deleted && !isAuthor(parent, actor)) {
      recipients.push({ id: parent.authorId, role: parent.authorRole, type: 'reply' });
    }
    if (mentioned && !isAuthor(mentioned, actor) && personKey(mentioned.authorRole, mentioned.authorId) !== personKey(parent.authorRole, parent.authorId)) {
      recipients.push({ id: mentioned.authorId, role: mentioned.authorRole, type: 'mention' });
    }

    // The comment is already saved, so a failed notification shouldn't fail the request.
    try {
      await this.notificationsService.notify(recipients, event);
    } catch (err) {
      this.logger.error(`Could not create reply notifications: ${err}`);
    }
  }

  private async replyPreviews(parentIds: Types.ObjectId[]): Promise<Map<string, Comment[]>> {
    if (!parentIds.length) {
      return new Map();
    }
    const groups = await this.commentModel.aggregate<{ _id: Types.ObjectId; replies: Comment[] }>([
      { $match: { parentId: { $in: parentIds } } },
      { $sort: { _id: 1 } },
      { $group: { _id: '$parentId', replies: { $push: '$$ROOT' } } },
      { $project: { replies: { $slice: ['$replies', REPLY_PREVIEW_SIZE] } } }
    ]).exec();
    return new Map(groups.map(group => [group._id.toHexString(), group.replies]));
  }

  // Names and avatars are looked up on every read so a changed display name shows everywhere.
  private async loadPeople(comments: Comment[]): Promise<People> {
    const ids: Record<Role, Map<string, Types.ObjectId>> = { admin: new Map(), member: new Map() };
    for (const comment of comments) {
      if (!comment.deleted) {
        ids[comment.authorRole].set(comment.authorId.toHexString(), comment.authorId);
      }
      if (comment.replyToId && comment.replyToRole) {
        ids[comment.replyToRole].set(comment.replyToId.toHexString(), comment.replyToId);
      }
    }

    const [accounts, admins] = await Promise.all([
      this.accountsService.findByIds([...ids.member.values()]),
      this.usersService.findAdminsByIds([...ids.admin.values()])
    ]);

    const people: People = new Map();
    for (const account of accounts) {
      people.set(personKey('member', account.id), { id: account.id, role: 'member', displayName: account.displayName, avatarUrl: account.avatarUrl });
    }
    for (const admin of admins) {
      people.set(personKey('admin', admin.id), { id: admin.id, role: 'admin', displayName: admin.displayName || ADMIN_FALLBACK_NAME });
    }
    return people;
  }

  private toMovieComment(comment: Comment, people: People, viewer: Viewer): MovieComment {
    const result: MovieComment = {
      id: comment._id.toHexString(),
      movieId: comment.movieId.toHexString(),
      author: comment.deleted ? null : people.get(personKey(comment.authorRole, comment.authorId)) ?? null,
      body: comment.deleted ? '' : comment.body,
      deleted: comment.deleted,
      createdDate: comment.createdDate.toISOString(),
      likeCount: comment.likeCount,
      likedByMe: !!viewer && comment.likedBy.some(id => id.equals(viewer.id))
    };
    if (comment.parentId) {
      result.parentId = comment.parentId.toHexString();
    }
    if (comment.replyToId && comment.replyToRole) {
      result.replyTo = { displayName: people.get(personKey(comment.replyToRole, comment.replyToId))?.displayName ?? DELETED_USER_NAME };
    }
    if (comment.editedDate) {
      result.editedDate = comment.editedDate.toISOString();
    }
    return result;
  }
}
