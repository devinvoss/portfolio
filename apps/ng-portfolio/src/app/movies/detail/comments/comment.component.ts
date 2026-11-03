import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CommentService, ToastService } from '@app/services';
import { MovieComment, SessionUser } from '@portfolio/models';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CommentComposerComponent } from './comment-composer.component';

type Confirming = 'delete' | 'ban' | null;

/** One comment or reply. It makes its own API calls and reports the outcome to the thread. */
@Component({
  selector: 'portfolio-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  imports: [MatIcon, DatePipe, TimeAgoPipe, CommentComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentComponent {
  private commentService = inject(CommentService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private location = inject(Location);

  comment = input.required<MovieComment>();
  user = input<SessionUser | null>(null);
  highlighted = input(false);

  replyRequested = output<void>();
  changed = output<MovieComment>();
  removed = output<void>();
  banned = output<void>();

  editing = signal(false);
  confirming = signal<Confirming>(null);
  busy = signal(false);

  isMine = computed(() => {
    const { author } = this.comment();
    const user = this.user();
    return !!user && !!author && author.id === user.id && author.role === user.role;
  });
  isAdmin = computed(() => this.user()?.role === 'admin');
  canDelete = computed(() => this.isMine() || this.isAdmin());
  canBan = computed(() => this.isAdmin() && this.comment().author?.role === 'member');
  initial = computed(() => this.comment().author?.displayName.charAt(0).toUpperCase() || '?');

  toggleLike() {
    if (!this.user()) {
      this.router.navigate(['/login'], { queryParams: { returnTo: this.location.path(true) } });
      return;
    }

    // Shows the change straight away, then settles on the server's count.
    const before = this.comment();
    const liked = !before.likedByMe;
    this.changed.emit({ ...before, likedByMe: liked, likeCount: before.likeCount + (liked ? 1 : -1) });
    this.commentService.setLiked(before.id, liked).subscribe({
      next: result => this.changed.emit({ ...this.comment(), ...result }),
      error: () => {
        this.changed.emit(before);
        this.toastService.error('Your like could not be saved.');
      }
    });
  }

  saveEdit(body: string) {
    this.busy.set(true);
    this.commentService.editComment(this.comment().id, body).subscribe({
      next: updated => {
        this.busy.set(false);
        this.editing.set(false);
        this.changed.emit({ ...this.comment(), body: updated.body, editedDate: updated.editedDate });
      },
      error: () => {
        this.busy.set(false);
        this.toastService.error('Your comment could not be saved.');
      }
    });
  }

  confirmDelete() {
    this.busy.set(true);
    this.commentService.deleteComment(this.comment().id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirming.set(null);
        this.removed.emit();
      },
      error: () => {
        this.busy.set(false);
        this.toastService.error('The comment could not be deleted.');
      }
    });
  }

  confirmBan() {
    const name = this.comment().author?.displayName;
    this.busy.set(true);
    this.commentService.banAuthor(this.comment().id).subscribe({
      next: ({ removedComments }) => {
        this.busy.set(false);
        this.confirming.set(null);
        this.toastService.success(`${name} was banned and ${removedComments} ${removedComments === 1 ? 'comment was' : 'comments were'} removed.`);
        this.banned.emit();
      },
      error: () => {
        this.busy.set(false);
        this.toastService.error(`${name} could not be banned.`);
      }
    });
  }
}
