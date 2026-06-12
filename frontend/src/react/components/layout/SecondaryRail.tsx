import { useState } from 'react';
import type { Dispatch } from 'react';
import { AlertTriangle, Cpu, Database, FolderOpen, Gauge, PanelRightClose, PanelRightOpen, PlugZap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NeuroDeckAction, NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';
import { Panel } from '../primitives/Panel';
import { MemoryPanel } from '../systems/MemoryPanel';

export function SecondaryRail({ state, dispatch, selectors }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; selectors: NeuroDeckSelectors }) {
  const [collapsed, setCollapsed] = useState(false);
  const thinking = state.agents.filter((agent) => agent.status === 'thinking');

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="hidden h-full shrink-0 items-center border-l border-nd-text-muted/15 bg-nd-bg/60 backdrop-blur-xl px-1 text-nd-text-muted transition hover:text-nd-accent xl:flex"
        aria-label="Expand side panel"
        title="Expand side panel (B)"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-nd-text-muted/15 bg-nd-bg/60 backdrop-blur-xl xl:flex">
      {/* Collapse toggle */}
      <div className="flex items-center justify-end border-b border-nd-text-muted/10 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-nd-text-muted/15 text-nd-text-muted transition hover:border-nd-accent/30 hover:text-nd-accent"
          aria-label="Collapse side panel"
          title="Collapse side panel"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        <Panel eyebrow="Mission" title="Control Stack">
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={Cpu} label="Models" value={selectors.readyModels} />
              <MiniStat icon={Gauge} label="Agents" value={selectors.activeAgents} />
              <MiniStat icon={Database} label="Pins" value={selectors.pinnedMemories} />
              <MiniStat icon={PlugZap} label="Plugins" value={selectors.enabledPlugins} />
            </div>
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-nd-text-muted">Context Used</span>
                <span className="font-mono text-nd-accent">{state.telemetry.contextUsed}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-text-muted/15">
                <div className="h-full rounded-full bg-nd-accent transition-all duration-300" style={{ width: `${state.telemetry.contextUsed}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-nd-accent" />
                <span className="text-xs font-semibold text-nd-text/80">{state.activeProject?.name ?? 'No project'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-nd-text-muted">
                <span>Release risks</span>
                <Badge tone={selectors.riskCount ? 'warning' : 'success'}>{selectors.riskCount}</Badge>
              </div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Memory" title="Context Sources">
          <div className="p-3">
            <MemoryPanel
              memories={state.memories}
              onTogglePin={(id) => dispatch({ type: 'toggle-memory-pin', id })}
              maxItems={4}
              compact
            />
          </div>
        </Panel>

        <Panel eyebrow="Agent Dock" title="Active Operators" className="min-h-0 flex-1 overflow-hidden">
          <div className="max-h-full space-y-2 overflow-y-auto p-3 scrollbar-thin">
            {state.agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 transition hover:border-nd-accent/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nd-text/90">{agent.name}</p>
                    <p className="truncate text-xs text-nd-text-muted">{agent.model}</p>
                  </div>
                  <Badge tone={agent.status === 'thinking' ? 'accent' : agent.status === 'complete' ? 'success' : agent.status === 'blocked' ? 'danger' : 'neutral'}>{agent.status}</Badge>
                </div>
              </div>
            ))}
            {!thinking.length && (
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3 text-xs leading-5 text-nd-text-muted">
                No agents are actively thinking. That is either peaceful or suspicious. Probably both.
              </div>
            )}
          </div>
        </Panel>

        <Panel eyebrow="System" title="Local State">
          <div className="space-y-2 p-3 text-xs text-nd-text-muted">
            <div className="flex items-center justify-between"><span>Saved</span><span className="text-nd-text/80">{state.lastSavedAt ? 'yes' : 'pending'}</span></div>
            <div className="flex items-center justify-between"><span>Export</span><span className="text-nd-text/80">{state.lastExportPath ? 'ready' : 'none'}</span></div>
            <div className="flex items-center justify-between"><span>Diagnostics</span><span className="text-nd-text/80">{state.diagnostics ? 'loaded' : 'cold'}</span></div>
            {state.lastError && <div className="mt-2 flex items-center gap-2 rounded-xl border border-nd-danger/20 bg-nd-danger/10 p-2 text-nd-danger"><AlertTriangle className="h-4 w-4 shrink-0" /> <span className="truncate">{state.lastError.title}</span></div>}
          </div>
        </Panel>
      </div>
    </aside>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 transition hover:border-nd-accent/20">
      <Icon className="h-4 w-4 text-nd-accent" aria-hidden="true" />
      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-nd-text-muted/60">{label}</p>
      <p className="mt-1 font-mono text-lg text-nd-text">{value}</p>
    </div>
  );
}
