import { useState } from "react";
import type { Dispatch, FormEvent } from "react";
import { Bot, Loader2, Plus, Send } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { TextInput } from "../../components/primitives/TextInput";
import { AgentCard } from "../../components/cards/AgentCard";
import { AgentBuilderDrawer, type AgentDefinition } from "./AgentBuilderDrawer";
import { AgentRunDetail } from "./AgentRunDetail";
import type { AgentRun } from "./AgentRunDetail";
import type { Agent, NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

function createAgentFromDefinition(def: AgentDefinition): Agent {
  let memoryAccess: Agent["memoryAccess"] = "none";
  if (def.memoryWrite && def.memoryRead) {
    memoryAccess = "global";
  } else if (def.memoryRead && def.projectContext) {
    memoryAccess = "project";
  } else if (def.memoryRead) {
    memoryAccess = "session";
  }

  return {
    id: crypto.randomUUID(),
    name: def.name,
    role: def.instructions.trim().slice(0, 60) || "Custom agent",
    status: "idle",
    model: def.model,
    memoryAccess,
    lastAction: "Created from builder",
    task: "",
  };
}

function createAgentRun(agentId: string, agentName: string, task: string): AgentRun {
  return {
    runId: crypto.randomUUID(),
    agentId,
    agentName,
    task,
    startedAt: new Date().toISOString(),
    status: "running",
  };
}

export function AgentsView({
  state,
  dispatch,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [task, setTask] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const isBusy = !!state.busyLabel;

  const handleSaved = (def: AgentDefinition) => {
    const agent = createAgentFromDefinition(def);
    dispatch({ type: "add-agent", agent });
    setBuilderOpen(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed || isBusy) return;
    const targetId = state.activeAgentId || state.agents[0]?.id;
    const targetAgent = targetId ? state.agents.find((a) => a.id === targetId) : undefined;
    if (targetAgent) {
      setActiveRun(createAgentRun(targetAgent.id, targetAgent.name, trimmed));
      void actions.runAgent(targetAgent.id, trimmed);
    } else {
      void actions.runAssistant(trimmed);
    }
    setTask("");
  };

  const handleRunAgent = (id: string) => {
    const agent = state.agents.find((a) => a.id === id);
    if (!agent) return;
    const prompt = task.trim() || "Run requested";
    setActiveRun(createAgentRun(agent.id, agent.name, prompt));
    void actions.runAgent(agent.id, task.trim() || undefined);
  };

  return (
    <>
      <Panel
        eyebrow="Agent Dock"
        title="Specialized Operators"
        data-testid="agents-view"
        className="agent-shell flex h-full flex-col overflow-hidden"
        bodyClassName="flex flex-1 flex-col min-h-0"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => setBuilderOpen(true)}
            aria-label="Build new agent"
          >
            Build Agent
          </Button>
        }
      >
        <div className="agent-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
          Agent
        </div>
        <form onSubmit={handleSubmit} className="px-4 pt-3">
          <div className="flex gap-2">
            <TextInput
              id="agent-task-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe a task for the active agent..."
              aria-label="Task for active agent"
              disabled={isBusy}
              className="flex-1"
            />
            <Button
              id="agent-run-btn"
              type="submit"
              variant="primary"
              size="md"
              disabled={!task.trim() || isBusy}
              icon={isBusy ? Loader2 : Send}
            >
              {isBusy ? "Running…" : "Run"}
            </Button>
          </div>
          {isBusy && state.busyLabel && (
            <p
              role="status"
              aria-live="polite"
              className="mt-2 flex items-center gap-2 text-xs text-nd-text-muted"
            >
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              {state.busyLabel}
            </p>
          )}
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
          {state.agents.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agents loaded"
              description="Agent definitions are registered at startup. Check that plugins/bmad.lua loaded correctly."
              variant="deck"
              className="h-full"
            />
          ) : (
            <ul role="list" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {state.agents.map((agent, i) => (
                <li
                  key={agent.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <AgentCard
                    agent={agent}
                    isBusy={isBusy}
                    onRun={handleRunAgent}
                    onCycle={(id) => dispatch({ type: "toggle-agent", id })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <AgentBuilderDrawer
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSaved={handleSaved}
      />

      <AgentRunDetail
        run={activeRun}
        open={!!activeRun}
        onClose={() => setActiveRun(null)}
      />
    </>
  );
}
