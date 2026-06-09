import { HardDrive, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckState } from '../../types/neurodeck';

export function CacheView({ state }: { state: NeuroDeckState }) {
  return (
    <Panel eyebrow="Offline Cache" title="Local Readiness Center" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-2">
        {state.cacheEntries.map((entry) => (
          <article key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-neuro/25">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neuro/25 bg-neuro/10 text-neuro"><HardDrive className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-100">{entry.label}</h3>
                  <p className="text-xs text-slate-500">{entry.size} • {entry.updatedAt}</p>
                </div>
              </div>
              <Badge tone={entry.status === 'ready' ? 'success' : entry.status === 'stale' ? 'warning' : 'neutral'}>{entry.status}</Badge>
            </div>
            <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-400 transition hover:border-neuro/25 hover:text-neuro">
              <RotateCcw className="h-4 w-4" /> Queue Refresh
            </button>
          </article>
        ))}
      </div>
    </Panel>
  );
}
