import { create } from 'zustand';

export type ToastKind = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
  /** Milliseconds; 0 keeps it until closed. */
  duration: number;
}

interface ToastState {
  items: Toast[];
}

export const useToasts = create<ToastState>(() => ({ items: [] }));

let nextId = 0;

function create_(kind: ToastKind) {
  return (message: string, title = '', duration = 10000): Toast => {
    const toast: Toast = { id: ++nextId, kind, title, message, duration };
    useToasts.setState(state => ({ items: [...state.items, toast] }));
    if (duration !== 0) {
      setTimeout(() => toastService.remove(toast.id), duration);
    }
    return toast;
  };
}

/** ng-portfolio's ToastService. */
export const toastService = {
  success: create_('success'),
  warning: create_('warning'),
  error: create_('error'),
  info: create_('info'),
  remove(id: number) {
    useToasts.setState(state => ({ items: state.items.filter(item => item.id !== id) }));
  },
  clear() {
    useToasts.setState({ items: [] });
  }
};
