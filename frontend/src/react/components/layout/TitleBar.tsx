import { Minus, Square, X } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';

export function TitleBar({
  subtitle,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenSettings,
}: {
  subtitle: string;
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <header className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-nd-text-muted/15 bg-nd-bg/80 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex gap-1.5 pl-1">
          <span className="h-3 w-3 rounded-full bg-nd-danger/80" />
          <span className="h-3 w-3 rounded-full bg-nd-warning/80" />
          <span className="h-3 w-3 rounded-full bg-nd-success/80" />
        </div>
        <div className="h-5 w-px bg-nd-text-muted/15" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.32em] text-nd-text/90">NEURODECK</p>
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-nd-text-muted">{subtitle}</p>
        </div>
      </div>

      <div className="no-drag flex items-center gap-1.5">
        {onOpenCommandPalette && (
          <IconButton id="command-palette-btn" aria-label="Open command palette" onClick={onOpenCommandPalette}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-accent">K</span>
          </IconButton>
        )}
        {onOpenNotifications && (
          <IconButton id="notif-btn" aria-label="Open notifications" onClick={onOpenNotifications}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-text/90">B</span>
          </IconButton>
        )}
        {onOpenSettings && (
          <IconButton id="settings-btn" aria-label="Open settings" onClick={onOpenSettings}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-text/90">S</span>
          </IconButton>
        )}
        <IconButton aria-label="Minimize window" onClick={() => window.neurodeck?.window.minimize()}>
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="Maximize window" onClick={() => window.neurodeck?.window.maximizeToggle()}>
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton aria-label="Close window" className="hover:border-nd-danger/40 hover:bg-nd-danger/10 hover:text-nd-danger" onClick={() => window.neurodeck?.window.close()}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}
