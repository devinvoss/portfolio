import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionUser } from '@portfolio/models';
import { Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { MovieService } from '../movie/movie.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Comment } from './comment.schema';
import { CommentsService } from './comments.service';

// Stands in for a mongoose query: every chained call returns itself and exec() resolves the value.
const query = <T>(value: T) => {
  const q = { sort: () => q, limit: () => q, lean: () => q, exec: () => Promise.resolve(value) };
  return q;
};

const id = () => new Types.ObjectId();
const sam: SessionUser = { id: id().toHexString(), role: 'member', displayName: 'Sam' };
const alex: SessionUser = { id: id().toHexString(), role: 'member', displayName: 'Alex' };
const admin: SessionUser = { id: id().toHexString(), role: 'admin', displayName: 'Devin' };
const movieId = id();

const makeComment = (author: SessionUser, extra: Partial<Comment> = {}): Comment => ({
  _id: id(),
  movieId,
  parentId: null,
  authorId: new Types.ObjectId(author.id),
  authorRole: author.role,
  body: 'Great movie',
  deleted: false,
  likedBy: [],
  likeCount: 0,
  replyCount: 0,
  createdDate: new Date(),
  ...extra
});

describe('CommentsService', () => {
  let service: CommentsService;
  const commentModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    exists: jest.fn(),
    aggregate: jest.fn()
  };
  const movieService = { findMovie: jest.fn() };
  const accountsService = { findByIds: jest.fn(), ban: jest.fn() };
  const usersService = { findAdminsByIds: jest.fn() };
  const notificationsService = { notify: jest.fn(), deleteForComments: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    commentModel.updateOne.mockReturnValue(query({}));
    commentModel.deleteOne.mockReturnValue(query({}));
    commentModel.exists.mockResolvedValue(null);
    accountsService.findByIds.mockResolvedValue([
      { id: sam.id, displayName: 'Sam' },
      { id: alex.id, displayName: 'Alex' }
    ]);
    usersService.findAdminsByIds.mockResolvedValue([{ id: admin.id, displayName: '' }]);
    movieService.findMovie.mockResolvedValue({ title: 'Heat' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken('Comment'), useValue: commentModel },
        { provide: MovieService, useValue: movieService },
        { provide: AccountsService, useValue: accountsService },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationsService, useValue: notificationsService }
      ]
    }).compile();

    service = module.get(CommentsService);
  });

  const mockCreate = () => commentModel.create.mockImplementation(async doc => ({ toObject: () => ({ _id: id(), deleted: false, likedBy: [], likeCount: 0, replyCount: 0, ...doc }) }));

  describe('create', () => {
    it('creates a top-level comment without notifying anyone', async () => {
      mockCreate();
      const result = await service.create(movieId, sam, { body: 'Loved it' });

      expect(result).toEqual(expect.objectContaining({ body: 'Loved it', author: expect.objectContaining({ displayName: 'Sam' }), replies: [], replyCount: 0 }));
      expect(result.parentId).toBeUndefined();
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('rejects a comment on a missing movie', async () => {
      movieService.findMovie.mockRejectedValue(new NotFoundException());
      await expect(service.create(movieId, sam, { body: 'Hi' })).rejects.toBeInstanceOf(NotFoundException);
      expect(commentModel.create).not.toHaveBeenCalled();
    });

    it('files a reply under the comment and notifies its author', async () => {
      const parent = makeComment(sam);
      commentModel.findById.mockReturnValue(query(parent));
      mockCreate();

      const reply = await service.create(movieId, alex, { body: 'Agreed', replyToCommentId: parent._id.toHexString() });

      expect(reply.parentId).toBe(parent._id.toHexString());
      expect(reply.replyTo).toBeUndefined();
      expect(commentModel.updateOne).toHaveBeenCalledWith({ _id: parent._id }, { $inc: { replyCount: 1 } });
      expect(notificationsService.notify).toHaveBeenCalledWith(
        [{ id: parent.authorId, role: 'member', type: 'reply' }],
        expect.objectContaining({ actorName: 'Alex', movieTitle: 'Heat' })
      );
    });

    it('files a reply to a reply under the top-level comment and mentions the reply author', async () => {
      const parent = makeComment(sam);
      const earlierReply = makeComment(admin, { parentId: parent._id });
      commentModel.findById.mockImplementation(commentId => query(commentId === earlierReply._id.toHexString() ? earlierReply : parent));
      mockCreate();

      const reply = await service.create(movieId, alex, { body: 'Ha', replyToCommentId: earlierReply._id.toHexString() });

      expect(reply.parentId).toBe(parent._id.toHexString());
      expect(reply.replyTo).toEqual({ displayName: 'Site author' });
      expect(notificationsService.notify).toHaveBeenCalledWith([
        { id: parent.authorId, role: 'member', type: 'reply' },
        { id: earlierReply.authorId, role: 'admin', type: 'mention' }
      ], expect.anything());
    });

    it('does not notify people about their own replies', async () => {
      const parent = makeComment(sam);
      commentModel.findById.mockReturnValue(query(parent));
      mockCreate();

      await service.create(movieId, sam, { body: 'Also', replyToCommentId: parent._id.toHexString() });

      expect(notificationsService.notify).toHaveBeenCalledWith([], expect.anything());
    });

    it('rejects a reply to a comment on another movie', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam, { movieId: id() })));
      await expect(service.create(movieId, alex, { body: 'Hi', replyToCommentId: id().toHexString() })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a reply to a deleted comment', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam, { deleted: true })));
      await expect(service.create(movieId, alex, { body: 'Hi', replyToCommentId: id().toHexString() })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('edit', () => {
    it('lets the author edit', async () => {
      const comment = makeComment(sam);
      commentModel.findById.mockReturnValue(query(comment));
      commentModel.findByIdAndUpdate.mockReturnValue(query({ ...comment, body: 'Edited', editedDate: new Date() }));

      const result = await service.edit(comment._id, sam, 'Edited');

      expect(result.body).toBe('Edited');
      expect(result.editedDate).toBeDefined();
    });

    it('does not let anyone else edit, including the admin', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam)));
      await expect(service.edit(id(), alex, 'Nope')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.edit(id(), admin, 'Nope')).rejects.toBeInstanceOf(ForbiddenException);
      expect(commentModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('treats an id from the other collection as a different person', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam)));
      await expect(service.edit(id(), { ...sam, role: 'admin' }, 'Nope')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('does not let other members delete', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam)));
      await expect(service.remove(id(), alex)).rejects.toBeInstanceOf(ForbiddenException);
      expect(commentModel.deleteOne).not.toHaveBeenCalled();
    });

    it('lets the admin delete any comment', async () => {
      const comment = makeComment(sam);
      commentModel.findById.mockReturnValue(query(comment));

      await service.remove(comment._id, admin);

      expect(commentModel.deleteOne).toHaveBeenCalledWith({ _id: comment._id });
      expect(notificationsService.deleteForComments).toHaveBeenCalledWith([comment._id]);
    });

    it('leaves a placeholder for a top-level comment with replies', async () => {
      const comment = makeComment(sam, { replyCount: 2 });
      commentModel.findById.mockReturnValue(query(comment));
      commentModel.exists.mockResolvedValue({ _id: id() });

      await service.remove(comment._id, sam);

      expect(commentModel.deleteOne).not.toHaveBeenCalled();
      expect(commentModel.updateOne).toHaveBeenCalledWith(
        { _id: comment._id },
        expect.objectContaining({ $set: expect.objectContaining({ deleted: true, body: '' }) })
      );
    });

    it('removes a placeholder once its last reply is deleted', async () => {
      const parent = makeComment(sam, { deleted: true, replyCount: 0 });
      const reply = makeComment(alex, { parentId: parent._id });
      commentModel.findById.mockReturnValue(query(reply));
      commentModel.findByIdAndUpdate.mockReturnValue(query(parent));

      await service.remove(reply._id, alex);

      expect(commentModel.deleteOne).toHaveBeenCalledWith({ _id: reply._id });
      expect(commentModel.deleteOne).toHaveBeenCalledWith({ _id: parent._id });
      expect(notificationsService.deleteForComments).toHaveBeenCalledWith([reply._id, parent._id]);
    });

    it('reports a deleted comment as not found', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(sam, { deleted: true })));
      await expect(service.remove(id(), sam)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('likes', () => {
    it('likes once per person', async () => {
      const comment = makeComment(sam, { likeCount: 1 });
      commentModel.findOneAndUpdate.mockReturnValue(query(null));
      commentModel.findById.mockReturnValue(query(comment));

      expect(await service.like(comment._id, alex)).toEqual({ likeCount: 1, likedByMe: true });
      expect(commentModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ likedBy: { $ne: new Types.ObjectId(alex.id) } }),
        expect.anything(),
        expect.anything()
      );
    });

    it('marks comments the viewer liked', async () => {
      const liked = makeComment(sam, { likedBy: [new Types.ObjectId(alex.id)], likeCount: 1 });
      commentModel.find.mockReturnValue(query([liked]));
      commentModel.countDocuments.mockReturnValue(query(1));

      const forAlex = await service.list(movieId, alex);
      const forAnonymous = await service.list(movieId, null);

      expect(forAlex.comments[0].likedByMe).toBe(true);
      expect(forAnonymous.comments[0].likedByMe).toBe(false);
    });
  });

  describe('list', () => {
    it('shows deleted authors and placeholders without names', async () => {
      const gone = makeComment({ ...sam, id: id().toHexString() });
      const placeholder = makeComment(sam, { deleted: true, body: '', replyCount: 1 });
      commentModel.find.mockReturnValue(query([gone, placeholder]));
      commentModel.countDocuments.mockReturnValue(query(1));
      commentModel.aggregate.mockReturnValue(query([{ _id: placeholder._id, replies: [makeComment(alex, { parentId: placeholder._id })] }]));

      const page = await service.list(movieId, null);

      expect(page.comments[0].author).toBeNull();
      expect(page.comments[1]).toEqual(expect.objectContaining({ author: null, body: '', deleted: true, replyCount: 1 }));
      expect(page.comments[1].replies).toHaveLength(1);
    });

    it('reports another page when there are more comments', async () => {
      commentModel.find.mockReturnValue(query(Array.from({ length: 21 }, () => makeComment(sam))));
      commentModel.countDocuments.mockReturnValue(query(21));

      const page = await service.list(movieId, null);

      expect(page.comments).toHaveLength(20);
      expect(page.hasMore).toBe(true);
    });
  });

  describe('thread', () => {
    it('returns the top-level comment with its replies when given a reply', async () => {
      const parent = makeComment(sam, { replyCount: 1 });
      const reply = makeComment(alex, { parentId: parent._id });
      commentModel.findById.mockImplementation(commentId => query(commentId.equals(reply._id) ? reply : parent));
      commentModel.find.mockReturnValue(query([reply]));

      const thread = await service.thread(reply._id, null);

      expect(thread.id).toBe(parent._id.toHexString());
      expect(thread.replies?.map(r => r.id)).toEqual([reply._id.toHexString()]);
    });
  });

  describe('banAuthor', () => {
    it('bans the author and removes their comments, replies first', async () => {
      const comment = makeComment(sam);
      const reply = makeComment(sam, { parentId: id() });
      commentModel.findById.mockReturnValue(query(comment));
      commentModel.find.mockReturnValue(query([comment, reply]));
      commentModel.findByIdAndUpdate.mockReturnValue(query(null));

      expect(await service.banAuthor(comment._id)).toEqual({ removedComments: 2 });
      expect(accountsService.ban).toHaveBeenCalledWith(comment.authorId);
      expect(commentModel.deleteOne.mock.calls.map(([filter]) => filter._id)).toEqual([reply._id, comment._id]);
    });

    it('refuses to ban the admin', async () => {
      commentModel.findById.mockReturnValue(query(makeComment(admin)));
      await expect(service.banAuthor(id())).rejects.toBeInstanceOf(BadRequestException);
      expect(accountsService.ban).not.toHaveBeenCalled();
    });
  });
});
