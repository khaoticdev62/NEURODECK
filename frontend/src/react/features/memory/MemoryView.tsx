import { useMemo, useState } from 'react';
import type { Dispatch } from 'react';
import { Database, Pin, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function MemoryView({
  state,
  dispatch,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [query, setQuery] = useState('');
  const [newFact, setNewFact] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.memories;
    return state.memories.filter((memory) =>
      `${memory.title} ${memory.body}`.toLowerCase().includes(q)
    );
  }, [query, state.memories]);

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    void actions.addMemoryFact(newFact.trim());
    setNewFact('');
  };

  return (
    <Panel eyebrow="Memory Vault" title="Local-First Recall" className="memory-shell !flex-col h-full overflow-hidden">
      <div className="memory-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Memory</div>
      
      <div className="grid gap-4 md:grid-cols-2 px-4 pt-3">
        <form onSubmit={handleAddFact} className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="new-memory-fact" className="block text-2xs font-semibold uppercase tracking-wider text-nd-text-muted mb-1.5">
              Add Fact to Memory
            </label>
            <input
              id="new-memory-fact"
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Type a new fact to persist..."
              className="h-10 w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 hover:border-nd-text-muted/30"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-nd-accent px-4 text-sm font-semibold text-nd-bg transition hover:bg-nd-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            Add Fact
          </button>
        </form>

        <div className="memory-search-shell flex flex-col justify-end">
          <label htmlFor="memory-search-input" className="block text-2xs font-semibold uppercase tracking-wider text-nd-text-muted mb-1.5">
            Search Memory Vault
          </label>
          <input
            id="memory-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memory..."
            aria-label="Search memories"
            className="h-10 w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 hover:border-nd-text-muted/30"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
        {filtered.length === 0 && state.memories.length === 0 && (
          <EmptyState
            icon={Database}
            title="Memory vault is empty"
            description="Add facts above to persist knowledge across sessions."
          />
        )}
        {filtered.length === 0 && state.memories.length > 0 && (
          <EmptyState
            icon={Search}
            title="No matches found"
            description={`No memories match "${query}". Try a different search term.`}
          />
        )}
        <div className="grid gap-4 lg:grid-cols-3">
        {filtered.map((memory) => (
          <article key={memory.id} className={`rounded-3xl border p-4 transition ${memory.pinned ? 'border-nd-accent/30 bg-nd-accent/[0.055]' : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 text-nd-accent">
                <Database className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void actions.toggleMemoryPin(memory.id, !memory.pinned)}
                  aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'}
                  aria-pressed={memory.pinned}
                  className={`rounded-xl border px-2.5 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${memory.pinned ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text'}`}
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void actions.deleteMemory(memory.id)}
                  aria-label="Delete memory"
                  className="rounded-xl border border-nd-text-muted/15 text-nd-text-muted hover:text-nd-danger hover:border-nd-danger/30 px-2.5 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40 bg-nd-surface/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
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
      </div>
    </Panel>
  );
}
