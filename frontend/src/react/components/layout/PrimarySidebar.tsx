import type { Dispatch } from 'react';
import { Command, Gamepad2, WifiOff } from 'lucide-react';
import { navItems } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckState, ViewId } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';

export function PrimarySidebar({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  const grouped = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const section = item.section ?? 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sectionOrder = ['Mission Control', 'Dev Tools', 'Network', 'Knowledge', 'Automation', 'System'];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-blacksite/72 backdrop-blur-xl lg:flex">
      <div className="shrink-0 p-3">
        <button
          type="button"
          className="no-drag mb-2 flex w-full items-center justify-between rounded-2xl border border-neuro/20 bg-neuro/[0.06] px-3 py-3 text-left transition hover:border-neuro/40 hover:bg-neuro/[0.1]"
          onClick={() => dispatch({ type: 'toggle-command', open: true })}
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-neuro">Command</span>
            <span className="mt-1 block text-[11px] text-slate-400">Ctrl/Cmd + K</span>
          </span>
          <Command className="h-5 w-5 text-neuro" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin">
        {sectionOrder.map((section) => {
          const items = grouped[section];
          if (!items?.length) return null;
          return (
            <div key={section} className="mb-3">
              <div className="sticky top-0 z-10 mb-1 px-1 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 bg-blacksite/72 backdrop-blur-sm">
                {section}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = state.activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => dispatch({ type: 'set-view', view: item.id as ViewId })}
                      className={`no-drag flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-neuro/40 ${
                        active ? 'border-neuro/35 bg-neuro/10 text-neuro shadow-focus' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{item.label}</span>
                      </span>
                      {item.shortcut && (
                        <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500">{item.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 rounded-2xl border-t border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <Badge tone="success">Offline Ready</Badge>
          <WifiOff className="h-4 w-4 text-success" />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Deck Mode</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggle-deck-mode' })}
            className={`rounded-full border px-2 py-1 transition ${state.deckMode ? 'border-neuro/40 bg-neuro/10 text-neuro' : 'border-white/10 text-slate-500 hover:text-slate-200'}`}
          >
            <span className="inline-flex items-center gap-1"><Gamepad2 className="h-3.5 w-3.5" /> {state.deckMode ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
