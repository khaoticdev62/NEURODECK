import { Minus, Square, X } from "lucide-react";
import { IconButton } from "../primitives/IconButton";
import { useBridgeStatus } from "../../hooks/useBridgeStatus";

const STATUS_CONFIG = {
  connected: {
    label: "Backend connected",
    className: "bg-[var(--nd-accent-success)]",
  },
  connecting: {
    label: "Backend connecting…",
    className: "animate-pulse bg-[var(--nd-accent-warning)]",
  },
  disconnected: {
    label: "Backend disconnected",
    className: "bg-[var(--nd-accent-error)]",
  },
} as const;

function BridgeStatusDot() {
  const status = useBridgeStatus();
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={`pointer-events-auto inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
    />
  );
}

export function TitleBar({ subtitle }: { subtitle: string }) {
  return (
    <header
      role="banner"
      className="drag-region flex h-10 shrink-0 items-center justify-between border-b border-nd-border-subtle bg-gradient-to-r from-[var(--nd-surface-primary)] via-[var(--nd-surface-primary)] to-[var(--nd-surface-secondary)] backdrop-blur-[var(--nd-glass-blur,12px)] px-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="no-drag group flex gap-1.5 pl-1" aria-hidden="true">
          <span className="h-2.5 w-5 rounded-full bg-[var(--nd-accent-error)]/80 transition-opacity duration-[var(--nd-motion-fast)]" />
          <span className="h-2.5 w-5 rounded-full bg-[var(--nd-accent-warning)]/80 transition-opacity duration-[var(--nd-motion-fast)]" />
          <span className="h-2.5 w-5 rounded-full bg-[var(--nd-accent-success)]/80 transition-opacity duration-[var(--nd-motion-fast)]" />
        </div>
        <div className="h-5 w-px bg-[var(--nd-border-subtle)]" />
        <div className="min-w-0 flex items-center gap-2">
          <div>
            <p className="truncate text-xs font-bold uppercase tracking-[var(--nd-tracking-wordmark)] text-[var(--nd-text-primary)] drop-shadow-[0_0_20px_rgba(94,235,255,0.3)]">
              NEURODECK
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[var(--nd-text-muted)]">
              {subtitle}
            </p>
          </div>
          <BridgeStatusDot />
        </div>
      </div>

      <div className="no-drag flex items-center gap-1">
        <IconButton
          aria-label="Minimize window"
          variant="ghost"
          size="md"
          onClick={() => window.neurodeck?.window?.minimize?.()}
        >
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton
          aria-label="Maximize window"
          variant="ghost"
          size="md"
          onClick={() => window.neurodeck?.window?.maximizeToggle?.()}
        >
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          aria-label="Close window"
          variant="danger"
          size="md"
          onClick={() => window.neurodeck?.window?.close?.()}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}
