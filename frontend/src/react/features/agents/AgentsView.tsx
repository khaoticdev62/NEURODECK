import type { Dispatch } from 'react';
import { Bot, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function AgentsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  return (
    <Panel eyebrow="Agent Dock" title="Specialized Operators" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin md:grid-cols-2 2xl:grid-cols-3">
        {state.agents.map((agent) => (
          <article key={agent.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-neuro/30 hover:bg-neuro/[0.055]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neuro/25 bg-neuro/10 text-neuro">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{agent.name}</h3>
                  <p className="text-xs text-slate-500">{agent.role}</p>
                </div>
              </div>
              <Badge tone={agent.status === 'thinking' ? 'accent' : agent.status === 'complete' ? 'success' : agent.status === 'blocked' ? 'danger' : 'neutral'}>{agent.status}</Badge>
            </div>
            <dl className="mt-4 space-y-2 text-xs text-slate-400">
              <Row label="Model" value={agent.model} />
              <Row label="Memory" value={agent.memoryAccess} />
              <Row label="Task" value={agent.task} />
              <Row label="Last" value={agent.lastAction} />
            </dl>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void actions.runAgent(agent.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
                <PlayCircle className="h-4 w-4" /> Run Agent
              </button>
              <button type="button" onClick={() => dispatch({ type: 'toggle-agent', id: agent.id })} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/30 hover:text-neuro">
                <RotateCcw className="h-4 w-4" /> Cycle
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
      <dt className="w-16 shrink-0 uppercase tracking-[0.18em] text-slate-600">{label}</dt>
      <dd className="min-w-0 flex-1 text-slate-300">{value}</dd>
    </div>
  );
}
