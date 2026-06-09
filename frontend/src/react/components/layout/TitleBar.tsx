import { Minus, Square, X } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';

export function TitleBar({ subtitle }: { subtitle: string }) {
  return (
    <header className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-blacksite/80 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex gap-1.5 pl-1">
          <span className="h-3 w-3 rounded-full bg-danger/80" />
          <span className="h-3 w-3 rounded-full bg-warning/80" />
          <span className="h-3 w-3 rounded-full bg-success/80" />
        </div>
        <div className="h-5 w-px bg-white/10" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.32em] text-slate-200">NEURODECK</p>
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="no-drag flex items-center gap-1.5">
        <IconButton aria-label="Minimize window" onClick={() => window.neurodeck?.window.minimize()}>
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="Maximize window" onClick={() => window.neurodeck?.window.maximizeToggle()}>
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton aria-label="Close window" className="hover:border-danger/40 hover:bg-danger/10 hover:text-danger" onClick={() => window.neurodeck?.window.close()}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}
