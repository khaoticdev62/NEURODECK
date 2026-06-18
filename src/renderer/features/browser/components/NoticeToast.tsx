import type { Notice } from "../types";

interface NoticeToastProps {
  notice: Notice | null;
}

export function NoticeToast({ notice }: NoticeToastProps) {
  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute bottom-4 left-1/2 z-[var(--z-toast)] -translate-x-1/2 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-lg ${
        notice.kind === "ok"
          ? "border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success"
          : "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error"
      }`}
    >
      {notice.text}
    </div>
  );
}
