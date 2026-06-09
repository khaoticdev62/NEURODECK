import type { Dispatch } from 'react';
import { Plug, ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function PluginsView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  return (
    <Panel eyebrow="Plugin Manager" title="Extension Permissions" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-3">
        {state.plugins.map((plugin) => (
          <article key={plugin.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-neuro/25">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neuro/25 bg-neuro/10 text-neuro"><Plug className="h-5 w-5" /></div>
              <Badge tone={plugin.status === 'enabled' ? 'success' : plugin.status === 'needs review' ? 'warning' : 'neutral'}>{plugin.status}</Badge>
            </div>
            <h3 className="mt-4 font-semibold text-slate-100">{plugin.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{plugin.description}</p>
            <div className="mt-4 space-y-2">
              {plugin.permissions.map((permission) => <div key={permission} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-400"><ShieldAlert className="h-3.5 w-3.5 text-warning" /> {permission}</div>)}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'toggle-plugin', id: plugin.id })} className="mt-4 w-full rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
              {plugin.status === 'enabled' ? 'Disable' : 'Enable'} Plugin
            </button>
          </article>
        ))}
      </div>
    </Panel>
  );
}
