import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Toast as DSToast, type ToastTone } from "../../../design-system/components/feedback/Toast";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => clearTimeout(t);
  }, [item.id, item.durationMs, onDismiss]);

  return (
    <DSToast
      tone={item.tone}
      message={item.message}
      onClose={() => onDismiss(item.id)}
      role="status"
    />
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "info", durationMs = 4000) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, tone, durationMs }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-20 right-4 z-[var(--z-toast-peak)] flex w-80 flex-col gap-2 lg:bottom-4"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
