import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MovieComment, SessionUser } from '@portfolio/models';
import { CommentComponent } from './comment.component';

const sam: SessionUser = { id: 'm1', role: 'member', displayName: 'Sam' };
const alex: SessionUser = { id: 'm2', role: 'member', displayName: 'Alex' };
const admin: SessionUser = { id: 'a1', role: 'admin', displayName: 'Devin' };

const comment: MovieComment = {
  id: 'c1',
  movieId: 'movie1',
  author: { id: sam.id, role: 'member', displayName: 'Sam' },
  body: 'Great <b>movie</b>',
  deleted: false,
  createdDate: new Date().toISOString(),
  likeCount: 2,
  likedByMe: false
};

describe('CommentComponent', () => {
  let component: CommentComponent;
  let fixture: ComponentFixture<CommentComponent>;
  let http: HttpTestingController;
  let changes: MovieComment[];

  const render = (user: SessionUser | null, value: MovieComment = comment) => {
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('comment', value);
    fixture.detectChanges();
  };
  const buttons = () => [...fixture.nativeElement.querySelectorAll('button')].map((b: HTMLButtonElement) => b.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommentComponent);
    component = fixture.componentInstance;
    changes = [];
    component.changed.subscribe(c => changes.push(c));
  });

  afterEach(() => http.verify());

  it('shows the body as plain text', () => {
    render(null);
    expect(fixture.nativeElement.querySelector('.comment-body').textContent).toContain('Great <b>movie</b>');
    expect(fixture.nativeElement.querySelector('.comment-body b')).toBeNull();
  });

  it('gives the author edit and delete', () => {
    render(sam);
    expect(buttons()).toEqual(expect.arrayContaining(['Reply', 'Edit', 'Delete']));
    expect(buttons()).not.toContain('Ban');
  });

  it('gives other members reply only', () => {
    render(alex);
    expect(buttons()).toContain('Reply');
    expect(buttons()).not.toContain('Edit');
    expect(buttons()).not.toContain('Delete');
  });

  it('gives the admin delete and ban, but not edit', () => {
    render(admin);
    expect(buttons()).toEqual(expect.arrayContaining(['Delete', 'Ban']));
    expect(buttons()).not.toContain('Edit');
  });

  it('shows the author badge on the admin\'s comments', () => {
    render(null, { ...comment, author: { id: admin.id, role: 'admin', displayName: 'Devin' } });
    expect(fixture.nativeElement.querySelector('.author-badge')?.textContent).toBe('Author');
  });

  it('likes optimistically, then settles on the server count', () => {
    render(alex);
    component.toggleLike();
    expect(changes[0]).toEqual(expect.objectContaining({ likedByMe: true, likeCount: 3 }));

    http.expectOne({ method: 'PUT', url: 'api/comments/c1/like' }).flush({ likeCount: 5, likedByMe: true });
    expect(changes[1]).toEqual(expect.objectContaining({ likedByMe: true, likeCount: 5 }));
  });

  it('rolls a like back when it fails', () => {
    render(alex);
    component.toggleLike();
    http.expectOne('api/comments/c1/like').flush(null, { status: 500, statusText: 'Error' });
    expect(changes.at(-1)).toEqual(comment);
  });

  it('sends signed-out people to sign in when they like', () => {
    render(null);
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.toggleLike();
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('deletes only after confirming', () => {
    render(sam);
    let removed = false;
    component.removed.subscribe(() => removed = true);

    component.confirming.set('delete');
    fixture.detectChanges();
    http.expectNone('api/comments/c1');

    component.confirmDelete();
    http.expectOne({ method: 'DELETE', url: 'api/comments/c1' }).flush(null);
    expect(removed).toBe(true);
  });
});
