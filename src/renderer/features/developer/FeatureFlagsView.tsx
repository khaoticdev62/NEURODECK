import { useState, useCallback, useEffect } from "react";
import { Flag, RotateCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { Toggle } from "../../components/primitives/Toggle";
import { Badge } from "../../components/primitives/Badge";
import type { NeuroDeckState } from "../../types/neurodeck";

interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  category: "developer" | "experimental" | "early-access";
  defaultValue: boolean;
  restartRequired?: boolean;
}

const FLAG_DEFINITIONS: FeatureFlag[] = [
  {
    id: "developer_mode",
    label: "Developer Mode",
    description: "Enables Dev Console, IPC Connector Map, and raw command testing.",
    category: "developer",
    defaultValue: false,
    restartRequired: true,
  },
  {
    id: "neural_focus_mode",
    label: "Focus Mode",
    description: "Fullscreen focus mode with auto-hide navigation UI.",
    category: "experimental",
    defaultValue: false,
  },
  {
    id: "split_workspace",
    label: "Split Workspace",
    description: "Side-by-side workspace and terminal layout.",
    category: "experimental",
    defaultValue: true,
  },
  {
    id: "context_indexer_v2",
    label: "Context Indexer v2",
    description: "Experimental faster context indexer (beta).",
    category: "experimental",
    defaultValue: false,
  },
  {
    id: "model_marketplace",
    label: "Model Marketplace",
    description: "Browse and install models from the built-in catalog.",
    category: "experimental",
    defaultValue: false,
  },
  {
    id: "lua_automation",
    label: "Lua Automation Editor",
    description: "In-app Lua script editor with live output console.",
    category: "experimental",
    defaultValue: true,
  },
  {
    id: "warpinator_v2",
    label: "Warpinator v2",
    description: "gRPC v2 Warpinator protocol — incompatible with v1 peers.",
    category: "early-access",
    defaultValue: false,
    restartRequired: true,
  },
];

const STORAGE_KEY = "nd:feature-flags";

function loadFlags(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveFlags(flags: Record<string, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

export function FeatureFlagsView({ state: _state }: { state: NeuroDeckState }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pendingRestart, setPendingRestart] = useState(false);

  useEffect(() => {
    setOverrides(loadFlags());
  }, []);

  const getValue = useCallback(
    (flag: FeatureFlag): boolean => overrides[flag.id] ?? flag.defaultValue,
    [overrides]
  );

  const handleToggle = useCallback(
    (flag: FeatureFlag, value: boolean) => {
      const next = { ...overrides, [flag.id]: value };
      setOverrides(next);
      saveFlags(next);
      if (flag.restartRequired) setPendingRestart(true);
    },
    [overrides]
  );

  const handleReset = useCallback(() => {
    setOverrides({});
    saveFlags({});
    setPendingRestart(false);
  }, []);

  const isDefault = Object.keys(overrides).length === 0;

  const categories: Array<{ id: FeatureFlag["category"]; label: string }> = [
    { id: "developer", label: "Developer" },
    { id: "experimental", label: "Experimental Features" },
    { id: "early-access", label: "Early Access" },
  ];

  return (
    <Panel
      eyebrow="Developer"
      title="Feature Flags"
      data-testid="feature-flags-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={handleReset}
          disabled={isDefault}
          aria-label="Reset all feature flags to defaults"
        >
          Reset All
        </Button>
      }
    >
      {pendingRestart && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-nd-status-warning/40 bg-nd-status-warning/10 px-4 py-3"
        >
          <p className="text-sm text-nd-status-warning">
            Restart required to apply flag changes.
          </p>
          <Button variant="secondary" size="sm">
            Restart Now
          </Button>
        </div>
      )}

      <div
        role="alert"
        className="mx-4 mt-4 rounded-xl border border-nd-status-warning/30 bg-nd-status-warning/5 px-4 py-3 text-sm text-nd-text-muted"
      >
        ⚠ Experimental features may be unstable. Use with caution.
      </div>

      <div className="flex flex-col gap-6 p-4">
        {categories.map((cat) => {
          const flags = FLAG_DEFINITIONS.filter((f) => f.category === cat.id);
          return (
            <section key={cat.id} aria-label={cat.label}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                {cat.label}
              </h2>
              <div className="flex flex-col gap-2" role="list">
                {flags.map((flag) => {
                  const on = getValue(flag);
                  const isModified = overrides[flag.id] !== undefined;
                  return (
                    <div
                      key={flag.id}
                      role="listitem"
                      className="flex items-start justify-between gap-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-nd-text-primary">{flag.label}</span>
                          {flag.restartRequired && (
                            <Badge tone="warning" size="sm">
                              Restart required
                            </Badge>
                          )}
                          {isModified && (
                            <Badge tone="accent" size="sm">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-nd-text-muted">{flag.description}</p>
                        <p className="mt-1 font-mono text-xs text-nd-text-muted/60">{flag.id}</p>
                      </div>
                      <Toggle
                        checked={on}
                        onChange={() => handleToggle(flag, !on)}
                        label={`${flag.label}: ${flag.description}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {FLAG_DEFINITIONS.length === 0 && (
          <EmptyState
            icon={Flag}
            title="No feature flags"
            description="Feature flags will appear here when defined."
            variant="default"
          />
        )}
      </div>
    </Panel>
  );
}
