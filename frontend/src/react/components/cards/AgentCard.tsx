import { Bot, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '../../../design-system';
import { Button } from '../../../design-system';
import { Panel } from '../../../design-system';
import type { Agent, AgentStatus } from '../../types/neurodeck';

interface AgentCardProps {
  agent: Agent;
  onRun: (id: string) => void;
  onCycle: (id: string) => void;
}

const statusTone: Record<AgentStatus, 'neutral' | 'info' | 'success' | 'error'> = {
  thinking: 'info',
  complete: 'success',
  blocked: 'error',
  idle: 'neutral',
};

export function AgentCard({ agent, onRun, onCycle }: AgentCardProps) {
  return (
    <Panel className="transition hover:border-[rgba(var(--nd-cyan-rgb),0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-purple-rgb),0.3)] bg-[rgba(var(--nd-purple-rgb),0.12)] text-[var(--nd-accent-agent)]"
          >
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--nd-text-primary)]">{agent.name}</h3>
            <p className="text-xs text-[var(--nd-text-muted)]">{agent.role}</p>
          </div>
        </div>
        <Badge tone={statusTone[agent.status]}>{agent.status}</Badge>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-[var(--nd-text-muted)]">
        <AgentRow label="Model" value={agent.model} />
        <AgentRow label="Memory" value={agent.memoryAccess} />
        <AgentRow label="Task" value={agent.task} />
        <AgentRow label="Last" value={agent.lastAction} />
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          icon={<PlayCircle className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onRun(agent.id)}
        >
          Run Agent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onCycle(agent.id)}
        >
          Cycle
        </Button>
      </div>
    </Panel>
  );
}

function AgentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] px-3 py-2">
      <dt className="w-16 shrink-0 uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[var(--nd-text-secondary)]">{value}</dd>
    </div>
  );
}
