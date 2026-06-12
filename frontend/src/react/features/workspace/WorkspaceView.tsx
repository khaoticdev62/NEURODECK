import { type Dispatch, useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../../components/primitives/Badge';
import { ChatViewport } from '../../components/workspace/ChatViewport';
import { InputConsole } from '../../components/workspace/InputConsole';
import { TelemetryWidget } from '../../components/workspace/TelemetryWidget';
import { bridgeInvoke, neurodeckApi } from '../../services/bridgeAdapter';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';

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
  const selectedModel = state.models.find((m) => m.id === state.selectedModelId)
    ?? state.models.find((m) => m.backendModel === state.selectedModelId);
  const modelName = state.selectedProvider === 'offline-draft'
    ? 'NeuroDraft'
    : selectedModel?.name ?? state.selectedModelId ?? 'default';

  const [liveRamMb, setLiveRamMb] = useState(128);
  const [docCount, setDocCount] = useState(state.memories.length);
  const telemetryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      const [mem, docs] = await Promise.allSettled([
        neurodeckApi.diagnostics.memoryUsage(),
        bridgeInvoke<{ count: number }>('get_doc_count'),
      ]);
      if (!mounted) return;
      if (mem.status === 'fulfilled' && mem.value.rss_mb > 0) setLiveRamMb(mem.value.rss_mb);
      if (docs.status === 'fulfilled') setDocCount(docs.value.count ?? 0);
    };

    void poll();
    telemetryTimer.current = setInterval(() => void poll(), 5000);
    return () => {
      mounted = false;
      if (telemetryTimer.current) clearInterval(telemetryTimer.current);
    };
  }, []);

  const handleRegenerate = useCallback((messageId: string) => {
    const idx = state.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const preceding = [...state.messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
    if (preceding) void actions.runAssistant(preceding.content);
  }, [state.messages, actions]);

  const handleRunStarter = (prompt: string) => {
    dispatch({ type: 'run-starter', prompt });
    void actions.runAssistant(prompt);
  };

  const handleSend = (value?: string) => {
    const prompt = (value ?? state.composerValue).trim();
    if (!prompt) return;
    dispatch({ type: 'set-composer', value: prompt });
    void actions.runAssistant(prompt);
  };

  return (
    <div className="workspace-container flex h-full min-h-0 flex-col gap-3" data-controller-zone="content">
      {/* Session header */}
      <div className="flex items-center justify-between rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="chat-session-kicker text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            Active Session
          </span>
          <span
            className="relative flex h-2 w-2 items-center justify-center"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nd-success/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-nd-success" />
          </span>
          <span className="text-xs text-nd-text-muted">
            {state.activeProject?.name || 'Welcome session'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="accent">{state.selectedProvider}</Badge>
          <span className="text-xs text-nd-text-muted">
            {selectors.messageCount} msg{selectors.messageCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <TelemetryWidget
        provider={state.selectedProvider}
        model={modelName}
        ramUsageMb={liveRamMb}
        memoryDocCount={docCount}
        aiHealth={state.aiHealth}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        <ChatViewport
          messages={state.messages}
          onRunStarter={handleRunStarter}
          onRegenerate={handleRegenerate}
          onScanProject={() => void actions.scanProject()}
          onBuildContext={() => void actions.buildProjectContext()}
          onCheckHealth={() => void actions.checkAiHealth()}
          onSaveSession={() => void actions.saveSession()}
        />
        <InputConsole
          value={state.composerValue}
          onChange={(v) => dispatch({ type: 'set-composer', value: v })}
          onSend={handleSend}
          provider={state.selectedProvider}
          hasContext={!!state.projectContext || !!state.activeProject}
          providerCount={Math.max(1, state.aiHealth.filter((h) => h.available).length)}
          onAttachFile={(paths) =>
            dispatch({ type: 'set-composer', value: paths.map((p) => `@${p}`).join(' ') })
          }
        />
      </div>
    </div>
  );
}
