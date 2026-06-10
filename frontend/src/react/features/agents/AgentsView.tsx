import { useState } from 'react';
import type { Dispatch } from 'react';
import { Bot, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function AgentsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  const [task, setTask] = useState('');
  return (
    <Panel eyebrow="Agent Dock" title="Specialized Operators" className="agent-shell h-full overflow-hidden">
      <div className="agent-kicker px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text0">Agent</div>
      <div className="px-4 pt-3">
        <input
          id="agent-task-input"
          type="text"
          value={task}
          onChange={(event) => setTask(event.target.value)}
          placeholder="Task for agent..."
          className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none"
        />
      </div>
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin md:grid-cols-2 2xl:grid-cols-3">
        {state.agents.map((agent) => (
          <article key={agent.id} className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.055]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent/25 bg-nd-accent/10 text-nd-accent">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-nd-text">{agent.name}</h3>
                  <p className="text-xs text-nd-text0">{agent.role}</p>
                </div>
              </div>
              <Badge tone={agent.status === 'thinking' ? 'accent' : agent.status === 'complete' ? 'success' : agent.status === 'blocked' ? 'danger' : 'neutral'}>{agent.status}</Badge>
            </div>
            <dl className="mt-4 space-y-2 text-xs text-nd-text-muted">
              <Row label="Model" value={agent.model} />
              <Row label="Memory" value={agent.memoryAccess} />
              <Row label="Task" value={agent.task} />
              <Row label="Last" value={agent.lastAction} />
            </dl>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void actions.runAgent(agent.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15">
                <PlayCircle className="h-4 w-4" /> Run Agent
              </button>
              <button type="button" onClick={() => dispatch({ type: 'toggle-agent', id: agent.id })} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/30 hover:text-nd-accent">
                <RotateCcw className="h-4 w-4" /> Cycle
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2">
      <dt className="w-16 shrink-0 uppercase tracking-[0.18em] text-nd-text-muted/70">{label}</dt>
      <dd className="min-w-0 flex-1 text-nd-text/80">{value}</dd>
    </div>
  );
}
