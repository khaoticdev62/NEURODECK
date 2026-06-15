import { Bot, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { Agent, AgentStatus } from "../../types/neurodeck";

interface AgentCardProps {
  agent: Agent;
  isBusy?: boolean;
  onRun: (id: string) => void;
  onCycle: (id: string) => void;
}

const statusTone: Record<AgentStatus, "info" | "success" | "warning" | "error"> = {
  thinking: "info",
  complete: "success",
  blocked: "error",
  idle: "warning",
};

export function AgentCard({ agent, isBusy = false, onRun, onCycle }: AgentCardProps) {
  return (
    <Panel className="transition hover:border-nd-accent-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--nd-radius-md)] border border-accent-agent/30 bg-accent-agent/10 text-accent-agent"
            aria-hidden="true"
          >
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-nd-text-primary">{agent.name}</h3>
            <p className="text-xs text-nd-text-muted">{agent.role}</p>
          </div>
        </div>
        <StatusChip tone={statusTone[agent.status]} size="sm">
          {agent.status}
        </StatusChip>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-nd-text-muted">
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
          icon={PlayCircle}
          disabled={isBusy}
          aria-label={`Run ${agent.name}`}
          onClick={() => onRun(agent.id)}
        >
          Run Agent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={RotateCcw}
          aria-label={`Cycle ${agent.name} status`}
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
    <div className="flex gap-3 rounded-[var(--nd-radius-md)] border border-nd-border-subtle bg-nd-surface-tertiary px-3 py-2">
      <dt className="w-16 shrink-0 uppercase tracking-[var(--nd-tracking-hud)] text-nd-text-muted">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-nd-text-secondary">{value || '—'}</dd>
    </div>
  );
}
