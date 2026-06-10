import { Bell, Gauge, Minus, Square, X, Zap } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';

interface TopStatusBarProps {
  modelName: string;
  persona: string;
  provider: string;
  latencyMs: number;
  contextUsed: number;
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

export function TitleBar({
  modelName,
  persona,
  provider,
  latencyMs,
  contextUsed,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenSettings,
}: TopStatusBarProps) {
  const contextColor = contextUsed > 80 ? 'danger' : contextUsed > 60 ? 'warning' : 'success';

  return (
    <header
      className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-nd-text-muted/15 bg-nd-bg/80 px-3 backdrop-blur-xl"
      role="banner"
    >
      {/* Left: wordmark + traffic lights */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex gap-1.5 pl-1" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-nd-danger/80" />
          <span className="h-3 w-3 rounded-full bg-nd-warning/80" />
          <span className="h-3 w-3 rounded-full bg-nd-success/80" />
        </div>
        <div className="h-5 w-px bg-nd-text-muted/15" aria-hidden="true" />
        <p className="shrink-0 text-xs font-bold uppercase tracking-[0.32em] text-nd-text/90">NEURODECK</p>
      </div>

      {/* Center: live status chips */}
      <div className="no-drag hidden items-center gap-2 sm:flex" aria-label="System status">
        <StatusChip icon={Zap} label={modelName} />
        <span className="text-nd-text-muted/30" aria-hidden="true">·</span>
        <StatusChip label={persona} />
        <span className="text-nd-text-muted/30" aria-hidden="true">·</span>
        <StatusChip icon={Gauge} label={`${latencyMs}ms`} />
        <span className="text-nd-text-muted/30" aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5 text-[11px]" aria-label={`Context: ${contextUsed}% used`}>
          <span className="text-nd-text-muted/70">ctx</span>
          <Badge tone={contextColor} aria-hidden="true">{contextUsed}%</Badge>
        </span>
        <span className="text-nd-text-muted/30" aria-hidden="true">·</span>
        <Badge tone={provider === 'offline-draft' ? 'neutral' : 'success'}>
          {provider === 'offline-draft' ? 'offline' : provider}
        </Badge>
      </div>

      {/* Right: action buttons + window chrome */}
      <div className="no-drag flex items-center gap-1.5">
        {onOpenCommandPalette && (
          <IconButton id="command-palette-btn" aria-label="Open command palette (Ctrl K)" onClick={onOpenCommandPalette}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-accent">K</span>
          </IconButton>
        )}
        {onOpenNotifications && (
          <IconButton id="notif-btn" aria-label="Open notifications" onClick={onOpenNotifications}>
            <Bell className="h-3.5 w-3.5" />
          </IconButton>
        )}
        {onOpenSettings && (
          <IconButton id="settings-btn" aria-label="Open settings" onClick={onOpenSettings}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-text/90">S</span>
          </IconButton>
        )}
        <div className="mx-1 h-4 w-px bg-nd-text-muted/15" aria-hidden="true" />
        <IconButton aria-label="Minimize window" onClick={() => window.neurodeck?.window.minimize()}>
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="Maximize window" onClick={() => window.neurodeck?.window.maximizeToggle()}>
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          aria-label="Close window"
          className="hover:border-nd-danger/40 hover:bg-nd-danger/10 hover:text-nd-danger"
          onClick={() => window.neurodeck?.window.close()}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}

function StatusChip({ icon: Icon, label }: { icon?: typeof Zap; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-nd-text-muted/80">
      {Icon && <Icon className="h-3 w-3 text-nd-accent" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
