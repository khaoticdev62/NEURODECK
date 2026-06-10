import type { Dispatch } from 'react';
import { Badge } from '../../components/primitives/Badge';
import { TelemetryWidget } from '../../components/cards/TelemetryWidget';
import { ChatViewport } from '../../components/workspace/ChatViewport';
import { InputConsole } from '../../components/workspace/InputConsole';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';

export function WorkspaceView({ state, dispatch, selectors, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; selectors: NeuroDeckSelectors; actions: NeuroDeckAppActions }) {
  const healthReady = state.aiHealth.filter((item) => item.available).length;

  return (
    <div className="workspace-container flex h-full min-h-0 flex-col gap-3">
      {/* Session Header */}
      <div className="flex items-center justify-between rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="chat-session-kicker text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            Active Session
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-nd-success" aria-hidden="true" />
          <span className="text-xs text-nd-text-muted">{state.activeProject?.name || 'Welcome session'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="accent">{state.selectedProvider}</Badge>
          <span className="text-xs text-nd-text-muted">{selectors.messageCount} msgs</span>
        </div>
      </div>

      {/* Telemetry Row */}
      <TelemetryWidget
        latencyMs={state.telemetry.latencyMs}
        cacheHealth={state.telemetry.cacheHealth}
        readyModels={selectors.readyModels}
        completedRuns={selectors.completedRuns}
      />

      {/* Chat Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        <ChatViewport
          messages={state.messages}
          onRunStarter={(prompt) => dispatch({ type: 'run-starter', prompt })}
          onScanProject={() => void actions.scanProject()}
          onBuildContext={() => void actions.buildProjectContext()}
          onCheckHealth={() => void actions.checkAiHealth()}
          onSaveSession={() => void actions.saveSession()}
        />

        <InputConsole
          value={state.composerValue}
          onChange={(value) => dispatch({ type: 'set-composer', value })}
          onSend={(value) => void actions.runAssistant(value)}
          provider={state.selectedProvider}
          hasContext={!!state.projectContext}
          providerCount={healthReady}
        />
      </div>
    </div>
  );
}
