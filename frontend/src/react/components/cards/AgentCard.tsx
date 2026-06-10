import { Bot, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import type { Agent, AgentStatus } from '../../types/neurodeck';

interface AgentCardProps {
  agent: Agent;
  onRun: (id: string) => void;
  onCycle: (id: string) => void;
}

const statusTone: Record<AgentStatus, 'accent' | 'success' | 'danger' | 'neutral'> = {
  thinking: 'accent',
  complete:  'success',
  blocked:   'danger',
  idle:      'neutral',
};

export function AgentCard({ agent, onRun, onCycle }: AgentCardProps) {
  return (
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.055]">
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
        <Badge tone={statusTone[agent.status]}>{agent.status}</Badge>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-nd-text-muted">
        <AgentRow label="Model"  value={agent.model} />
        <AgentRow label="Memory" value={agent.memoryAccess} />
        <AgentRow label="Task"   value={agent.task} />
        <AgentRow label="Last"   value={agent.lastAction} />
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onRun(agent.id)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
        >
          <PlayCircle className="h-4 w-4" /> Run Agent
        </button>
        <button
          type="button"
          onClick={() => onCycle(agent.id)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/30 hover:text-nd-accent"
        >
          <RotateCcw className="h-4 w-4" /> Cycle
        </button>
      </div>
    </article>
  );
}

function AgentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2">
      <dt className="w-16 shrink-0 uppercase tracking-[0.18em] text-nd-text-muted/70">{label}</dt>
      <dd className="min-w-0 flex-1 text-nd-text/80">{value}</dd>
    </div>
  );
}
