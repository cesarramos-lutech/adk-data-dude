// utils/ToastManager.ts

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastPayload = {
  message: string;
  type?: ToastType;
  durationMs?: number;
  action?: ToastAction;
};

type ToastListener = (payload: ToastPayload) => void;

class ToastManager {
  private listener: ToastListener | null = null;

  // React component will call this to subscribe
  register(listener: ToastListener) {
    this.listener = listener;
  }

  // React component calls this to unsubscribe
  unregister() {
    this.listener = null;
  }

  // Service files call this to show a notification
  show(messageOrPayload: string | ToastPayload, type: ToastType = 'info') {
    const payload: ToastPayload =
      typeof messageOrPayload === 'string'
        ? { message: messageOrPayload, type }
        : {
            message: messageOrPayload.message,
            type: messageOrPayload.type ?? 'info',
            durationMs: messageOrPayload.durationMs,
            action: messageOrPayload.action,
          };
    if (this.listener) {
      this.listener(payload);
    } else {
      console.warn('ToastManager: Message missed (no listener):', payload.message);
    }
  }
}

export const toastManager = new ToastManager();