import type { Dispatch } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import { ModelCard } from '../../components/cards/ModelCard';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function ModelsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel eyebrow="Model Manager" title="Local Runtime Inventory" className="flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-2">
          {state.models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={state.selectedModelId === model.id}
              onMarkReady={(id) => dispatch({ type: 'set-model-status', id, status: 'ready' })}
              onMarkIndexed={(id) => dispatch({ type: 'set-model-status', id, status: 'indexed' })}
              onDisable={(id) => dispatch({ type: 'set-model-status', id, status: 'disabled' })}
              onSelect={(id) => dispatch({ type: 'set-selected-model', id })}
            />
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Runtime Probe" title="Native Detection" className="flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          <button
            type="button"
            onClick={() => void actions.detectModels()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
          >
            <RefreshCcw className="h-4 w-4" /> Detect Local Models
          </button>

          {state.modelDetection ? (
            <>
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                <Badge tone={state.modelDetection.discoveredModels.length ? 'success' : 'warning'}>
                  {state.modelDetection.discoveredModels.length} found
                </Badge>
                <p className="mt-3 text-sm leading-6 text-nd-text-muted">{state.modelDetection.summary}</p>
                <p className="mt-2 text-xs text-nd-text-muted/70">{new Date(state.modelDetection.scannedAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                {state.modelDetection.runtimes.map((runtime) => (
                  <div key={`${runtime.name}-${runtime.path}`} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-nd-text/90">{runtime.name}</span>
                      <Badge tone={runtime.exists ? 'success' : 'neutral'}>{runtime.status}</Badge>
                    </div>
                    <p className="mt-1 break-all text-xs text-nd-text-muted/70">{runtime.path}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-sm leading-6 text-nd-text-muted">
              Detection runs through Electron main process and checks common local-only model locations. No cloud calls. No weird phoning home.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
