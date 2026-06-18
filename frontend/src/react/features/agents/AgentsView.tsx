import { useState } from "react";
import type { Dispatch, FormEvent } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { TextInput } from "../../components/primitives/TextInput";
import { AgentCard } from "../../components/cards/AgentCard";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

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
  const isBusy = !!state.busyLabel;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed || isBusy) return;
    const targetId = state.activeAgentId || state.agents[0]?.id;
    if (targetId) {
      void actions.runAgent(targetId, trimmed);
    } else {
      void actions.runAssistant(trimmed);
    }
    setTask("");
  };

  return (
    <Panel
      eyebrow="Agent Dock"
      title="Specialized Operators"
      data-testid="agents-view"
      className="agent-shell flex h-full flex-col overflow-hidden"
      bodyClassName="flex flex-1 flex-col min-h-0"
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
            {state.agents.map((agent) => (
              <li key={agent.id}>
                <AgentCard
                  agent={agent}
                  isBusy={isBusy}
                  onRun={(id) => void actions.runAgent(id, task.trim() || undefined)}
                  onCycle={(id) => dispatch({ type: "toggle-agent", id })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
