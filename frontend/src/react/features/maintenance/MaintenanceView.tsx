import { useState } from "react";
import { Activity, CheckCircle2, RefreshCcw, Trash2, Wrench } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

export function MaintenanceView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  const diagnostics = state.diagnostics;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* Version Info */}
        <Panel eyebrow="Build" title="Application Version">
          <div className="space-y-2 p-4">
            {diagnostics ? (
              <>
                <InfoRow label="Electron" value={diagnostics.electron} />
                <InfoRow label="Chromium" value={diagnostics.chrome} />
                <InfoRow label="Node" value={diagnostics.node} />
                <InfoRow label="Platform" value={`${diagnostics.platform}/${diagnostics.arch}`} />
                <InfoRow label="Schema" value={`v${diagnostics.schemaVersion ?? "?"}`} />
                <InfoRow
                  label="Build type"
                  value={diagnostics.packaged ? "packaged" : "development"}
                />
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                Run a diagnostics refresh to load build info.
              </p>
            )}
          </div>
        </Panel>

        {/* Maintenance Actions */}
        <Panel eyebrow="Actions" title="System Maintenance">
          <div className="space-y-2 p-4">
            <Button
              variant="primary"
              fullWidth
              icon={RefreshCcw}
              onClick={() => void actions.refreshDiagnostics()}
            >
              Refresh Diagnostics
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={Activity}
              onClick={() => void actions.exportDiagnosticsBundle()}
            >
              Export Support Bundle
            </Button>
            <Button variant="danger" fullWidth icon={Trash2} onClick={() => setConfirmReset(true)}>
              Clear Local State
            </Button>
          </div>
        </Panel>
      </div>

      {/* Health Overview */}
      <Panel eyebrow="Health" title="System Status">
        <div className="space-y-4 p-4">
          <Button
            variant="primary"
            fullWidth
            icon={Wrench}
            onClick={() => void actions.checkAiHealth()}
          >
            Check AI Health
          </Button>

          {state.aiHealth.length > 0 ? (
            <div className="space-y-2">
              {state.aiHealth.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-secondary/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    {provider.available ? (
                      <CheckCircle2 className="h-4 w-4 text-accent-success" aria-hidden="true" />
                    ) : (
                      <Activity className="h-4 w-4 text-accent-warning" aria-hidden="true" />
                    )}
                    <span className="text-xs text-text-primary">{provider.provider}</span>
                  </div>
                  <StatusChip tone={provider.available ? "success" : "warning"} size="sm">
                    {provider.available ? `${provider.latencyMs ?? "?"}ms` : "unavailable"}
                  </StatusChip>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No health data yet"
              description="Check AI health to populate provider availability and latency."
              compact
              className="rounded-2xl border border-dashed border-border-subtle bg-surface-secondary/30"
            />
          )}

          <MetricCard
            label="Diagnostics Log"
            value={state.diagnosticLogs.length}
            icon={Activity}
            hint="Main-process events"
          />
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void actions.resetLocalState();
        }}
        title="Clear all local state?"
        message="This will permanently remove all session history, memories, and preferences. Keys stored in the OS keychain are preserved. This action cannot be undone."
        confirmLabel="Clear State"
        cancelLabel="Cancel"
        destructive
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-secondary/40 px-3 py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}
