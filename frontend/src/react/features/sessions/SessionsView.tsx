import { FileDown, FileJson, GitBranch, MessageSquareText } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function SessionsView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const root = state.sessions.find((node) => node.id === 'root');
  const children = root?.children.map((id) => state.sessions.find((node) => node.id === id)).filter(Boolean) ?? [];

  return (
    <Panel eyebrow="Session Graph" title="Conversation Map" className="h-full overflow-hidden">
      <div className="grid h-full gap-4 overflow-y-auto p-4 scrollbar-thin xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-neuro/25 bg-neuro/[0.045] p-5">
          <GitBranch className="h-8 w-8 text-neuro" />
          <h3 className="mt-4 text-xl font-semibold text-slate-50">{root?.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">A visual map for planning, audit, build, and export sessions. This turns chat history into an actual project trail.</p>
          <button type="button" onClick={() => void actions.exportSession()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
            <FileDown className="h-4 w-4" /> Export Markdown
          </button>
          <button type="button" onClick={() => void actions.saveSession()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
            <FileJson className="h-4 w-4" /> Save JSON Session
          </button>
          {state.lastExportPath && <p className="mt-3 break-all text-xs text-slate-500">Last export: {state.lastExportPath}</p>}
        </div>
        <div className="space-y-3">
          {children.map((node) => node && (
            <article key={node.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-neuro"><MessageSquareText className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-semibold text-slate-100">{node.title}</h4>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-600">{node.type}</p>
                  </div>
                </div>
                <Badge tone={node.status === 'active' ? 'accent' : node.status === 'complete' ? 'success' : 'neutral'}>{node.status}</Badge>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}
