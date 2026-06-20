import { Minus, Square, X } from "lucide-react";
import { IconButton } from "../primitives/IconButton";
import { BrandLogo } from "../primitives/BrandLogo";
import { useBridgeStatus } from "../../hooks/useBridgeStatus";

const STATUS_CONFIG = {
  connected: {
    label: "Backend connected",
    className: "border-[var(--nd-accent-success)]/30 bg-[var(--nd-surface-success)] text-[var(--nd-text-success)]",
  },
  connecting: {
    label: "Backend connecting…",
    className: "border-[var(--nd-accent-warning)]/30 bg-[var(--nd-surface-warning)] text-[var(--nd-text-warning)]",
  },
  disconnected: {
    label: "Backend disconnected",
    className: "border-[var(--nd-accent-error)]/30 bg-[var(--nd-surface-error)] text-[var(--nd-text-danger)]",
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
      className={`pointer-events-auto inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label.replace("Backend ", "")}
    </span>
  );
}

export function TitleBar({ subtitle }: { subtitle: string }) {
  return (
    <header
      role="banner"
      className="drag-region flex h-12 shrink-0 items-center justify-between border-b border-nd-border-subtle bg-[var(--nd-surface-sidebar)] px-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo className="h-7 w-7 shrink-0" aria-hidden />
        <div className="h-5 w-px bg-[var(--nd-border-subtle)]" />
        <div className="min-w-0 flex items-center gap-2">
          <div>
            <p className="truncate font-display text-xs font-bold uppercase tracking-[var(--nd-tracking-wordmark)] text-[var(--nd-text-primary)]">
              NEURODECK
            </p>
            <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--nd-text-muted)]">
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
          size="touch"
          onClick={() => window.neurodeck?.window?.minimize?.()}
        >
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton
          aria-label="Maximize window"
          variant="ghost"
          size="touch"
          onClick={() => window.neurodeck?.window?.maximizeToggle?.()}
        >
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          aria-label="Close window"
          variant="danger"
          size="touch"
          onClick={() => window.neurodeck?.window?.close?.()}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}
