import type { Dispatch } from 'react';
import { Database, Pin } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function MemoryView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  return (
    <Panel eyebrow="Memory Vault" title="Local-First Recall" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-3">
        {state.memories.map((memory) => (
          <article key={memory.id} className={`rounded-3xl border p-4 transition ${memory.pinned ? 'border-neuro/30 bg-neuro/[0.055]' : 'border-white/10 bg-white/[0.035] hover:border-neuro/25'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-neuro">
                <Database className="h-5 w-5" />
              </div>
              <button type="button" onClick={() => dispatch({ type: 'toggle-memory-pin', id: memory.id })} className={`rounded-xl border px-2.5 py-2 text-xs transition ${memory.pinned ? 'border-neuro/30 bg-neuro/10 text-neuro' : 'border-white/10 text-slate-500 hover:text-slate-100'}`}>
                <Pin className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-4 font-semibold text-slate-100">{memory.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{memory.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone={memory.scope === 'Global' ? 'accent' : memory.scope === 'Project' ? 'success' : 'neutral'}>{memory.scope}</Badge>
              <span className="text-xs text-slate-600">{memory.updatedAt}</span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
