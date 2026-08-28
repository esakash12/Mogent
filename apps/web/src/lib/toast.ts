export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(type: ToastType, title: string, options?: ToastOptions) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options?.duration ?? (type === "error" ? 5000 : 3500);

    const newToast: ToastItem = {
      id,
      type,
      title,
      description: options?.description,
      duration,
      createdAt: Date.now(),
    };

    this.toasts = [newToast, ...this.toasts].slice(0, 5);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(title: string, options?: ToastOptions) {
    return this.show("success", title, options);
  }

  error(title: string, options?: ToastOptions) {
    return this.show("error", title, options);
  }

  info(title: string, options?: ToastOptions) {
    return this.show("info", title, options);
  }

  warning(title: string, options?: ToastOptions) {
    return this.show("warning", title, options);
  }
}

export const toast = new ToastManager();
