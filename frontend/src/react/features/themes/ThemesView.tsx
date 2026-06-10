import type { Dispatch } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Panel } from '../../components/primitives/Panel';
import { themes } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function ThemesView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  return (
    <Panel eyebrow="Appearance" title="Theme Manager" className="h-full overflow-hidden">
      <p className="px-4 pt-3 text-sm text-nd-text-muted">
        Select a theme. Changes apply immediately and persist across sessions.
      </p>
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {themes.map((theme) => {
          const active = state.selectedTheme === theme.name;
          return (
            <button
              key={theme.name}
              type="button"
              onClick={() => dispatch({ type: 'set-theme', theme: theme.name })}
              className={`group relative rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent ${
                active
                  ? 'border-nd-accent/50 bg-nd-accent/[0.07] shadow-glow'
                  : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/30 hover:bg-nd-accent/[0.04]'
              }`}
              aria-pressed={active}
            >
              {active && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-nd-accent" />
              )}

              {/* Color swatch strip */}
              <div className="mb-3 flex h-8 overflow-hidden rounded-xl">
                <div className="flex-1" style={{ background: theme.background }} />
                <div className="flex-1" style={{ background: theme.surface }} />
                <div className="w-8" style={{ background: theme.accent }} />
                <div className="w-8" style={{ background: theme.success }} />
                <div className="w-8" style={{ background: theme.warning }} />
                <div className="w-8" style={{ background: theme.danger }} />
              </div>

              <p className="text-sm font-semibold text-nd-text">{theme.name}</p>

              {/* Mini palette dots */}
              <div className="mt-2 flex items-center gap-1.5">
                {[theme.accent, theme.success, theme.warning, theme.danger, theme.muted].map((color, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full border border-white/10"
                    style={{ background: color }}
                  />
                ))}
              </div>

              {active && (
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-nd-accent">Active</p>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
