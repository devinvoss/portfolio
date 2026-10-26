import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UserService } from '@app/services';
import { CommentPage, MovieComment, SessionUser } from '@portfolio/models';
import { CommentsComponent, toThreadView } from './comments.component';

const sam: SessionUser = { id: 'm1', role: 'member', displayName: 'Sam' };

const makeComment = (id: string, extra: Partial<MovieComment> = {}): MovieComment => ({
  id,
  movieId: 'movie1',
  author: { id: sam.id, role: 'member', displayName: 'Sam' },
  body: `Comment ${id}`,
  deleted: false,
  createdDate: '2026-10-26T12:00:00.000Z',
  likeCount: 0,
  likedByMe: false,
  ...extra
});

describe('CommentsComponent', () => {
  let component: CommentsComponent;
  let fixture: ComponentFixture<CommentsComponent>;
  let http: HttpTestingController;

  const setUp = async (focusCommentId: string | null = null) => {
    await TestBed.configureTestingModule({
      imports: [CommentsComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    TestBed.inject(UserService).user$.next(sam);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('movieId', 'movie1');
    fixture.componentRef.setInput('focusCommentId', focusCommentId);
    fixture.detectChanges();
  };

  const flushPage = (page: Partial<CommentPage>) =>
    http.expectOne(req => req.url === 'api/movie/movie1/comments').flush({ comments: [], hasMore: false, totalCount: 0, ...page });

  afterEach(() => http.verify());

  it('shows the loaded threads', async () => {
    await setUp();
    flushPage({ comments: [makeComment('c2', { replies: [makeComment('r1', { parentId: 'c2' })], replyCount: 4 })], totalCount: 5 });

    expect(component.threads()).toHaveLength(1);
    expect(component.threads()[0].hiddenReplies).toBe(3);
    expect(component.totalCount()).toBe(5);
  });

  it('pins the thread a notification points at above the rest', async () => {
    await setUp('r9');
    const pinned = makeComment('c1', { replies: [makeComment('r9', { parentId: 'c1' })], replyCount: 1 });
    flushPage({ comments: [makeComment('c3'), makeComment('c1')] });
    http.expectOne('api/comments/r9/thread').flush(pinned);

    expect(component.threads().map(t => t.comment.id)).toEqual(['c1', 'c3']);
    expect(component.highlightId()).toBe('r9');
  });

  it('adds a new comment to the top', async () => {
    await setUp();
    flushPage({ comments: [makeComment('c1')], totalCount: 1 });

    component.post('Hello');
    const req = http.expectOne({ method: 'POST', url: 'api/movie/movie1/comments' });
    expect(req.request.body).toEqual({ body: 'Hello', replyToCommentId: undefined });
    req.flush(makeComment('c2', { replies: [], replyCount: 0 }));

    expect(component.threads().map(t => t.comment.id)).toEqual(['c2', 'c1']);
    expect(component.totalCount()).toBe(2);
  });

  it('files a reply to a reply under the same thread', async () => {
    await setUp();
    const reply = makeComment('r1', { parentId: 'c1' });
    flushPage({ comments: [makeComment('c1', { replies: [reply], replyCount: 1 })], totalCount: 2 });

    component.startReply(component.threads()[0], reply);
    component.postReply('Agreed');
    const req = http.expectOne({ method: 'POST', url: 'api/movie/movie1/comments' });
    expect(req.request.body.replyToCommentId).toBe('r1');
    req.flush(makeComment('r2', { parentId: 'c1', replyTo: { displayName: 'Sam' } }));

    expect(component.threads()[0].replies.map(r => r.id)).toEqual(['r1', 'r2']);
    expect(component.replyingTo()).toBeNull();
  });

  it('merges loaded replies with ones posted here, in order', async () => {
    await setUp();
    flushPage({ comments: [makeComment('c1', { replies: [makeComment('r1', { parentId: 'c1' })], replyCount: 3 })] });
    const thread = component.threads()[0];
    component.threads.set([{ ...thread, replies: [...thread.replies, makeComment('r9', { parentId: 'c1' })] }]);

    component.loadMoreReplies(component.threads()[0]);
    http.expectOne(req => req.url === 'api/comments/c1/replies' && req.params.get('after') === 'r1')
      .flush({ replies: [makeComment('r2', { parentId: 'c1' }), makeComment('r3', { parentId: 'c1' })], hasMore: false });

    expect(component.threads()[0].replies.map(r => r.id)).toEqual(['r1', 'r2', 'r3', 'r9']);
    expect(component.threads()[0].hiddenReplies).toBe(0);
  });

  describe('removing comments', () => {
    it('keeps a placeholder for a comment with replies', async () => {
      await setUp();
      const top = makeComment('c1', { replies: [makeComment('r1', { parentId: 'c1' })], replyCount: 1 });
      flushPage({ comments: [top], totalCount: 2 });

      component.onCommentRemoved(component.threads()[0], component.threads()[0].comment);

      expect(component.threads()[0].comment).toEqual(expect.objectContaining({ deleted: true, author: null, body: '' }));
      expect(component.totalCount()).toBe(1);
    });

    it('drops the placeholder with its last reply', async () => {
      await setUp();
      const reply = makeComment('r1', { parentId: 'c1' });
      flushPage({ comments: [makeComment('c1', { deleted: true, author: null, replies: [reply], replyCount: 1 })] });

      component.onCommentRemoved(component.threads()[0], reply);

      expect(component.threads()).toEqual([]);
    });
  });
});

describe('toThreadView', () => {
  it('counts the replies that still need loading', () => {
    const view = toThreadView(makeComment('c1', { replies: [makeComment('r1'), makeComment('r2')], replyCount: 5 }));
    expect(view.hiddenReplies).toBe(3);
    expect(view.cursor).toBe('r2');
    expect('replies' in view.comment).toBe(false);
  });
});
