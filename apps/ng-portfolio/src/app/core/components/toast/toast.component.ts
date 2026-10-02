import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Toast } from '@app/models';
import { ToastService } from '@app/services';
import { DestroyableComponent } from '../destroyable/destroyable.component';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'dvoss-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon]
})
export class ToastComponent extends DestroyableComponent implements OnInit {
  private toastService = inject(ToastService);

  items = signal<Toast[]>([]);

  ngOnInit(): void {
    this.toastService.addMessage$.pipe(this.takeUntilDestroyed).subscribe(toast => {
      if (!toast) return;
      this.items.update(items => [...items, toast]);
      if (toast.duration !== 0) {
        setTimeout(() => this.removeItem(toast.id), toast.duration);
      }
    });

    this.toastService.removeMessage$.pipe(this.takeUntilDestroyed).subscribe(id => {
      if (!id) return;
      this.removeItem(id);
    });

    this.toastService.clearMessages$.pipe(this.takeUntilDestroyed).subscribe(() => {
      this.items.set([]);
    })
  }

  /** Removes the toast by Id. */
  removeItem(toastId: number) {
    this.items.update(items => items.filter(x => x.id !== toastId));
  }
}
