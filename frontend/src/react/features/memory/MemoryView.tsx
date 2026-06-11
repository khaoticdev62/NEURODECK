import { useMemo, useState } from 'react';
import type { Dispatch } from 'react';
import { Database, Pin } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function MemoryView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.memories;
    return state.memories.filter((memory) => `${memory.title} ${memory.body}`.toLowerCase().includes(q));
  }, [query, state.memories]);

  return (
    <Panel eyebrow="Memory Vault" title="Local-First Recall" className="memory-shell !flex-col h-full overflow-hidden">
      <div className="memory-kicker px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Memory</div>
      <div className="memory-search-shell px-4 pt-3">
        <input
          id="memory-search-input"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search memory..."
          aria-label="Search memories"
          className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none"
        />
      </div>
      <div className="flex-1 min-h-0 grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-3">
        {filtered.map((memory) => (
          <article key={memory.id} className={`rounded-3xl border p-4 transition ${memory.pinned ? 'border-nd-accent/30 bg-nd-accent/[0.055]' : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 text-nd-accent">
                <Database className="h-5 w-5" />
              </div>
              <button type="button" onClick={() => dispatch({ type: 'toggle-memory-pin', id: memory.id })} aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'} aria-pressed={memory.pinned} className={`rounded-xl border px-2.5 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${memory.pinned ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text'}`}>
                <Pin className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <h3 className="mt-4 font-semibold text-nd-text">{memory.title}</h3>
            <p className="mt-2 text-sm leading-6 text-nd-text-muted">{memory.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone={memory.scope === 'Global' ? 'accent' : memory.scope === 'Project' ? 'success' : 'neutral'}>{memory.scope}</Badge>
              <span className="text-xs text-nd-text-muted/70">{memory.updatedAt}</span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
