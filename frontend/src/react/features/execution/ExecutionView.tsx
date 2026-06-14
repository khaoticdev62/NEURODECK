import { BrainCircuit, CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Button } from '../../components/primitives/Button';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Panel } from '../../components/primitives/Panel';
import type { AgentRun, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function ExecutionView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Execution Layer" title="AI Runs & Tool Audit" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-1 scrollbar-thin">
          {!state.aiRuns.length && (
            <EmptyState
              icon={BrainCircuit}
              title="No agent runs yet"
              description="Run an agent from the Agent Dock or use a prompt template. Runs are recorded here with provider, model, status, prompt, result, and context usage."
              className="rounded-3xl border border-dashed border-border-subtle bg-surface-secondary/60"
              action={
                <Button
                  variant="primary"
                  onClick={() => void actions.runAgent('architect')}
                >
                  Run Architect Agent
                </Button>
              }
            />
          )}
          <div className="space-y-3">
            {state.aiRuns.map((run) => <RunCard key={run.id} run={run} />)}
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Prompt Templates" title="Reusable Task Starters">
        <div className="space-y-3 p-1">
          {state.promptTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => template.agentId ? void actions.runAgent(template.agentId, template.prompt) : void actions.runAssistant(template.prompt)}
              className="w-full rounded-2xl border border-border-subtle bg-surface-secondary p-4 text-left transition hover:border-accent-primary/30 hover:bg-accent-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge tone="accent">{template.category}</Badge>
                {template.agentId && <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{template.agentId}</span>}
              </div>
              <h3 className="mt-3 font-semibold text-text-primary">{template.title}</h3>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{template.prompt}</p>
            </button>
          ))}
          <Button
            variant="soft"
            fullWidth
            onClick={() => void actions.saveSession()}
            icon={FileText}
          >
            Save execution session
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function RunCard({ run }: { run: AgentRun }) {
  const Icon = run.status === 'complete' ? CheckCircle2 : run.status === 'failed' ? XCircle : Clock3;
  const tone = run.status === 'complete' ? 'success' : run.status === 'failed' ? 'danger' : 'accent';
  return (
    <article className="rounded-2xl border border-border-subtle bg-surface-secondary p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{run.agentName}</h3>
            <p className="text-xs text-text-muted">{run.provider} • {run.model}</p>
          </div>
        </div>
        <Badge tone={tone}>{run.status}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-text-secondary md:grid-cols-2">
        <Row label="Started" value={run.startedAt} />
        <Row label="Finished" value={run.finishedAt ?? 'running'} />
        <Row label="Context" value={run.usedProjectContext ? 'attached' : 'none'} />
        <Row label="Agent" value={run.agentId} />
      </div>
      <div className="mt-3 rounded-xl border border-border-subtle bg-surface-secondary/60 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Prompt</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{run.prompt}</p>
      </div>
      {(run.result || run.error) && (
        <div className={`mt-3 rounded-xl border p-3 ${run.error ? 'border-accent-error/20 bg-accent-error/10' : 'border-accent-primary/20 bg-accent-primary/[0.045]'}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{run.error ? 'Error' : 'Result'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{run.error ?? run.result}</p>
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-1 truncate text-text-secondary">{value}</p>
    </div>
  );
}
