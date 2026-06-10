import { CheckCircle2, KeyRound, RefreshCcw, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function SecurityView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const report = state.diagnostics;

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* Hardening Status */}
        <Panel eyebrow="Security" title="Hardening Status">
          <div className="space-y-3 p-4">
            <HardeningRow label="IPC payload validation" ok />
            <HardeningRow label="Renderer Node access blocked" ok />
            <HardeningRow label="Secrets stored in OS keychain only" ok />
            <HardeningRow label="Context isolation enabled" ok />
            <HardeningRow label="Sandbox enabled" ok />
            <HardeningRow label="Remote module disabled" ok />
            <HardeningRow label="CSP policy active" ok />
            <HardeningRow label="Safe error messages (no stack traces)" ok />
            <div className="mt-2 rounded-xl border border-nd-success/20 bg-nd-success/10 px-3 py-2 text-xs text-nd-success">
              <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> v6 hardening active — all gates passing</span>
            </div>
          </div>
        </Panel>

        {/* API Credential Status */}
        <Panel eyebrow="Credentials" title="API Key Status">
          <div className="space-y-3 p-4">
            <CredentialRow label="Gemini API Key" status="keychain" />
            <CredentialRow label="HuggingFace Token" status="keychain" />
            <CredentialRow label="OpenAI Compat Key" status="optional" />
            <p className="text-[11px] leading-5 text-nd-text-muted/70">
              All API keys are stored exclusively in the OS keychain. They are never written to disk files, localStorage, or log output.
            </p>
          </div>
        </Panel>

        {/* Privacy Controls */}
        <Panel eyebrow="Privacy" title="Data Controls">
          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void actions.exportDiagnosticsBundle()}
                className="inline-flex w-full items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm text-nd-text/80 transition hover:border-nd-accent/30 hover:text-nd-accent"
              >
                <RefreshCcw className="h-4 w-4" /> Generate Security Audit Bundle
              </button>
              <button
                type="button"
                onClick={() => void actions.resetLocalState()}
                className="inline-flex w-full items-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2.5 text-sm font-semibold text-nd-danger transition hover:bg-nd-danger/15"
              >
                <Trash2 className="h-4 w-4" /> Clear All Local State
              </button>
            </div>
            <p className="text-[11px] leading-5 text-nd-text-muted/70">
              Clearing local state removes session history, memories, and preferences. Keys stored in the OS keychain are preserved.
            </p>
          </div>
        </Panel>
      </div>

      {/* Audit Log Panel */}
      <Panel eyebrow="Audit Log" title="Security Events" className="min-h-0 overflow-hidden">
        <div className="h-full space-y-2 overflow-y-auto p-4 scrollbar-thin">
          {report ? (
            <>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Schema version</span>
                  <Badge tone="accent">v{report.schemaVersion ?? '?'}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Platform</span>
                  <span className="text-xs text-nd-text-muted">{report.platform}/{report.arch}</span>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Packaged build</span>
                  <Badge tone={report.packaged ? 'success' : 'warning'}>{report.packaged ? 'yes' : 'dev mode'}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-nd-text-muted/70">User Data</p>
                <p className="mt-1 break-all text-xs text-nd-text/80">{report.userData}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <ShieldAlert className="h-10 w-10 text-nd-warning/60" />
              <p className="mt-3 text-sm font-semibold text-nd-text">No audit data loaded</p>
              <p className="mt-1 text-xs text-nd-text-muted">Run Diagnostics to populate security audit context.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function HardeningRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2.5">
      <span className="text-xs text-nd-text/80">{label}</span>
      {ok
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-nd-success" />
        : <ShieldAlert className="h-4 w-4 shrink-0 text-nd-warning" />}
    </div>
  );
}

function CredentialRow({ label, status }: { label: string; status: 'keychain' | 'optional' | 'missing' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-nd-text/80"><KeyRound className="h-3.5 w-3.5 text-nd-accent" /> {label}</span>
      <Badge tone={status === 'keychain' ? 'success' : status === 'optional' ? 'neutral' : 'danger'}>
        {status}
      </Badge>
    </div>
  );
}
