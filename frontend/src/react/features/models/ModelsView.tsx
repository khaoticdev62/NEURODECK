import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import { Cpu, Library, RefreshCcw, Upload } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { ModelCard } from "../../components/cards/ModelCard";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { AgentScoredModel, ModelCompatibilityScore } from "../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";
import { LocalModelImportWizard } from "./LocalModelImportWizard";
import { ModelCatalogPanel } from "./ModelCatalogPanel";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [scored, scores] = await Promise.all([
          neurodeckApi.models.getAllowedModelsForAgent(state.activeAgentId),
          neurodeckApi.models.getCompatibilityScores({}),
        ]);
        if (!mounted) return;
        setAllowedModels(scored);
        setScoresMap(Object.fromEntries(scores.map((s) => [s.modelId, s])));
      } catch (e) {
        if (!mounted) return;
        setAllowedModels([]);
        setScoresMap({});
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [state.activeAgentId, state.models.length]);

  const allowedById = useMemo(
    () => Object.fromEntries(allowedModels.map((m) => [m.modelId, m])),
    [allowedModels]
  );

  const activeAgent = state.agents.find((a) => a.id === state.activeAgentId);
  const activeAgentLabel = activeAgent?.name ?? (state.activeAgentId || "No agent selected");

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel
        eyebrow="Model Manager"
        title="Local Runtime Inventory"
        className="flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
          {loading && (
            <div
              className="grid gap-4 lg:grid-cols-2"
              role="status"
              aria-label="Scanning for models…"
            >
              <Skeleton className="h-28 rounded-2xl" count={4} />
            </div>
          )}
          {!loading && error && (
            <ErrorState
              title="Model scan failed."
              message={error}
              onRetry={() => void actions.detectModels()}
              retryLabel="Retry Detection"
              fullHeight
            />
          )}
          {!loading && !error && state.models.length === 0 && (
            <EmptyState
              icon={Cpu}
              title="No models detected."
              description="Run native detection to scan for Ollama, LM Studio, or OpenAI-compatible providers."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCcw}
                  onClick={() => void actions.detectModels()}
                  className="min-h-touch"
                >
                  Detect Models
                </Button>
              }
            />
          )}
          {!loading && !error && state.models.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2" role="list" aria-label="Available models">
              {state.models.map((model) => {
                const scored = allowedById[model.id];
                return (
                  <div key={model.id} role="listitem">
                    <ModelCard
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
                      onDisable={(id) =>
                        dispatch({ type: "set-model-status", id, status: "disabled" })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      {catalogOpen ? (
        <ModelCatalogPanel
          onImported={() => {
            setCatalogOpen(false);
            void actions.detectModels();
          }}
        />
      ) : (
        <Panel
          eyebrow="Runtime Probe"
          title="Native Detection"
          className="flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              icon={RefreshCcw}
              onClick={() => void actions.detectModels()}
              className="min-h-touch"
            >
              Detect Local Models
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Library}
                onClick={() => setCatalogOpen(true)}
                className="min-h-touch"
              >
                Browse Catalog
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Upload}
                onClick={() => setImportWizardOpen(true)}
                className="min-h-touch"
              >
                Import Local Model
              </Button>
            </div>

            <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
                Active agent
              </p>
              <p className="mt-1 text-sm font-medium text-nd-text-primary">{activeAgentLabel}</p>
              {state.agentPolicies.find((p) => p.agentId === state.activeAgentId) && (
                <p className="mt-2 text-xs text-nd-text-muted">
                  Models are filtered by this agent&apos;s policy.
                </p>
              )}
            </div>

            {state.modelDetection ? (
              <>
                <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
                  <div className="flex items-center gap-2">
                    <StatusChip
                      tone={state.modelDetection.discoveredModels.length ? "success" : "warning"}
                      size="sm"
                    >
                      {state.modelDetection.discoveredModels.length} found
                    </StatusChip>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-nd-text-muted">
                    {state.modelDetection.summary}
                  </p>
                  <time
                    dateTime={state.modelDetection.scannedAt}
                    className="mt-2 block text-xs text-nd-text-muted"
                  >
                    {new Date(state.modelDetection.scannedAt).toLocaleString()}
                  </time>
                </div>
                <div className="space-y-2" role="list" aria-label="Detected runtimes">
                  {state.modelDetection.runtimes.map((runtime) => (
                    <div
                      key={`${runtime.name}-${runtime.path}`}
                      className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3"
                      role="listitem"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-nd-text-primary/90">{runtime.name}</span>
                        <Badge tone={runtime.exists ? "success" : "neutral"} size="sm">
                          {runtime.status}
                        </Badge>
                      </div>
                      <code className="mt-1 block break-all text-xs text-nd-text-muted/70">
                        {runtime.path}
                      </code>
                    </div>
                  ))}
                </div>
                {Object.keys(scoresMap).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
                      Compatibility
                    </p>
                    <div className="space-y-2" role="list" aria-label="Compatibility scores">
                      {state.models.map((model) => {
                        const score = scoresMap[model.id];
                        if (!score) return null;
                        return (
                          <div
                            key={`score-${model.id}`}
                            className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2"
                            aria-label={`${model.name}: ${score.score}/100, tier ${score.tier}`}
                            role="listitem"
                          >
                            <span className="text-xs text-nd-text-primary/80" aria-hidden="true">
                              {model.name}
                            </span>
                            <div className="flex items-center gap-2" aria-hidden="true">
                              <span className="text-xs text-nd-text-muted">{score.score}/100</span>
                              <Badge
                                tone={
                                  score.score >= 70
                                    ? "success"
                                    : score.score >= 40
                                      ? "warning"
                                      : "danger"
                                }
                                size="sm"
                              >
                                {score.tier}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 text-sm leading-6 text-nd-text-muted">
                Detection runs through the NEURODECK bridge server and checks configured local model
                runtimes. No cloud calls.
              </p>
            )}
          </div>
        </Panel>
      )}

      {importWizardOpen && (
        <LocalModelImportWizard
          open={importWizardOpen}
          onClose={() => setImportWizardOpen(false)}
          onImported={() => void actions.detectModels()}
        />
      )}
    </div>
  );
}
