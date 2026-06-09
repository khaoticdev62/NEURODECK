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
            <button type="button" onClick={() => void actions.refreshDiagnostics()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
              <RefreshCcw className="h-4 w-4" /> Refresh Diagnostics
            </button>
            <button type="button" onClick={() => void actions.exportDiagnosticsBundle()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
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
              <div className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> v6 hardening active</div>
                <p className="mt-1 text-success/80">IPC payload validation, migration metadata, safe errors, and sanitized diagnostics are enabled.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-center">
              <Activity className="mx-auto h-10 w-10 text-neuro" />
              <h3 className="mt-4 font-semibold text-slate-100">No diagnostics loaded</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Refresh to read Electron runtime data and recent main-process events.</p>
            </div>
          )}
        </div>
      </Panel>

      <Panel eyebrow="IPC Logs" title="Recent Main Process Events" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 scrollbar-thin">
          {!state.diagnosticLogs.length && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <TerminalSquare className="mx-auto h-12 w-12 text-neuro" />
                <h3 className="mt-4 text-xl font-semibold text-slate-50">Logs are quiet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Run a project scan, model detection, export, or diagnostics refresh to populate the event trail.</p>
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
    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs">
      <p className="uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className={`mt-1 text-slate-300 ${wrap ? 'break-all' : ''}`}>{value}</p>
    </div>
  );
}

function LogCard({ log }: { log: DiagnosticLog }) {
  const Icon = log.level === 'error' ? AlertTriangle : log.level === 'warning' ? AlertTriangle : CheckCircle2;
  const tone: 'danger' | 'warning' | 'success' = log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'success';
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-success'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{log.level}</Badge>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-600">{log.scope}</span>
            <span className="text-xs text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <h3 className="mt-2 font-semibold text-slate-100">{log.message}</h3>
          {log.details && <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-500">{JSON.stringify(log.details, null, 2)}</pre>}
        </div>
      </div>
    </article>
  );
}
