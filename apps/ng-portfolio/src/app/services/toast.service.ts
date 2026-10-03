import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { IToast, Toast } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private id = 0;

  /** Pushes a Toast to be added. */
  addMessage$: ReplaySubject<Toast> = new ReplaySubject<Toast>();
  /** Pushes a Toast Id to be removed. */
  removeMessage$: ReplaySubject<number> = new ReplaySubject<number>();
  /** Request for all messages to be cleared. */
  clearMessages$: ReplaySubject<void> = new ReplaySubject<void>();


  /** Creates a toast message.
   * @param message Message to be displayed.
   * @param title Title of the message.
   * @param duration Numeric value in milliseconds determining how long the message will be visible.
   */
  success(message: string, title = '', duration = 10000): Toast {
    const toast: IToast = {
      title,
      message,
      duration,
      class: 'success',
      icon: 'check_circle'
    };
    return this.create(toast);
  }

  /** Creates a toast message.
   * @param message Message to be displayed.
   * @param title Title of the message.
   * @param duration Numeric value in milliseconds determining how long the message will be visible.
   */
   warning(message: string, title = '', duration = 10000): Toast {
    const toast: IToast = {
      title,
      message,
      duration,
      class: 'warning',
      icon: 'warning'
    };
    return this.create(toast);
  }

  /** Creates a toast message.
   * @param message Message to be displayed.
   * @param title Title of the message.
   * @param duration Numeric value in milliseconds determining how long the message will be visible.
   */
  error(message: string, title = '', duration = 10000): Toast {
    const toast: IToast = {
      title,
      message,
      duration,
      class: 'error',
      icon: 'error'
    };
    return this.create(toast);
  }

  /** Creates a toast message.
   * @param message Message to be displayed.
   * @param title Title of the message.
   * @param duration Numeric value in milliseconds determining how long the message will be visible.
   */
   info(message: string, title = '', duration = 10000): Toast {
    const toast: IToast = {
      title,
      message,
      duration,
      class: 'info',
      icon: 'info'
    };
    return this.create(toast);
  }

  /** Removes a message manually by id. */
  remove(id: number) {
    this.removeMessage$.next(id);
  }

  /** Clear all messages. */
  clear() {
    this.clearMessages$.next();
  }

  /** Create a message. */
  create(toast: IToast): Toast {
    const model: Toast = new Toast(toast);
    model.id = this.generateId();
    this.addMessage$.next(model);
    return model;
  }

  private generateId(): number {
    this.id++;
    return this.id;
  }
}
