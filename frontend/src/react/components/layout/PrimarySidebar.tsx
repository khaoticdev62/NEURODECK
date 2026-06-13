import { useState } from 'react';
import type { Dispatch } from 'react';
import { ChevronRight, Command, Gamepad2, WifiOff } from 'lucide-react';
import { navItems } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckState, ViewId } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';

// Top-level nav items to show in the mobile bottom bar (highest traffic)
const MOBILE_PRIMARY_IDS: ViewId[] = ['chat', 'terminal', 'agent', 'memory', 'settings'];

type SidebarProps = {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  onOpenSettings?: () => void;
};

export function PrimarySidebar({ state, dispatch }: SidebarProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = pinned || hovered;

  const grouped = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const section = item.section ?? 'Other';
    (acc[section] ??= []).push(item);
    return acc;
  }, {});

  const sectionOrder = [
    'Mission Control',
    'Dev Tools',
    'Network',
    'Knowledge',
    'Automation',
    'System',
    'Security & Ops',
  ];

  const mobilePrimaryItems = MOBILE_PRIMARY_IDS.map((id) =>
    navItems.find((n) => n.id === id)
  ).filter(Boolean) as typeof navItems;

  return (
    <>
      {/* ── Desktop sidebar (lg+) ────────────────────────────────────────── */}
      <aside
        data-controller-zone="navigation"
        className="group/sidebar relative hidden shrink-0 flex-col border-r border-nd-text-muted/15 bg-nd-bg/72 backdrop-blur-xl transition-all duration-200 ease-snap lg:flex"
        style={{ width: expanded ? 200 : 56 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Command button + pin toggle */}
        <div className="shrink-0 space-y-1 p-2">
          <button
            type="button"
            className="no-drag flex w-full items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/[0.06] px-2 py-2.5 text-left transition hover:border-nd-accent/40 hover:bg-nd-accent/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            onClick={() => dispatch({ type: 'toggle-command', open: true })}
            aria-label="Open command palette"
          >
            <Command className="h-5 w-5 shrink-0 text-nd-accent" aria-hidden="true" />
            <span
              className={`ml-2.5 overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.22em] text-nd-accent transition-opacity duration-150 ${
                expanded ? 'opacity-100' : 'w-0 opacity-0'
              }`}
            >
              Cmd
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            aria-label={pinned ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-pressed={pinned}
            title={pinned ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`no-drag flex w-full items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
              pinned
                ? 'border-nd-accent/30 bg-nd-accent/[0.06] text-nd-accent'
                : 'border-transparent text-nd-text-muted/50 hover:border-nd-text-muted/15 hover:text-nd-text-muted'
            }`}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${pinned ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {expanded && (
              <span className="ml-1.5 overflow-hidden whitespace-nowrap">
                {pinned ? 'Collapse' : 'Expand'}
              </span>
            )}
          </button>
        </div>

        {/* Nav sections */}
        <nav className="nav-tab-bar min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 scrollbar-thin" aria-label="Main navigation">
          {sectionOrder.map((section) => {
            const items = grouped[section];
            if (!items?.length) return null;
            return (
              <div key={section} className="mb-2">
                <div
                  className={`mb-1 transition-opacity duration-150 ${
                    expanded
                      ? 'px-2 py-1 text-xs font-bold uppercase tracking-[0.18em] text-nd-text-muted/60'
                      : 'flex justify-center py-1'
                  }`}
                >
                  {expanded ? section : <div className="h-px w-6 bg-nd-text-muted/20" />}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = state.activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`nav-tab-${item.id}`}
                        data-view={item.id}
                        aria-current={active ? 'page' : undefined}
                        aria-label={item.label}
                        title={item.label}
                        onClick={() => dispatch({ type: 'set-view', view: item.id as ViewId })}
                        className={`nav-tab no-drag flex w-full items-center rounded-lg border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                          active
                            ? 'active border-nd-accent/35 bg-nd-accent/10 text-nd-accent shadow-focus'
                            : 'border-transparent text-nd-text-muted hover:border-nd-text-muted/15 hover:bg-nd-surface/50 hover:text-nd-text'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span
                          className={`ml-2.5 overflow-hidden whitespace-nowrap text-[13px] font-medium transition-opacity duration-150 ${
                            expanded ? 'opacity-100' : 'w-0 opacity-0'
                          }`}
                        >
                          {item.label}
                        </span>
                        {expanded && item.shortcut && (
                          <span className="ml-auto rounded border border-nd-text-muted/15 bg-nd-surface/50 px-1.5 py-0.5 text-[10px] text-nd-text-muted">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-2 rounded-2xl border-t border-nd-text-muted/15 bg-nd-surface/30 p-2">
          <div className="flex items-center justify-center">
            {expanded ? (
              <div className="flex w-full items-center justify-between px-1">
                <Badge tone="success">Offline Ready</Badge>
                <WifiOff className="h-4 w-4 text-nd-success" aria-hidden="true" />
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-nd-success" aria-hidden="true" />
            )}
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggle-deck-mode' })}
            className={`flex w-full items-center justify-center rounded-full border px-2 py-1.5 text-xs transition ${
              state.deckMode
                ? 'border-nd-accent/40 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text/90'
            }`}
            aria-label={`Deck Mode ${state.deckMode ? 'On' : 'Off'}`}
            aria-pressed={state.deckMode}
            title={`Deck Mode ${state.deckMode ? 'On' : 'Off'}`}
          >
            <Gamepad2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {expanded && (
              <span className="ml-1.5 whitespace-nowrap">
                {state.deckMode ? 'On' : 'Off'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom navigation (below lg) ─────────────────────────── */}
      <nav
        className="no-drag fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center border-t border-nd-text-muted/15 bg-nd-bg/90 backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = state.activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-nav-tab-${item.id}`}
              data-view={item.id}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => dispatch({ type: 'set-view', view: item.id as ViewId })}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                active ? 'text-nd-accent' : 'text-nd-text-muted hover:text-nd-text'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? 'text-nd-accent' : ''}`}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
        {/* Overflow "more" button if needed */}
        <button
          type="button"
          aria-label="Open command palette"
          onClick={() => dispatch({ type: 'toggle-command', open: true })}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-nd-text-muted transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <Command className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
