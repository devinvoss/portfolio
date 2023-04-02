import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { Toast } from '@app/models';
import { ToastService } from '@app/services';
import { DestroyableComponent } from '../destroyable/destroyable.component';

@Component({
  selector: 'dvoss-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [
    trigger('trigger', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-100%)' }),
        animate('.1s', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('.1s', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent extends DestroyableComponent implements OnInit {
  items: Toast[] = [];

  constructor(private toastService: ToastService) {
    super();
  }

  ngOnInit(): void {
    this.toastService.addMessage$.pipe(this.takeUntilDestroyed).subscribe(toast => {
      if (!toast) return;
      this.items = [...this.items, toast];
      if (toast.duration !== 0) {
        setTimeout(() => this.removeItem(toast.id), toast.duration);
      }
    });

    this.toastService.removeMessage$.pipe(this.takeUntilDestroyed).subscribe(id => {
      if (!id) return;
      this.removeItem(id);
    });

    this.toastService.clearMessages$.pipe(this.takeUntilDestroyed).subscribe(() => {
      this.items = [];
    })
  }

  /** Removes the toast by Id. */
  removeItem(toastId: number) {
    const index = this.items.findIndex(x => x.id === toastId);
    if (index < 0) return;
    this.items = [
      ...this.items.slice(0, index),
      ...this.items.slice(index+1)
    ];
  }

  trackById(index: number, item: Toast): number {
    return item.id;
  }
}
