import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import { RefreshCcw } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Panel } from "../../components/primitives/Panel";
import { ModelCard } from "../../components/cards/ModelCard";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { AgentScoredModel, ModelCompatibilityScore } from "../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

export function ModelsView({
  state,
  dispatch,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [allowedModels, setAllowedModels] = useState<AgentScoredModel[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, ModelCompatibilityScore>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [scored, scores] = await Promise.all([
          neurodeckApi.models.getAllowedModelsForAgent(state.activeAgentId),
          neurodeckApi.models.getCompatibilityScores({}),
        ]);
        if (!mounted) return;
        setAllowedModels(scored);
        setScoresMap(Object.fromEntries(scores.map((s) => [s.modelId, s])));
      } catch (_) {
        setAllowedModels([]);
        setScoresMap({});
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [state.activeAgentId, state.models.length]);

  const allowedById = useMemo(
    () => Object.fromEntries(allowedModels.map((m) => [m.modelId, m])),
    [allowedModels]
  );

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel
        eyebrow="Model Manager"
        title="Local Runtime Inventory"
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex-1 min-h-0 grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-2">
          {state.models.map((model) => {
            const scored = allowedById[model.id];
            return (
              <ModelCard
                key={model.id}
                model={model}
                selected={state.selectedModelId === model.id}
                policyAllowed={scored?.policyAllowed ?? true}
                policyReason={scored?.policyReason}
                agentPreferred={scored?.agentPreferred}
                onMarkReady={(id) => {
                  if (scored && !scored.policyAllowed) return;
                  dispatch({ type: "set-model-status", id, status: "ready" });
                  dispatch({ type: "set-selected-model", id });
                  const backendProvider = model.backendProvider ?? "ollama";
                  const backendModel = model.backendModel ?? model.id;
                  dispatch({ type: "set-provider", provider: backendProvider });
                  void neurodeckApi.ai.setProvider(backendProvider);
                  void neurodeckApi.ai.setModel(backendModel);
                }}
                onMarkIndexed={(id) =>
                  dispatch({ type: "set-model-status", id, status: "indexed" })
                }
                onDisable={(id) => dispatch({ type: "set-model-status", id, status: "disabled" })}
                onSelect={(id) => dispatch({ type: "set-selected-model", id })}
              />
            );
          })}
        </div>
      </Panel>

      <Panel
        eyebrow="Runtime Probe"
        title="Native Detection"
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void actions.detectModels()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              <RefreshCcw className="h-4 w-4" /> Detect Local Models
            </button>
          </div>

          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted/70">
              Active agent
            </p>
            <p className="mt-1 text-sm font-medium text-nd-text">{state.activeAgentId}</p>
            {state.agentPolicies.find((p) => p.agentId === state.activeAgentId) && (
              <p className="mt-2 text-xs text-nd-text-muted">
                Models are filtered by this agent&apos;s policy.
              </p>
            )}
          </div>

          {state.modelDetection ? (
            <>
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                <Badge tone={state.modelDetection.discoveredModels.length ? "success" : "warning"}>
                  {state.modelDetection.discoveredModels.length} found
                </Badge>
                <p className="mt-3 text-sm leading-6 text-nd-text-muted">
                  {state.modelDetection.summary}
                </p>
                <p className="mt-2 text-xs text-nd-text-muted/70">
                  {new Date(state.modelDetection.scannedAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                {state.modelDetection.runtimes.map((runtime) => (
                  <div
                    key={`${runtime.name}-${runtime.path}`}
                    className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-nd-text/90">{runtime.name}</span>
                      <Badge tone={runtime.exists ? "success" : "neutral"}>{runtime.status}</Badge>
                    </div>
                    <p className="mt-1 break-all text-xs text-nd-text-muted/70">{runtime.path}</p>
                  </div>
                ))}
              </div>
              {Object.keys(scoresMap).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted/70">
                    Compatibility
                  </p>
                  {state.models.map((model) => {
                    const score = scoresMap[model.id];
                    if (!score) return null;
                    return (
                      <div
                        key={`score-${model.id}`}
                        className="flex items-center justify-between rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2"
                      >
                        <span className="text-xs text-nd-text/80">{model.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-nd-text-muted">{score.score}/100</span>
                          <Badge
                            tone={
                              score.score >= 70
                                ? "success"
                                : score.score >= 40
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {score.tier}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-sm leading-6 text-nd-text-muted">
              Detection runs through the NEURODECK bridge server and checks configured local model
              runtimes. No cloud calls.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
