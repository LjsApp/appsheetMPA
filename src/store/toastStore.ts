import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto remove after duration
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 3500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// ─── Standalone toast (works OUTSIDE React components / in mutation callbacks) ───
// Calls the store directly without using hooks, so it never has stale closure issues.
export const toast = {
  success: (message: string) =>
    useToastStore.getState().addToast({ type: 'success', message }),
  error: (message: string) =>
    useToastStore.getState().addToast({ type: 'error', message, duration: 5000 }),
  warning: (message: string) =>
    useToastStore.getState().addToast({ type: 'warning', message }),
  info: (message: string) =>
    useToastStore.getState().addToast({ type: 'info', message }),
};

// Convenience hook (still available for components that prefer hooks)
export function useToast() {
  return toast;
}
