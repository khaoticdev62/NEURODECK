import type { Dispatch } from 'react';
import { Command, Gamepad2, WifiOff } from 'lucide-react';
import { navItems } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckState, ViewId } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';

export function PrimarySidebar({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-blacksite/72 p-3 backdrop-blur-xl lg:flex lg:flex-col">
      <button
        type="button"
        className="no-drag mb-3 flex items-center justify-between rounded-2xl border border-neuro/20 bg-neuro/[0.06] px-3 py-3 text-left transition hover:border-neuro/40 hover:bg-neuro/[0.1]"
        onClick={() => dispatch({ type: 'toggle-command', open: true })}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-neuro">Command</span>
          <span className="mt-1 block text-xs text-slate-400">Ctrl/Cmd + K</span>
        </span>
        <Command className="h-5 w-5 text-neuro" />
      </button>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = state.activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch({ type: 'set-view', view: item.id as ViewId })}
              className={`no-drag flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-neuro/40 ${
                active ? 'border-neuro/35 bg-neuro/10 text-neuro shadow-focus' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{item.description}</span>
              </span>
              <span className="text-[10px] text-slate-600">{item.shortcut}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
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
