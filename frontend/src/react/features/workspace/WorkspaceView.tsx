import { type Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { ChatViewport } from "../../components/workspace/ChatViewport";
import { InputConsole } from "../../components/workspace/InputConsole";
import { TelemetryWidget } from "../../components/workspace/TelemetryWidget";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { bridgeInvoke, neurodeckApi } from "../../services/bridgeAdapter";
import type {
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckSelectors,
  NeuroDeckState,
} from "../../types/neurodeck";
import { WorkspaceHeader } from "./components/WorkspaceHeader";

export function WorkspaceView({
  state,
  dispatch,
  selectors,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  selectors: NeuroDeckSelectors;
  actions: NeuroDeckAppActions;
}) {
  const selectedModel =
    state.models.find((m) => m.id === state.selectedModelId) ??
    state.models.find((m) => m.backendModel === state.selectedModelId);
  const modelName =
    state.selectedProvider === "offline-draft"
      ? "NeuroDraft"
      : (selectedModel?.name ?? state.selectedModelId ?? "default");

  const [liveRamMb, setLiveRamMb] = useState(128);
  const [docCount, setDocCount] = useState(state.memories.length);
  const telemetryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      const [mem, docs] = await Promise.allSettled([
        neurodeckApi.diagnostics.memoryUsage(),
        bridgeInvoke<{ count: number }>("get_doc_count"),
      ]);
      if (!mounted) return;
      if (mem.status === "fulfilled" && mem.value.rss_mb > 0) setLiveRamMb(mem.value.rss_mb);
      if (docs.status === "fulfilled") setDocCount(docs.value.count ?? 0);
    };

    void poll();
    telemetryTimer.current = setInterval(() => void poll(), 5000);
    return () => {
      mounted = false;
      if (telemetryTimer.current) clearInterval(telemetryTimer.current);
    };
  }, []);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const idx = state.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const preceding = [...state.messages.slice(0, idx)].reverse().find((m) => m.role === "user");
      if (preceding) void actions.runAssistant(preceding.content);
    },
    [state.messages, actions]
  );

  const handleRunStarter = (prompt: string) => {
    dispatch({ type: "run-starter", prompt });
    void actions.runAssistant(prompt);
  };

  const handleSend = (value?: string) => {
    const prompt = (value ?? state.composerValue).trim();
    if (!prompt || !!state.busyLabel) return;
    dispatch({ type: "set-composer", value: "" });
    void actions.runAssistant(prompt);
  };

  const handleSetPersona = useCallback(
    async (persona: string) => {
      dispatch({ type: "set-persona", persona });
      try {
        await bridgeInvoke("set_persona", { name: persona });
      } catch {
        // Backend sync is best-effort; the UI already reflects the selection.
      }
    },
    [dispatch]
  );

  const handleSetAgent = useCallback(
    (agentId: string) => {
      dispatch({ type: "set-active-agent", id: agentId });
    },
    [dispatch]
  );

  const sessionName = state.activeProject?.name || "Welcome session";
  const activeAgentId = state.activeAgentId || state.agents[0]?.id || "";

  return (
    <div
      className="workspace-container flex h-full min-h-0 flex-col gap-3"
      data-controller-zone="content"
    >
      <WorkspaceHeader
        sessionName={sessionName}
        provider={state.selectedProvider}
        messageCount={selectors.messageCount}
        selectedPersona={state.selectedPersona}
        agents={state.agents}
        activeAgentId={activeAgentId}
        onSetPersona={handleSetPersona}
        onSetAgent={handleSetAgent}
      />

      {state.lastError && (
        <ErrorState
          title={state.lastError.title}
          message={state.lastError.message}
          onRetry={() => dispatch({ type: "set-error", error: null })}
          retryLabel="Dismiss"
        />
      )}

      <Panel eyebrow="Telemetry" title="Live Systems">
        <TelemetryWidget
          provider={state.selectedProvider}
          model={modelName}
          ramUsageMb={liveRamMb}
          memoryDocCount={docCount}
          aiHealth={state.aiHealth}
        />
      </Panel>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface/30 shadow-panel">
        <ChatViewport
          messages={state.messages}
          busyLabel={state.busyLabel}
          onRunStarter={handleRunStarter}
          onRegenerate={handleRegenerate}
          onScanProject={() => void actions.scanProject()}
          onBuildContext={() => void actions.buildProjectContext()}
          onCheckHealth={() => void actions.checkAiHealth()}
          onSaveSession={() => void actions.saveSession()}
        />
        <InputConsole
          value={state.composerValue}
          onChange={(v) => dispatch({ type: "set-composer", value: v })}
          onSend={handleSend}
          isBusy={!!state.busyLabel}
          provider={state.selectedProvider}
          model={modelName}
          hasContext={!!state.projectContext || !!state.activeProject}
          providerCount={Math.max(1, state.aiHealth.filter((h) => h.available).length)}
          onAttachFile={(paths) =>
            dispatch({ type: "set-composer", value: paths.map((p) => `@${p}`).join(" ") })
          }
        />
      </div>
    </div>
  );
}
