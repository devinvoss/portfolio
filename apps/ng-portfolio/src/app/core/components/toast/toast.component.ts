import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Toast } from '@app/models';
import { ToastService } from '@app/services';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'dvoss-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  imports: [MatIcon]
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  items = signal<Toast[]>([]);

  ngOnInit(): void {
    this.toastService.addMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(toast => {
      if (!toast) return;
      this.items.update(items => [...items, toast]);
      if (toast.duration !== 0) {
        setTimeout(() => this.removeItem(toast.id), toast.duration);
      }
    });

    this.toastService.removeMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
      if (!id) return;
      this.removeItem(id);
    });

    this.toastService.clearMessages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.items.set([]);
    })
  }

  /** Removes the toast by Id. */
  removeItem(toastId: number) {
    this.items.update(items => items.filter(x => x.id !== toastId));
  }
}
