import { useCallback, useEffect, useRef, useState } from "react";
import { Minimize2, X } from "lucide-react";
import { Button } from "../primitives/Button";

interface FocusModeOverlayProps {
  active: boolean;
  onExit: () => void;
  children: React.ReactNode;
}

const AUTO_HIDE_MS = 3000;

export function FocusModeOverlay({ active, onExit, children }: FocusModeOverlayProps) {
  const [headerVisible, setHeaderVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setHeaderVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    if (!active) return;
    resetTimer();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      resetTimer();
    };
    const handleMove = () => resetTimer();
    const handleController = (e: CustomEvent) => {
      if ((e.detail as { button?: string }).button === "b") onExit();
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchstart", handleMove);
    window.addEventListener("nd:controller-button", handleController as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchstart", handleMove);
      window.removeEventListener("nd:controller-button", handleController as EventListener);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active, onExit, resetTimer]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-nd-bg"
      data-testid="focus-mode-overlay"
      aria-label="Focus mode"
      role="region"
    >
      {/* Compact header — auto-hides after 3s of inactivity */}
      <div
        className={`flex h-10 shrink-0 items-center justify-between gap-3 border-b border-nd-border-subtle/50 bg-nd-surface-secondary/60 px-4 backdrop-blur transition-all duration-300 ${
          headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        aria-hidden={!headerVisible}
      >
        <div className="flex items-center gap-2">
          <Minimize2 className="h-3.5 w-3.5 text-nd-accent-primary" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
            Focus Mode
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onExit}
          aria-label="Exit focus mode (Escape)"
        >
          Exit
        </Button>
      </div>

      {/* Content area — fills remaining height */}
      <div className="min-h-0 flex-1 overflow-hidden" onClick={resetTimer}>
        {children}
      </div>

      {/* Keyboard hint — subtle, bottom-right */}
      {headerVisible && (
        <div
          className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg border border-nd-border-subtle/50 bg-nd-surface-secondary/40 px-2.5 py-1.5 text-xs text-nd-text-muted backdrop-blur"
          aria-hidden
        >
          <kbd className="rounded border border-nd-border-subtle bg-nd-surface-secondary/60 px-1 font-mono text-xs">
            Esc
          </kbd>
          to exit · B on controller
        </div>
      )}
    </div>
  );
}
