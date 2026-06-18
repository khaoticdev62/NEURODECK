import type { Dispatch } from "react";
import { BrainCircuit, RefreshCcw } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { LoadingState } from "../../../components/primitives/LoadingState";
import { Panel } from "../../../components/primitives/Panel";
import { neurodeckApi } from "../../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../../types/neurodeck";
import { useProviderOptions } from "../hooks/useProviderOptions";

export interface AiSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}

export function AiSettingsPanel({ state, dispatch, actions }: AiSettingsPanelProps) {
  const { providerOptions, providersLoading, providersError, retryProviders } = useProviderOptions();

  return (
    <div id="sp-ai" className="settings-panel active space-y-4">
      <Panel eyebrow="AI Runtime" title="Provider Selection">
        <div className="space-y-2 p-4">
          {providersLoading && (
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
              <LoadingState size="sm" label="Loading provider runtimes…" />
            </div>
          )}
          {providersError && (
            <ErrorState
              title="Provider load failed"
              message={providersError}
              onRetry={retryProviders}
              retryLabel="Retry"
            />
          )}
          {!providersLoading &&
            providerOptions.map((provider) => {
              const health = state.aiHealth.find((item) => item.provider === provider.id);
              const active = state.selectedProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Select ${provider.label} as AI provider`}
                  onClick={() => {
                    dispatch({ type: "set-provider", provider: provider.id });
                    void neurodeckApi.ai.setProvider(provider.id);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
                    active
                      ? "border-nd-accent-primary/40 bg-nd-accent-primary/[0.07]"
                      : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <BrainCircuit
                        className="h-4 w-4 shrink-0 text-nd-accent-primary"
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-nd-text-primary text-sm truncate">
                        {provider.label}
                      </span>
                    </div>
                    <Badge
                      tone={
                        health?.available
                          ? "success"
                          : provider.id === "offline-draft"
                            ? "success"
                            : "warning"
                      }
                    >
                      {health?.available ? "ready" : "cold"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-nd-text-muted leading-5">
                    {provider.description}
                  </p>
                  {health?.detail && (
                    <p className="mt-1 text-xs text-nd-text-muted/70">{health.detail}</p>
                  )}
                </button>
              );
            })}
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={RefreshCcw}
            onClick={() => void actions.checkAiHealth()}
          >
            Check AI Health
          </Button>
        </div>
      </Panel>
    </div>
  );
}
