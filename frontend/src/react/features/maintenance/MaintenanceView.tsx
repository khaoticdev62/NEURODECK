import { Activity, CheckCircle2, RefreshCcw, Trash2, Wrench } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function MaintenanceView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const diagnostics = state.diagnostics;

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
                <InfoRow label="Schema" value={`v${diagnostics.schemaVersion ?? '?'}`} />
                <InfoRow label="Build type" value={diagnostics.packaged ? 'packaged' : 'development'} />
              </>
            ) : (
              <p className="text-sm text-nd-text-muted">Run a diagnostics refresh to load build info.</p>
            )}
          </div>
        </Panel>

        {/* Maintenance Actions */}
        <Panel eyebrow="Actions" title="System Maintenance">
          <div className="space-y-2 p-4">
            <ActionRow
              icon={RefreshCcw}
              label="Refresh Diagnostics"
              description="Re-read runtime state, IPC logs, and health data."
              variant="accent"
              onClick={() => void actions.refreshDiagnostics()}
            />
            <ActionRow
              icon={Activity}
              label="Export Support Bundle"
              description="Package sanitized diagnostics into a shareable archive."
              variant="neutral"
              onClick={() => void actions.exportDiagnosticsBundle()}
            />
            <ActionRow
              icon={Trash2}
              label="Clear Local State"
              description="Reset all session history, memories, and preferences. Keys in the OS keychain are preserved."
              variant="danger"
              onClick={() => void actions.resetLocalState()}
            />
          </div>
        </Panel>
      </div>

      {/* Health Overview */}
      <Panel eyebrow="Health" title="System Status">
        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => void actions.checkAiHealth()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" /> Check AI Health
          </button>

          {state.aiHealth.length > 0 ? (
            <div className="space-y-2">
              {state.aiHealth.map((provider) => (
                <div key={provider.provider} className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {provider.available
                      ? <CheckCircle2 className="h-4 w-4 text-nd-success" aria-hidden="true" />
                      : <Activity className="h-4 w-4 text-nd-warning" aria-hidden="true" />}
                    <span className="text-xs text-nd-text/80">{provider.provider}</span>
                  </div>
                  <Badge tone={provider.available ? 'success' : 'neutral'}>
                    {provider.available ? `${provider.latencyMs ?? '?'}ms` : 'unavailable'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-nd-text-muted">No health data yet. Check AI health to populate.</p>
          )}

          <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-nd-text-muted/70">Diagnostics Log</p>
            <p className="mt-1 text-xs text-nd-text/80">{state.diagnosticLogs.length} entries</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2">
      <span className="text-xs text-nd-text-muted/70">{label}</span>
      <span className="font-mono text-xs text-nd-text/80">{value}</span>
    </div>
  );
}

function ActionRow({ icon: Icon, label, description, variant, onClick }: { icon: typeof RefreshCcw; label: string; description: string; variant: 'accent' | 'neutral' | 'danger'; onClick: () => void }) {
  const cls = {
    accent:  'border-nd-accent/25 bg-nd-accent/10 text-nd-accent hover:bg-nd-accent/15',
    neutral: 'border-nd-text-muted/15 bg-nd-surface/40 text-nd-text/80 hover:border-nd-accent/30 hover:text-nd-accent',
    danger:  'border-nd-danger/25 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/15',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${cls}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 text-xs leading-5 opacity-70">{description}</p>
      </div>
    </button>
  );
}
