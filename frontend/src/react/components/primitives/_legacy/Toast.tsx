import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "info" | "success" | "warning" | "error";

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

const toneConfig: Record<ToastTone, { icon: ReactNode; classes: string }> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    classes: "border-nd-accent-primary/25 bg-nd-accent-primary/10 text-nd-accent-primary",
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    classes: "border-nd-accent-success/25 bg-nd-accent-success/10 text-nd-accent-success",
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    classes: "border-nd-accent-warning/25 bg-nd-accent-warning/10 text-nd-accent-warning",
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    classes: "border-nd-accent-error/25 bg-nd-accent-error/10 text-nd-accent-error",
  },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { icon, classes } = toneConfig[item.tone];
  const messageId = useId();

  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => clearTimeout(t);
  }, [item.id, item.durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-panel",
        "animate-view-enter",
        classes,
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span id={messageId} className="flex-1 leading-relaxed">
        {item.message}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        aria-describedby={messageId}
        onClick={() => onDismiss(item.id)}
        className="ml-1 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
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
        className="fixed bottom-20 right-4 z-[var(--z-toast)] flex w-80 flex-col gap-2 lg:bottom-4"
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
