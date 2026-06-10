import { Database, Pin } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import type { MemoryItem, MemoryScope } from '../../types/neurodeck';

interface MemoryPanelProps {
  memories: MemoryItem[];
  onTogglePin?: (id: string) => void;
  maxItems?: number;
  compact?: boolean;
}

const scopeTone: Record<MemoryScope, 'accent' | 'success' | 'neutral'> = {
  Global:  'accent',
  Project: 'success',
  Session: 'neutral',
};

export function MemoryPanel({ memories, onTogglePin, maxItems = 6, compact = false }: MemoryPanelProps) {
  const pinned  = memories.filter((m) => m.pinned);
  const recent  = memories.filter((m) => !m.pinned).slice(0, Math.max(0, maxItems - pinned.length));
  const visible = [...pinned, ...recent].slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Database className="h-6 w-6 text-nd-text-muted/40" />
        <p className="text-xs text-nd-text-muted">No memories loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Memory context">
      {visible.map((memory) => (
        <div
          key={memory.id}
          className={`rounded-xl border bg-nd-surface/30 transition hover:border-nd-accent/20 ${
            memory.pinned ? 'border-nd-accent/20 bg-nd-accent/[0.04]' : 'border-nd-text-muted/15'
          }`}
        >
          <div className={`flex items-start justify-between gap-2 ${compact ? 'px-3 py-2' : 'px-3 pt-2.5'}`}>
            <p className="min-w-0 flex-1 text-xs font-medium leading-5 text-nd-text/90 truncate">{memory.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge tone={scopeTone[memory.scope]}>{memory.scope}</Badge>
              {onTogglePin && (
                <button
                  type="button"
                  onClick={() => onTogglePin(memory.id)}
                  aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'}
                  className={`rounded p-0.5 transition ${
                    memory.pinned ? 'text-nd-accent' : 'text-nd-text-muted/40 hover:text-nd-accent'
                  }`}
                >
                  <Pin className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {!compact && (
            <p className="px-3 pb-2.5 text-[11px] leading-4 text-nd-text-muted line-clamp-2">{memory.body}</p>
          )}
        </div>
      ))}
    </div>
  );
}
