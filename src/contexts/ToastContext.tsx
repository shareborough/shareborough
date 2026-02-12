import { createContext, useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ToastItem {
  id: string;
  type: "error" | "success" | "warning" | "info";
  title: string;
  message?: string;
  duration: number; // ms, 0 = sticky
}

export interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${++nextId}`;
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }];
        // Remove oldest if over max
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      if (toast.duration > 0) {
        setTimeout(() => removeToast(id), toast.duration);
      }
      return id;
    },
    [removeToast],
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message, duration: 8000 });
    },
    [addToast],
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message, duration: 4000 });
    },
    [addToast],
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message, duration: 6000 });
    },
    [addToast],
  );

  const value: ToastContextValue = { addToast, removeToast, showError, showSuccess, showWarning };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(<ToastContainer toasts={toasts} onDismiss={removeToast} />, document.body)}
    </ToastContext.Provider>
  );
}

/* ---------- Toast rendering ---------- */

const TYPE_STYLES: Record<ToastItem["type"], { border: string; icon: string; iconColor: string }> = {
  error: { border: "border-l-red-500", icon: "!", iconColor: "text-red-600 bg-red-100" },
  success: { border: "border-l-green-500", icon: "\u2713", iconColor: "text-green-600 bg-green-100" },
  warning: { border: "border-l-amber-500", icon: "\u26A0", iconColor: "text-amber-600 bg-amber-100" },
  info: { border: "border-l-sage-500", icon: "i", iconColor: "text-sage-600 bg-sage-100" },
};

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 ${style.border} p-3 animate-toast-in`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.iconColor}`}
              >
                {style.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm shrink-0 p-0.5"
                aria-label="Dismiss"
              >
                &#x2715;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
