import { MovieComment } from '@portfolio/models';
import { addReplyPage, postErrorMessage, removeComment, replaceComment, replyPlaceholder, toThreadView } from './threads';

function comment(id: string, extra: Partial<MovieComment> = {}): MovieComment {
  return {
    id,
    movieId: 'm1',
    author: { id: 'a', role: 'member', displayName: 'Ann' },
    body: `body ${id}`,
    deleted: false,
    createdDate: '2026-11-19T00:00:00Z',
    likeCount: 0,
    likedByMe: false,
    ...extra
  };
}

describe('toThreadView', () => {
  it('counts the replies that are still on the server', () => {
    const thread = toThreadView(comment('c1', { replies: [comment('r1', { parentId: 'c1' })], replyCount: 3 }));
    expect(thread.replies.map(reply => reply.id)).toEqual(['r1']);
    expect(thread.hiddenReplies).toBe(2);
    expect(thread.cursor).toBe('r1');
    expect('replies' in thread.comment).toBe(false);
  });
});

describe('addReplyPage', () => {
  it('merges replies already shown and keeps them in posting order', () => {
    const thread = { ...toThreadView(comment('c1', { replies: [comment('r1')], replyCount: 4 })), replies: [comment('r1'), comment('r9')] };
    const next = addReplyPage(thread, { replies: [comment('r2'), comment('r9')], hasMore: false });
    expect(next.replies.map(reply => reply.id)).toEqual(['r1', 'r2', 'r9']);
    expect(next.hiddenReplies).toBe(0);
  });

  it('keeps at least one hidden reply while the server has more', () => {
    const thread = toThreadView(comment('c1', { replyCount: 2 }));
    expect(addReplyPage(thread, { replies: [comment('r1'), comment('r2')], hasMore: true }).hiddenReplies).toBe(1);
  });
});

describe('replaceComment', () => {
  it('replaces the thread comment or a reply', () => {
    const thread = toThreadView(comment('c1', { replies: [comment('r1')], replyCount: 1 }));
    expect(replaceComment(thread, comment('c1', { body: 'edited' })).comment.body).toBe('edited');
    expect(replaceComment(thread, comment('r1', { likeCount: 2 })).replies[0].likeCount).toBe(2);
  });
});

describe('removeComment', () => {
  it('leaves a placeholder for a comment with replies', () => {
    const thread = toThreadView(comment('c1', { replies: [comment('r1')], replyCount: 1 }));
    const next = removeComment(thread, 'c1');
    expect(next?.comment.deleted).toBe(true);
    expect(next?.comment.author).toBeNull();
  });

  it('removes a thread without replies', () => {
    expect(removeComment(toThreadView(comment('c1')), 'c1')).toBeNull();
  });

  it('removes a placeholder with its last reply', () => {
    const thread = { ...toThreadView(comment('c1', { replies: [comment('r1')], replyCount: 1 })), comment: comment('c1', { deleted: true }) };
    expect(removeComment(thread, 'r1')).toBeNull();
  });

  it('keeps the thread when another reply goes', () => {
    const thread = toThreadView(comment('c1', { replies: [comment('r1'), comment('r2')], replyCount: 2 }));
    expect(removeComment(thread, 'r1')?.replies.map(reply => reply.id)).toEqual(['r2']);
  });
});

describe('replyPlaceholder', () => {
  it('mentions the person when replying to a reply', () => {
    expect(replyPlaceholder(comment('r1', { parentId: 'c1' }))).toBe('Reply to @Ann...');
    expect(replyPlaceholder(comment('c1'))).toBe('Add a reply...');
  });
});

describe('postErrorMessage', () => {
  it.each([
    [429, 'You are commenting too quickly. Please wait a minute and try again.'],
    [404, 'That comment no longer exists.'],
    [401, 'Please sign in again to comment.'],
    [500, 'Your comment could not be posted.']
  ])('%p', (status, message) => {
    expect(postErrorMessage(status)).toBe(message);
  });
});
