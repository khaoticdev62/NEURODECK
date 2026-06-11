import { FileDown, FileJson, GitBranch } from 'lucide-react';
import { Panel } from '../../components/primitives/Panel';
import { SessionCard } from '../../components/cards/SessionCard';
import type { NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

export function SessionsView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const root = state.sessions.find((node) => node.id === 'root');
  const children = root?.children
    .map((id) => state.sessions.find((node) => node.id === id))
    .filter(Boolean) ?? [];

  return (
    <Panel eyebrow="Session Graph" title="Conversation Map" className="h-full overflow-hidden">
      <div className="grid h-full gap-4 overflow-y-auto p-4 scrollbar-thin xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-nd-accent/25 bg-nd-accent/[0.045] p-5">
          <GitBranch className="h-8 w-8 text-nd-accent" />
          <h3 className="mt-4 text-xl font-semibold text-nd-text">{root?.title}</h3>
          <p className="mt-2 text-sm leading-6 text-nd-text-muted">
            A visual map for planning, audit, build, and export sessions. This turns chat history into an actual project trail.
          </p>
          <button
            type="button"
            onClick={() => void actions.exportSession()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
          >
            <FileDown className="h-4 w-4" /> Export Markdown
          </button>
          <button
            type="button"
            onClick={() => void actions.saveSession()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent"
          >
            <FileJson className="h-4 w-4" /> Save JSON Session
          </button>
          {state.lastExportPath && (
            <p className="mt-3 break-all text-xs text-nd-text-muted">Last export: {state.lastExportPath}</p>
          )}
        </div>

        <div className="space-y-3">
          {children.map((node) => node && <SessionCard key={node.id} node={node} />)}
        </div>
      </div>
    </Panel>
  );
}
