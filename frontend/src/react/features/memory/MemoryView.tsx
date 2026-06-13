import { useMemo, useState } from 'react';
import type { Dispatch } from 'react';
import { Database, Pin, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Button } from '../../components/primitives/Button';
import { EmptyState } from '../../components/primitives/EmptyState';
import { IconButton } from '../../components/primitives/IconButton';
import { Panel } from '../../components/primitives/Panel';
import { TextInput } from '../../components/primitives/TextInput';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function MemoryView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
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

      <div className="grid gap-4 px-4 pt-3 md:grid-cols-2">
        <form onSubmit={handleAddFact} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextInput
              id="new-memory-fact"
              className="memory-fact-input"
              label="Add Fact to Memory"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Type a new fact to persist..."
            />
          </div>
          <Button type="submit" id="memory-fact-save-btn">Add Fact</Button>
        </form>

        <div className="memory-search-shell flex flex-col justify-end">
          <TextInput
            id="memory-search-input"
            className="memory-search-input"
            label="Search Memory Vault"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memory..."
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
        {filtered.length === 0 && state.memories.length === 0 && (
          <EmptyState
            icon={Database}
            title="Memory vault is empty."
            description="Conversations and facts will appear here as the agent builds context."
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
                <IconButton
                  type="button"
                  size="sm"
                  variant={memory.pinned ? 'accent' : 'outline'}
                  aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'}
                  aria-pressed={memory.pinned}
                  onClick={() => void actions.toggleMemoryPin(memory.id, !memory.pinned)}
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Delete memory"
                  onClick={() => void actions.deleteMemory(memory.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
            <h3 className="mt-4 font-semibold text-nd-text">{memory.title ?? '(untitled)'}</h3>
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
