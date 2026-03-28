import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  errorCode?: string;
  retryFn?: () => void;
}

// Global toast state management
const toastListeners: Set<(toast: ToastMessage) => void> = new Set();
let toastIdCounter = 0;

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration = 5000,
  options?: { errorCode?: string; retryFn?: () => void }
) {
  const id = `toast-${++toastIdCounter}`;
  const toast: ToastMessage = { id, type, message, duration, ...options };
  toastListeners.forEach((listener) => listener(toast));
  return id;
}

export function showSuccess(message: string) {
  return showToast(message, 'success');
}

export function showError(
  message: string,
  errorCode?: string,
  retryFn?: () => void
) {
  return showToast(message, 'error', 7000, { errorCode, retryFn });
}

export function showInfo(message: string) {
  return showToast(message, 'info');
}

export function showWarning(message: string) {
  return showToast(message, 'warning', 6000);
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast]);

      if (toast.duration) {
        const timeout = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration);

        return () => clearTimeout(timeout);
      }
    };

    toastListeners.add(handleToast);
    return () => {
      toastListeners.delete(handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <SingleToast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function SingleToast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  }[toast.type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
  }[toast.type];

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
  }[toast.type];

  return (
    <div
      className={`border rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-right-full duration-300 ${bgColor}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 flex flex-col gap-2">
        <p className={`text-sm font-medium ${textColor}`}>{toast.message}</p>
        {toast.errorCode && (
          <code className="text-xs text-gray-500 bg-white bg-opacity-50 px-2 py-1 rounded font-mono">
            {toast.errorCode}
          </code>
        )}
        {toast.retryFn && (
          <button
            onClick={() => {
              toast.retryFn?.();
              onClose();
            }}
            className={`text-xs underline flex items-center gap-1 hover:opacity-70 transition-opacity ${textColor}`}
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className={`flex-shrink-0 mt-0.5 ${textColor} hover:opacity-70 transition-opacity`}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastContainer;
