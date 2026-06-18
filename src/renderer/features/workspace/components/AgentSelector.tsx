import { Bot } from "lucide-react";
import { Select } from "../../../design-system/components/core/Select";
import type { Agent } from "../../../types/neurodeck";

interface AgentSelectorProps {
  agents: Agent[];
  activeAgentId: string;
  onChange: (agentId: string) => void;
}

export function AgentSelector({ agents, activeAgentId, onChange }: AgentSelectorProps) {
  if (agents.length === 0) return null;

  const options = agents.map((agent) => ({ value: agent.id, label: agent.name }));
  const value = agents.some((a) => a.id === activeAgentId) ? activeAgentId : (agents[0]?.id ?? "");

  return (
    <div className="flex items-center gap-2">
      <Bot className="h-3.5 w-3.5 text-nd-accent-agent" aria-hidden="true" />
      <Select
        value={value}
        onChange={onChange}
        options={options}
        aria-label="Active agent"
        className="w-32 sm:w-40"
      />
    </div>
  );
}
