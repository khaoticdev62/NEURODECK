import { useState } from 'react';
import type { Dispatch } from 'react';
import { Panel } from '../../components/primitives/Panel';
import { AgentCard } from '../../components/cards/AgentCard';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function AgentsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  const [task, setTask] = useState('');

  return (
    <Panel eyebrow="Agent Dock" title="Specialized Operators" className="agent-shell h-full overflow-hidden">
      <div className="agent-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Agent</div>
      <div className="px-4 pt-3">
        <input
          id="agent-task-input"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Task for agent..."
          aria-label="Task for agent"
          className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:border-nd-accent/40"
        />
      </div>
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin md:grid-cols-2 2xl:grid-cols-3">
        {state.agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onRun={(id) => void actions.runAgent(id)}
            onCycle={(id) => dispatch({ type: 'toggle-agent', id })}
          />
        ))}
      </div>
    </Panel>
  );
}
