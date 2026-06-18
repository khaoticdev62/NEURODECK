import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HardDrive,
  History,
  Trash2,
} from "lucide-react";
import { bridgeInvoke } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { IconButton } from "../../components/primitives/IconButton";
import type { NeuroDeckAction, ViewId } from "../../types/neurodeck";

export interface StorageCategory {
  id: string;
  label: string;
  bytes: number;
  manageable: boolean;
  targetView?: ViewId;
}

export interface StorageUsage {
  totalBytes: number;
  categories: StorageCategory[];
  lowSpace?: boolean;
}

type ClearTarget =
  | { kind: "category"; id: string }
  | { kind: "quick"; action: string };

function formatBytes(bytes = 0): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let scaled = bytes;
  let i = 0;
  while (scaled >= 1024 && i < units.length - 1) {
    scaled /= 1024;
    i += 1;
  }
  return `${scaled.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

const defaultCategories: StorageCategory[] = [
  { id: "sessions", label: "Sessions", bytes: 0, manageable: true, targetView: "sessions" },
  { id: "aiModels", label: "AI Models", bytes: 0, manageable: true, targetView: "models" },
  { id: "memoryDb", label: "Memory DB", bytes: 0, manageable: true, targetView: "memory" },
  { id: "exports", label: "Exports", bytes: 0, manageable: true, targetView: "exports" },
  { id: "logs", label: "Logs", bytes: 0, manageable: false },
  { id: "pluginCache", label: "Plugin Cache", bytes: 0, manageable: false },
  { id: "syncCache", label: "Sync Cache", bytes: 0, manageable: false, targetView: "sync" },
];

interface StorageViewProps {
  dispatch: React.Dispatch<NeuroDeckAction>;
}

export function StorageView({ dispatch }: StorageViewProps) {
  const [usage, setUsage] = useState<StorageUsage>({
    totalBytes: 0,
    categories: defaultCategories,
  });
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearTarget, setClearTarget] = useState<ClearTarget | null>(null);
  const [factoryResetStep, setFactoryResetStep] = useState<null | "warning" | "final">(null);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCalculating(true);
    try {
      const data = await bridgeInvoke<StorageUsage>("get_storage_usage");
      setUsage({
        totalBytes: data?.totalBytes ?? 0,
        lowSpace: data?.lowSpace,
        categories:
          data?.categories?.map((cat) => ({
            ...defaultCategories.find((d) => d.id === cat.id),
            ...cat,
          })) ?? defaultCategories,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const categories = usage.categories;
  const total = usage.totalBytes;
  const lowSpace = usage.lowSpace;

  async function handleClearCategory(id: string) {
    setClearTarget(null);
    setCalculating(true);
    try {
      await bridgeInvoke("clear_storage_category", { category: id });
      await loadUsage();
    } catch (e) {
      setError(String(e));
      setCalculating(false);
    }
  }

  async function handleQuickClean(action: string) {
    setClearTarget(null);
    setCalculating(true);
    try {
      await bridgeInvoke("clear_storage_category", { category: action });
      await loadUsage();
    } catch (e) {
      setError(String(e));
      setCalculating(false);
    }
  }

  async function handleFactoryReset() {
    setFactoryResetStep(null);
    setCalculating(true);
    try {
      await bridgeInvoke("factory_reset");
    } catch (e) {
      setError(String(e));
      setCalculating(false);
    }
  }

  const clearTitle = useMemo(() => {
    if (!clearTarget) return "";
    if (clearTarget.kind === "category") {
      const cat = categories.find((c) => c.id === clearTarget.id);
      return `Clear ${cat?.label ?? clearTarget.id}?`;
    }
    if (clearTarget.action === "logs_7d") return "Clear logs older than 7 days?";
    if (clearTarget.action === "archived_30d") return "Delete archived sessions older than 30 days?";
    return "Clear model download cache?";
  }, [clearTarget, categories]);

  const clearMessage = useMemo(() => {
    if (!clearTarget) return "";
    if (clearTarget.kind === "category") {
      const cat = categories.find((c) => c.id === clearTarget.id);
      return `This will free ${formatBytes(cat?.bytes ?? 0)} from ${cat?.label ?? "this category"}.`;
    }
    if (clearTarget.action === "logs_7d") return "All log files older than 7 days will be permanently deleted.";
    if (clearTarget.action === "archived_30d") return "Archived sessions older than 30 days will be permanently deleted.";
    return "Incomplete and cached model downloads will be removed.";
  }, [clearTarget, categories]);

  return (
    <div data-testid="storage-view" className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
      <Panel
        eyebrow={calculating ? "Calculating storage…" : "System"}
        title="Storage Manager"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={History}
            onClick={() => void loadUsage()}
            disabled={loading || calculating}
            loading={loading || calculating}
          >
            Refresh
          </Button>
        }
      >
        {lowSpace && (
          <div className="mx-4 mt-4 rounded-xl border border-nd-accent-warning/30 bg-nd-accent-warning/10 px-3 py-2 text-xs text-nd-accent-warning">
            Disk space is low. Clear cached data to free space.
          </div>
        )}

        {error && (
          <div className="px-4 pt-4">
            <ErrorState
              title="Could not load storage usage"
              message={error}
              onRetry={() => void loadUsage()}
              onClose={() => setError(null)}
            />
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <p className="text-sm text-nd-text-secondary">
              Total data: <span className="font-semibold text-nd-text-primary">{formatBytes(total)}</span>
            </p>
          )}
        </div>

        <div className="space-y-2 px-4 pb-4">
          {loading && categories.every((c) => c.bytes === 0) ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : categories.every((c) => c.bytes === 0) ? (
            <EmptyState
              icon={HardDrive}
              title="No storage data"
              description="Storage usage could not be calculated."
              action={
                <Button variant="primary" onClick={() => void loadUsage()}>
                  Retry
                </Button>
              }
              variant="deck"
            />
          ) : (
            categories.map((cat) => {
              const pct = percent(cat.bytes, total);
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-nd-text-primary">{cat.label}</span>
                      <span className="text-xs tabular-nums text-nd-text-muted">{formatBytes(cat.bytes)}</span>
                    </div>
                    <div
                      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-nd-surface-tertiary"
                      role="meter"
                      aria-label={`${cat.label}: ${formatBytes(cat.bytes)}`}
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-nd-accent-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {cat.manageable && cat.targetView ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => dispatch({ type: "set-view", view: cat.targetView! })}
                      aria-label={`Manage ${cat.label}`}
                    >
                      Manage →
                    </Button>
                  ) : (
                    <IconButton
                      variant="subtle"
                      size="sm"
                      aria-label={`Clear ${cat.label} cache (${formatBytes(cat.bytes)})`}
                      onClick={() => setClearTarget({ kind: "category", id: cat.id })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Panel>

      <Panel eyebrow="Cleanup" title="Quick Clean">
        <div className="space-y-2 p-4">
          {[
            { id: "logs_7d", label: "Clear logs older than 7 days" },
            { id: "archived_30d", label: "Delete archived sessions older than 30 days" },
            { id: "model_cache", label: "Clear model download cache" },
          ].map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3"
            >
              <span className="text-sm text-nd-text-primary">{action.label}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setClearTarget({ kind: "quick", action: action.id })}
              >
                Clear
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Danger" title="Danger Zone" variant="surface">
        <div className="space-y-3 p-4">
          <p className="text-xs text-nd-text-muted">
            These actions permanently remove NEURODECK data and cannot be undone.
          </p>
          <Button
            variant="danger"
            fullWidth
            icon={Trash2}
            onClick={() => setFactoryResetStep("warning")}
            aria-label="Danger zone: Delete all data"
          >
            Delete All Data and Reset
          </Button>
        </div>
      </Panel>

      <ConfirmDialog
        open={!!clearTarget}
        onCancel={() => setClearTarget(null)}
        onConfirm={() => {
          if (!clearTarget) return;
          if (clearTarget.kind === "category") {
            void handleClearCategory(clearTarget.id);
          } else {
            void handleQuickClean(clearTarget.action);
          }
        }}
        title={clearTitle}
        message={clearMessage}
        confirmLabel="Clear"
        destructive
      />

      <ConfirmDialog
        open={factoryResetStep === "warning"}
        onCancel={() => setFactoryResetStep(null)}
        onConfirm={() => setFactoryResetStep("final")}
        title="Delete ALL NEURODECK data?"
        message="This will delete ALL NEURODECK data and reset the app. This action cannot be undone."
        confirmLabel="Continue"
        destructive
      />

      <ConfirmDialog
        open={factoryResetStep === "final"}
        onCancel={() => setFactoryResetStep(null)}
        onConfirm={() => {
          setFactoryResetStep(null);
          void handleFactoryReset();
        }}
        title="This cannot be undone"
        message="All sessions, memories, model cache, and settings will be removed. Continue?"
        confirmLabel="Confirm Reset"
        destructive
      />
    </div>
  );
}
