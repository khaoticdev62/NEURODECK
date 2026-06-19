import { Activity, CircleDot } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { StatusChip } from "../../../components/primitives/StatusChip";
import type { Agent } from "../../../types/neurodeck";
import { AgentSelector } from "./AgentSelector";
import { PersonaSelector } from "./PersonaSelector";

interface WorkspaceHeaderProps {
  sessionName: string;
  provider: string;
  messageCount: number;
  selectedPersona: string;
  agents: Agent[];
  activeAgentId: string;
  onSetPersona: (persona: string) => void;
  onSetAgent: (agentId: string) => void;
}

export function WorkspaceHeader({
  sessionName,
  provider,
  messageCount,
  selectedPersona,
  agents,
  activeAgentId,
  onSetPersona,
  onSetAgent,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-raised/40 backdrop-blur-[var(--nd-glass-blur,8px)] px-4 py-2.5 shadow-panel">
      <div className="flex items-center gap-3 min-w-0">
        <StatusChip tone="success" size="sm" pulse icon={CircleDot}>
          live
        </StatusChip>
        <div className="hidden min-w-0 sm:block">
          <p className="text-[10px] uppercase tracking-wider text-nd-text-muted">Active Session</p>
          <p className="truncate text-xs font-semibold text-nd-text-primary" title={sessionName}>
            {sessionName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <PersonaSelector value={selectedPersona} onChange={onSetPersona} />
        <AgentSelector agents={agents} activeAgentId={activeAgentId} onChange={onSetAgent} />
        <Badge tone="accent" dot>
          <Activity className="h-3 w-3" aria-hidden="true" />
          {provider}
        </Badge>
        <span className="whitespace-nowrap text-xs text-nd-text-muted">
          {messageCount} msg{messageCount === 1 ? "" : "s"}
        </span>
      </div>
    </header>
  );
}
