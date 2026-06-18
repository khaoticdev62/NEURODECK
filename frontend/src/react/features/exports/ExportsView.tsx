import { FileDown, FileJson, FolderOpen, Sparkles } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

export function ExportsView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  return (
    <div data-testid="exports-view" className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel eyebrow="Export Manager" title="Session Exports" className="h-full overflow-hidden">
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 scrollbar-thin">
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
            <div className="rounded-2xl border border-nd-accent-success/20 bg-nd-accent-success/5 p-4">
              <div className="flex items-center gap-2">
                <Badge tone="success">Last export</Badge>
              </div>
              <p className="mt-2 break-all text-xs text-nd-text-secondary">{state.lastExportPath}</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-nd-text-muted">
              Session Summary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Messages"
                value={state.messages.length}
                icon={Sparkles}
                hint="Current thread"
              />
              <MetricCard
                label="Agent Runs"
                value={state.aiRuns.length}
                icon={Sparkles}
                hint="Executed runs"
              />
              <MetricCard
                label="Memories"
                value={state.memories.length}
                icon={Sparkles}
                hint="Stored facts"
              />
              <MetricCard
                label="Active Model"
                value={state.models.find((m) => m.id === state.selectedModelId)?.name ?? "—"}
                icon={Sparkles}
                hint="Selected runtime"
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Diagnostics Export" title="Support Bundle">
        <div className="space-y-4 p-4">
          <p className="text-sm leading-relaxed text-nd-text-secondary">
            Generate a sanitized diagnostics bundle for sharing with support. Contains runtime info,
            IPC logs, and health data. Secrets are always redacted.
          </p>
          <Button
            variant="primary"
            fullWidth
            icon={FolderOpen}
            onClick={() => void actions.exportDiagnosticsBundle()}
          >
            Export Diagnostics Bundle
          </Button>
          {state.diagnostics?.diagnosticsDir && (
            <p className="break-all text-xs text-nd-text-muted">
              Output: {state.diagnostics.diagnosticsDir}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ExportAction({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-touch flex flex-col gap-2 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 text-left transition duration-fast hover:border-nd-accent-primary/30 hover:bg-nd-surface-tertiary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
    >
      <Icon className="h-6 w-6 text-nd-accent-primary" aria-hidden="true" />
      <p className="font-semibold text-nd-text-primary">{label}</p>
      <p className="text-xs leading-5 text-nd-text-muted">{description}</p>
    </button>
  );
}
