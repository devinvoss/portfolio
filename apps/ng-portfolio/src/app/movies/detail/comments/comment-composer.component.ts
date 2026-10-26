import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input, OnInit, output, signal, viewChild } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { COMMENT_MAX_LENGTH } from '@portfolio/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

// The character count appears once a comment gets near the limit.
const COUNTER_THRESHOLD = COMMENT_MAX_LENGTH - 200;

/** A textarea for writing a comment, reply or edit. Ctrl+Enter submits. */
@Component({
  selector: 'portfolio-comment-composer',
  templateUrl: './comment-composer.component.html',
  imports: [CdkTextareaAutosize, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentComposerComponent implements OnInit {
  private injector = inject(Injector);

  label = input('Add a comment');
  placeholder = input('Add a comment...');
  submitLabel = input('Post');
  initialValue = input('');
  busy = input(false);
  autofocus = input(false);
  cancellable = input(false);

  submitted = output<string>();
  cancelled = output<void>();

  readonly maxLength = COMMENT_MAX_LENGTH;
  private textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  text = signal('');
  canSubmit = computed(() => !this.busy() && this.text().trim().length > 0 && this.text() !== this.initialValue());
  showCounter = computed(() => this.text().length > COUNTER_THRESHOLD);

  ngOnInit(): void {
    this.text.set(this.initialValue());
    if (this.autofocus()) {
      afterNextRender(() => this.textarea().nativeElement.focus(), { injector: this.injector });
    }
  }

  submit() {
    if (this.canSubmit()) {
      this.submitted.emit(this.text().trim());
    }
  }

  /** Empties the box after a successful post. */
  clear() {
    this.text.set('');
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'Escape' && this.cancellable()) {
      this.cancelled.emit();
    }
  }
}
