import { useState } from 'react';
import type { Dispatch, FormEvent } from 'react';
import { Bot } from 'lucide-react';
import { Panel } from '../../components/primitives/Panel';
import { AgentCard } from '../../components/cards/AgentCard';
import { EmptyState } from '../../components/primitives/EmptyState';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function AgentsView({
  state,
  dispatch,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [task, setTask] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    void actions.runAssistant(trimmed);
    setTask('');
  };

  return (
    <Panel eyebrow="Agent Dock" title="Specialized Operators" className="agent-shell h-full overflow-hidden">
      <div className="agent-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
        Agent
      </div>
      <form onSubmit={handleSubmit} className="px-4 pt-3">
        <div className="flex gap-2">
          <input
            id="agent-task-input"
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe a task for the active agent..."
            aria-label="Task for agent"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          />
          <button
            type="submit"
            disabled={!task.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-4 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            Run
          </button>
        </div>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
        {state.agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents loaded."
            description="Agent definitions are registered at startup. Check that plugins/bmad.lua loaded correctly."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {state.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRun={(id) => void actions.runAgent(id, task.trim() || undefined)}
                onCycle={(id) => dispatch({ type: 'toggle-agent', id })}
              />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
