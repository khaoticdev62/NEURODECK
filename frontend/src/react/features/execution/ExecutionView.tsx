import { BrainCircuit, CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { AgentRun, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function ExecutionView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Execution Layer" title="AI Runs & Tool Audit" className="min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 scrollbar-thin">
          {!state.aiRuns.length && (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
              <BrainCircuit className="mx-auto h-10 w-10 text-neuro" />
              <h3 className="mt-4 text-lg font-semibold text-slate-100">No agent runs yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Run an agent from the Agent Dock or use a prompt template. Runs are recorded here with provider, model, status, prompt, result, and context usage.
              </p>
              <button type="button" onClick={() => void actions.runAgent('architect')} className="mt-5 rounded-xl border border-neuro/25 bg-neuro/10 px-4 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
                Run Architect Agent
              </button>
            </div>
          )}
          <div className="space-y-3">
            {state.aiRuns.map((run) => <RunCard key={run.id} run={run} />)}
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Prompt Templates" title="Reusable Task Starters">
        <div className="space-y-3 p-4">
          {state.promptTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => template.agentId ? void actions.runAgent(template.agentId, template.prompt) : void actions.runAssistant(template.prompt)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-neuro/30 hover:bg-neuro/[0.06]"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge tone="accent">{template.category}</Badge>
                {template.agentId && <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">{template.agentId}</span>}
              </div>
              <h3 className="mt-3 font-semibold text-slate-100">{template.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{template.prompt}</p>
            </button>
          ))}
          <button type="button" onClick={() => void actions.saveSession()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neuro/25 bg-neuro/10 px-4 py-3 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
            <FileText className="h-4 w-4" /> Save execution session
          </button>
        </div>
      </Panel>
    </div>
  );
}

function RunCard({ run }: { run: AgentRun }) {
  const Icon = run.status === 'complete' ? CheckCircle2 : run.status === 'failed' ? XCircle : Clock3;
  const tone = run.status === 'complete' ? 'success' : run.status === 'failed' ? 'danger' : 'accent';
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neuro/25 bg-neuro/10 text-neuro">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{run.agentName}</h3>
            <p className="text-xs text-slate-500">{run.provider} • {run.model}</p>
          </div>
        </div>
        <Badge tone={tone}>{run.status}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
        <Row label="Started" value={run.startedAt} />
        <Row label="Finished" value={run.finishedAt ?? 'running'} />
        <Row label="Context" value={run.usedProjectContext ? 'attached' : 'none'} />
        <Row label="Agent" value={run.agentId} />
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Prompt</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{run.prompt}</p>
      </div>
      {(run.result || run.error) && (
        <div className={`mt-3 rounded-2xl border p-3 ${run.error ? 'border-danger/20 bg-danger/10' : 'border-neuro/20 bg-neuro/[0.045]'}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">{run.error ? 'Error' : 'Result'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{run.error ?? run.result}</p>
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className="mt-1 truncate text-slate-300">{value}</p>
    </div>
  );
}
