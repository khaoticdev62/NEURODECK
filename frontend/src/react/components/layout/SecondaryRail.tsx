import { AlertTriangle, Cpu, Database, FolderOpen, Gauge, PlugZap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';
import { Panel } from '../primitives/Panel';

export function SecondaryRail({ state, selectors }: { state: NeuroDeckState; selectors: NeuroDeckSelectors }) {
  const thinking = state.agents.filter((agent) => agent.status === 'thinking');

  return (
    <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-blacksite/60 p-3 backdrop-blur-xl xl:flex xl:flex-col xl:gap-3">
      <Panel eyebrow="Mission" title="Control Stack">
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon={Cpu} label="Models" value={selectors.readyModels} />
            <MiniStat icon={Gauge} label="Agents" value={selectors.activeAgents} />
            <MiniStat icon={Database} label="Pins" value={selectors.pinnedMemories} />
            <MiniStat icon={PlugZap} label="Plugins" value={selectors.enabledPlugins} />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Context Used</span>
              <span className="font-mono text-neuro">{state.telemetry.contextUsed}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-neuro" style={{ width: `${state.telemetry.contextUsed}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-neuro" />
              <span className="text-xs font-semibold text-slate-300">{state.activeProject?.name ?? 'No project'}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Release risks</span>
              <Badge tone={selectors.riskCount ? 'warning' : 'success'}>{selectors.riskCount}</Badge>
            </div>
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Agent Dock" title="Active Operators" className="min-h-0 flex-1 overflow-hidden">
        <div className="max-h-full space-y-2 overflow-y-auto p-3 scrollbar-thin">
          {state.agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.model}</p>
                </div>
                <Badge tone={agent.status === 'thinking' ? 'accent' : agent.status === 'complete' ? 'success' : agent.status === 'blocked' ? 'danger' : 'neutral'}>{agent.status}</Badge>
              </div>
            </div>
          ))}
          {!thinking.length && (
            <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-slate-500">
              No agents are actively thinking. That is either peaceful or suspicious. Probably both.
            </div>
          )}
        </div>
      </Panel>

      <Panel eyebrow="System" title="Local State">
        <div className="space-y-2 p-3 text-xs text-slate-500">
          <div className="flex items-center justify-between"><span>Saved</span><span className="text-slate-300">{state.lastSavedAt ? 'yes' : 'pending'}</span></div>
          <div className="flex items-center justify-between"><span>Export</span><span className="text-slate-300">{state.lastExportPath ? 'ready' : 'none'}</span></div>
          <div className="flex items-center justify-between"><span>Diagnostics</span><span className="text-slate-300">{state.diagnostics ? 'loaded' : 'cold'}</span></div>
          {state.lastError && <div className="mt-2 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/10 p-2 text-danger"><AlertTriangle className="h-4 w-4" /> {state.lastError.title}</div>}
        </div>
      </Panel>
    </aside>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <Icon className="h-4 w-4 text-neuro" />
      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className="mt-1 font-mono text-lg text-slate-100">{value}</p>
    </div>
  );
}
