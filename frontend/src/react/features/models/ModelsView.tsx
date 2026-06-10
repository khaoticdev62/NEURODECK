import type { Dispatch } from 'react';
import { BrainCircuit, CheckCircle2, DownloadCloud, Power, RefreshCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { ModelStatus, NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

const statusTone: Record<ModelStatus, 'accent' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  ready: 'success',
  indexed: 'accent',
  missing: 'warning',
  disabled: 'neutral'
};

export function ModelsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel eyebrow="Model Manager" title="Local Runtime Inventory" className="min-h-0 overflow-hidden">
        <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin xl:grid-cols-2">
          {state.models.map((model) => (
            <article key={model.id} className={`rounded-3xl border p-4 transition hover:border-nd-accent/30 ${state.selectedModelId === model.id ? 'border-nd-accent/40 bg-nd-accent/[0.07]' : 'border-nd-text-muted/15 bg-nd-surface/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-nd-accent/25 bg-nd-accent/10 text-nd-accent">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-nd-text">{model.name}</h3>
                    <p className="text-xs text-nd-text0">{model.provider} • {model.size} • {model.quantization}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2"><Badge tone={statusTone[model.status]}>{model.status}</Badge>{state.selectedModelId === model.id && <Badge tone="accent">Selected</Badge>}</div>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-nd-text-muted sm:grid-cols-3">
                <Spec label="Context" value={model.context ? model.context.toLocaleString() : 'runtime'} />
                <Spec label="RAM" value={model.ramEstimate} />
                <Spec label="Best For" value={model.bestFor.join(', ')} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => { dispatch({ type: 'set-model-status', id: model.id, status: 'ready' }); dispatch({ type: 'set-selected-model', id: model.id }); }} className="inline-flex items-center gap-2 rounded-xl border border-success/25 bg-nd-success/10 px-3 py-2 text-xs font-semibold text-nd-success transition hover:bg-success/15"><CheckCircle2 className="h-4 w-4" /> Mark Ready</button>
                <button type="button" onClick={() => { dispatch({ type: 'set-model-status', id: model.id, status: 'indexed' }); dispatch({ type: 'set-selected-model', id: model.id }); }} className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/15"><DownloadCloud className="h-4 w-4" /> Indexed</button>
                <button type="button" onClick={() => dispatch({ type: 'set-model-status', id: model.id, status: 'disabled' })} className="inline-flex items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-2 text-xs font-semibold text-nd-text-muted transition hover:text-nd-text"><Power className="h-4 w-4" /> Disable</button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Runtime Probe" title="Native Detection">
        <div className="space-y-3 p-4">
          <button type="button" onClick={() => void actions.detectModels()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15">
            <RefreshCcw className="h-4 w-4" /> Detect Local Models
          </button>
          {state.modelDetection ? (
            <>
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                <Badge tone={state.modelDetection.discoveredModels.length ? 'success' : 'warning'}>{state.modelDetection.discoveredModels.length} found</Badge>
                <p className="mt-3 text-sm leading-6 text-nd-text-muted">{state.modelDetection.summary}</p>
                <p className="mt-2 text-xs text-nd-text-muted/70">{new Date(state.modelDetection.scannedAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                {state.modelDetection.runtimes.map((runtime) => (
                  <div key={runtime.name + runtime.path} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
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
            <p className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-sm leading-6 text-nd-text-muted">Detection runs through Electron main process and checks common local-only model locations. No cloud calls. No weird phoning home.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-nd-text-muted/70">{label}</p><p className="mt-1 text-nd-text/80">{value}</p></div>;
}
