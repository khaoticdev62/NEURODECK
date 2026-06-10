import { HardDrive, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckState } from '../../types/neurodeck';

export function CacheView({ state }: { state: NeuroDeckState }) {
  return (
    <Panel eyebrow="Offline Cache" title="Local Readiness Center" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-2">
        {state.cacheEntries.map((entry) => (
          <article key={entry.id} className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition hover:border-nd-accent/25">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent/25 bg-nd-accent/10 text-nd-accent"><HardDrive className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-nd-text">{entry.label}</h3>
                  <p className="text-xs text-nd-text0">{entry.size} • {entry.updatedAt}</p>
                </div>
              </div>
              <Badge tone={entry.status === 'ready' ? 'success' : entry.status === 'stale' ? 'warning' : 'neutral'}>{entry.status}</Badge>
            </div>
            <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text-muted transition hover:border-nd-accent/25 hover:text-nd-accent">
              <RotateCcw className="h-4 w-4" /> Queue Refresh
            </button>
          </article>
        ))}
      </div>
    </Panel>
  );
}
