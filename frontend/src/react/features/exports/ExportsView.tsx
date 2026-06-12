import { FileDown, FileJson, FolderOpen, Sparkles } from 'lucide-react';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function ExportsView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel eyebrow="Export Manager" title="Session Exports" className="h-full overflow-hidden">
        <div className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ExportAction
              icon={FileDown}
              label="Export Markdown"
              description="Full session as readable Markdown with message history."
              onClick={() => void actions.exportSession()}
            />
            <ExportAction
              icon={FileJson}
              label="Save JSON Snapshot"
              description="Machine-readable session state for replay or archival."
              onClick={() => void actions.saveSession()}
            />
          </div>

          {state.lastExportPath && (
            <div className="rounded-2xl border border-nd-success/20 bg-nd-success/[0.06] p-4">
              <p className="text-xs font-semibold text-nd-success">Last export</p>
              <p className="mt-1 break-all text-xs text-nd-text-muted">{state.lastExportPath}</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-nd-text-muted/70">Session Summary</p>
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
              <dl className="grid gap-2 sm:grid-cols-2 text-xs text-nd-text-muted">
                <ExportRow label="Messages"    value={String(state.messages.length)} />
                <ExportRow label="Agent Runs"  value={String(state.aiRuns.length)} />
                <ExportRow label="Memories"    value={String(state.memories.length)} />
                <ExportRow label="Active Model" value={state.models.find((m) => m.id === state.selectedModelId)?.name ?? '—'} />
              </dl>
            </div>
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Diagnostics Export" title="Support Bundle">
        <div className="space-y-3 p-4">
          <p className="text-sm leading-6 text-nd-text-muted">
            Generate a sanitized diagnostics bundle for sharing with support. Contains runtime info, IPC logs, and health data. Secrets are always redacted.
          </p>
          <button
            type="button"
            onClick={() => void actions.exportDiagnosticsBundle()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <FolderOpen className="h-4 w-4" aria-hidden="true" /> Export Diagnostics Bundle
          </button>
          {state.diagnostics?.diagnosticsDir && (
            <p className="break-all text-xs text-nd-text-muted/70">Output: {state.diagnostics.diagnosticsDir}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ExportAction({ icon: Icon, label, description, onClick }: { icon: typeof Sparkles; label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
    >
      <Icon className="h-6 w-6 text-nd-accent" />
      <p className="font-semibold text-nd-text">{label}</p>
      <p className="text-xs leading-5 text-nd-text-muted">{description}</p>
    </button>
  );
}

function ExportRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-nd-text-muted/60">{label}</dt>
      <dd className="mt-0.5 text-nd-text/80">{value}</dd>
    </div>
  );
}
