import { Minus, Square, X } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';

export function TitleBar({ subtitle }: { subtitle: string }) {
  return (
    <header
      className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-[var(--nd-border-subtle)] bg-[var(--nd-surface-primary)] px-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="no-drag flex gap-1.5 pl-1">
          <span className="h-3 w-3 rounded-full bg-[var(--nd-accent-error)]/80" />
          <span className="h-3 w-3 rounded-full bg-[var(--nd-accent-warning)]/80" />
          <span className="h-3 w-3 rounded-full bg-[var(--nd-accent-success)]/80" />
        </div>
        <div className="h-5 w-px bg-[var(--nd-border-subtle)]" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[var(--nd-tracking-wordmark)] text-[var(--nd-text-primary)]">
            NEURODECK
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[var(--nd-text-muted)]">
            {subtitle}
          </p>
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
