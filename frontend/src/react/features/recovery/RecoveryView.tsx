import type { Dispatch } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCcw, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function RecoveryView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  const hasError = !!state.lastError;

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* Active Error */}
        <Panel eyebrow="Recovery" title="Current Error State">
          <div className="p-4">
            {hasError ? (
              <div className="rounded-2xl border border-nd-danger/25 bg-nd-danger/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nd-danger" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-nd-text">{state.lastError!.title}</p>
                    <p className="mt-1 text-sm leading-6 text-nd-text-muted">{state.lastError!.message}</p>
                    {state.lastError!.action && (
                      <p className="mt-2 rounded-lg bg-nd-danger/10 px-3 py-2 text-xs text-nd-danger/90">
                        {state.lastError!.action}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'set-error', error: null })}
                    className="inline-flex items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-2 text-sm text-nd-text/80 transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => void actions.refreshDiagnostics()}
                    className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <RefreshCcw className="h-4 w-4" /> Run Diagnostics
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-nd-success" />
                <p className="mt-3 font-semibold text-nd-text">No active errors</p>
                <p className="mt-1 text-sm text-nd-text-muted">All systems are operating normally.</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Recovery Actions */}
        <Panel eyebrow="Actions" title="Recovery Options">
          <div className="space-y-2 p-4">
            <RecoveryAction
              icon={RefreshCcw}
              label="Reload Diagnostics"
              description="Refresh all runtime health data and IPC event logs."
              badge="Safe"
              badgeTone="success"
              onClick={() => void actions.refreshDiagnostics()}
            />
            <RecoveryAction
              icon={RotateCcw}
              label="Check AI Health"
              description="Re-probe all configured AI providers for availability."
              badge="Safe"
              badgeTone="success"
              onClick={() => void actions.checkAiHealth()}
            />
            <RecoveryAction
              icon={Trash2}
              label="Clear Local State"
              description="Wipe all session history, memories, and preferences. OS keychain keys are preserved."
              badge="Destructive"
              badgeTone="danger"
              onClick={() => void actions.resetLocalState()}
            />
          </div>
        </Panel>
      </div>

      {/* Diagnostics Log */}
      <Panel eyebrow="Event Log" title="Recent Events" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 scrollbar-thin">
          {state.diagnosticLogs.length > 0 ? (
            <div className="space-y-2">
              {state.diagnosticLogs.slice(-30).reverse().map((log) => (
                <div key={log.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      tone={log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'neutral'}
                    >
                      {log.level}
                    </Badge>
                    <span className="text-[10px] text-nd-text-muted/60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-nd-text/80">{log.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <ShieldAlert className="h-8 w-8 text-nd-text-muted/40" />
              <p className="mt-3 text-sm text-nd-text-muted">No events logged yet.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function RecoveryAction({ icon: Icon, label, description, badge, badgeTone, onClick }: {
  icon: typeof RefreshCcw;
  label: string;
  description: string;
  badge: string;
  badgeTone: 'success' | 'danger' | 'warning' | 'neutral';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-3 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-nd-text">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-nd-text-muted">{description}</p>
      </div>
      <Badge tone={badgeTone}>{badge}</Badge>
    </button>
  );
}
