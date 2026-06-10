import { Activity, AlertTriangle, CheckCircle2, FileArchive, RefreshCcw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { DiagnosticLog, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function DiagnosticsView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const diagnostics = state.diagnostics;

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[420px_1fr]">
      <Panel eyebrow="Diagnostics" title="Runtime Health">
        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button type="button" onClick={() => void actions.refreshDiagnostics()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15">
              <RefreshCcw className="h-4 w-4" /> Refresh Diagnostics
            </button>
            <button type="button" onClick={() => void actions.exportDiagnosticsBundle()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent">
              <FileArchive className="h-4 w-4" /> Export Bundle
            </button>
          </div>
          {diagnostics ? (
            <div className="space-y-2">
              <RuntimeRow label="Platform" value={`${diagnostics.platform}/${diagnostics.arch}`} />
              <RuntimeRow label="Electron" value={diagnostics.electron} />
              <RuntimeRow label="Chrome" value={diagnostics.chrome} />
              <RuntimeRow label="Node" value={diagnostics.node} />
              <RuntimeRow label="Packaged" value={diagnostics.packaged ? 'yes' : 'no'} />
              <RuntimeRow label="Schema" value={diagnostics.schemaVersion ? `v${diagnostics.schemaVersion}` : 'unknown'} />
              <RuntimeRow label="Logs" value={String(diagnostics.logCount)} />
              <RuntimeRow label="User Data" value={diagnostics.userData} wrap />
              <RuntimeRow label="Store" value={diagnostics.storeFile} wrap />
              <RuntimeRow label="Exports" value={diagnostics.exportsDir} wrap />
              {diagnostics.diagnosticsDir && <RuntimeRow label="Diagnostics" value={diagnostics.diagnosticsDir} wrap />}
              <div className="rounded-xl border border-success/20 bg-nd-success/10 px-3 py-2 text-xs text-nd-success">
                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> v6 hardening active</div>
                <p className="mt-1 text-nd-success/80">IPC payload validation, migration metadata, safe errors, and sanitized diagnostics are enabled.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-5 text-center">
              <Activity className="mx-auto h-10 w-10 text-nd-accent" />
              <h3 className="mt-4 font-semibold text-nd-text">No diagnostics loaded</h3>
              <p className="mt-2 text-sm leading-6 text-nd-text-muted">Refresh to read Electron runtime data and recent main-process events.</p>
            </div>
          )}
        </div>
      </Panel>

      <Panel eyebrow="IPC Logs" title="Recent Main Process Events" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 scrollbar-thin">
          {!state.diagnosticLogs.length && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <TerminalSquare className="mx-auto h-12 w-12 text-nd-accent" />
                <h3 className="mt-4 text-xl font-semibold text-nd-text">Logs are quiet</h3>
                <p className="mt-2 text-sm leading-6 text-nd-text-muted">Run a project scan, model detection, export, or diagnostics refresh to populate the event trail.</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {state.diagnosticLogs.map((log) => <LogCard key={log.id} log={log} />)}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RuntimeRow({ label, value, wrap = false }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 text-xs">
      <p className="uppercase tracking-[0.2em] text-nd-text-muted/70">{label}</p>
      <p className={`mt-1 text-nd-text/80 ${wrap ? 'break-all' : ''}`}>{value}</p>
    </div>
  );
}

function LogCard({ log }: { log: DiagnosticLog }) {
  const Icon = log.level === 'error' ? AlertTriangle : log.level === 'warning' ? AlertTriangle : CheckCircle2;
  const tone: 'danger' | 'warning' | 'success' = log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'success';
  return (
    <article className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 ${tone === 'danger' ? 'text-nd-danger' : tone === 'warning' ? 'text-nd-warning' : 'text-nd-success'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{log.level}</Badge>
            <span className="text-xs uppercase tracking-[0.2em] text-nd-text-muted/70">{log.scope}</span>
            <span className="text-xs text-nd-text-muted/70">{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <h3 className="mt-2 font-semibold text-nd-text">{log.message}</h3>
          {log.details && <pre className="mt-3 overflow-x-auto rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-xs text-nd-text">{JSON.stringify(log.details, null, 2)}</pre>}
        </div>
      </div>
    </article>
  );
}
