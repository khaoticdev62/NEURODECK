import { useState } from "react";
import type { Dispatch } from "react";
import { Bell, ChevronRight, Command, Gamepad2, Settings, WifiOff } from "lucide-react";
import { navItems } from "../../types/seed";
import type { NeuroDeckAction, NeuroDeckState, ViewId } from "../../types/neurodeck";
import { Badge } from "../primitives/Badge";

export function PrimarySidebar({
  state,
  dispatch,
  onOpenSettings,
  onOpenNotifications,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = pinned || hovered;

  const grouped = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const section = item.section ?? "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sectionOrder = [
    "Mission Control",
    "Dev Tools",
    "Network",
    "Knowledge",
    "Automation",
    "System",
    "Integrations",
    "Security & Ops",
  ];

  return (
    <aside
      className="group/sidebar relative hidden shrink-0 flex-col border-r border-[var(--nd-border-subtle)] bg-[var(--nd-surface-sidebar)] transition-[width] duration-[var(--nd-motion-normal)] ease-[var(--nd-ease-standard)] lg:flex"
      style={{ width: expanded ? "var(--nd-sidebar-expanded, 200px)" : "var(--nd-shell-navrail)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Command button + pin toggle */}
      <div className="shrink-0 space-y-1 p-2">
        <button
          id="command-palette-btn"
          type="button"
          data-onboarding-anchor="command-palette-trigger"
          className="no-drag flex w-full min-h-touch items-center justify-center rounded-[var(--nd-radius-md)] border border-[var(--nd-accent-primary)]/20 bg-[var(--nd-accent-primary)]/[0.06] px-2 py-2 text-left transition-[border-color,background-color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-accent-primary)]/40 hover:bg-[var(--nd-accent-primary)]/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)]"
          onClick={() => dispatch({ type: "toggle-command", open: true })}
          aria-label="Open command palette"
        >
          <Command
            className="h-5 w-5 shrink-0 text-[var(--nd-accent-primary)]"
            aria-hidden="true"
          />
          <span
            className={`ml-2.5 overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[var(--nd-tracking-wordmark)] text-[var(--nd-accent-primary)] transition-opacity duration-[var(--nd-motion-fast)] ${
              expanded ? "opacity-100" : "opacity-0 w-0"
            }`}
          >
            Cmd
          </span>
        </button>
        {/* Pin sidebar expanded — visible to keyboard users even when collapsed */}
        <button
          type="button"
          onClick={() => setPinned((p) => !p)}
          aria-label={pinned ? "Collapse sidebar" : "Expand sidebar"}
          aria-pressed={pinned}
          title={pinned ? "Collapse sidebar" : "Expand sidebar"}
          className={`no-drag flex w-full min-h-touch items-center justify-center rounded-[var(--nd-radius-md)] border px-2 py-1.5 text-xs transition-[border-color,background-color,color] duration-[var(--nd-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)] ${
            pinned
              ? "border-[var(--nd-accent-primary)]/30 bg-[var(--nd-accent-primary)]/[0.06] text-[var(--nd-accent-primary)]"
              : "border-transparent text-[var(--nd-text-muted)]/60 hover:border-[var(--nd-border-subtle)] hover:text-[var(--nd-text-secondary)]"
          }`}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-[var(--nd-motion-normal)] ${
              pinned ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
          {expanded && (
            <span className="ml-1.5 overflow-hidden whitespace-nowrap">
              {pinned ? "Collapse" : "Expand"}
            </span>
          )}
        </button>
      </div>

      {/* Nav sections */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 scrollbar-thin"
        aria-label="Main navigation"
      >
        {sectionOrder.map((section) => {
          const items = grouped[section];
          if (!items?.length) return null;
          return (
            <div key={section} className="mb-2">
              {/* Section divider (icon mode) or label (expanded) */}
              <div
                className={`mb-1 transition-opacity duration-[var(--nd-motion-fast)] ${
                  expanded
                    ? "px-2 py-1 text-[10px] font-bold uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]/60"
                    : "flex justify-center py-1"
                }`}
              >
                {expanded ? (
                  section
                ) : (
                  <div className="h-px w-6 bg-[var(--nd-border-subtle)]" aria-hidden="true" />
                )}
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
                      data-onboarding-anchor={`nav-${item.id}`}
                      data-view={item.id}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => dispatch({ type: "set-view", view: item.id as ViewId })}
                      onKeyDown={(e) => {
                        const nav = e.currentTarget.closest("nav");
                        const btns = Array.from(
                          nav?.querySelectorAll<HTMLElement>("[data-view]") ?? []
                        );
                        const idx = btns.indexOf(e.currentTarget);
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          btns[Math.min(idx + 1, btns.length - 1)]?.focus();
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          btns[Math.max(idx - 1, 0)]?.focus();
                        } else if (e.key === "Home") {
                          e.preventDefault();
                          btns[0]?.focus();
                        } else if (e.key === "End") {
                          e.preventDefault();
                          btns[btns.length - 1]?.focus();
                        }
                      }}
                      className={`no-drag group/nav flex w-full min-h-touch items-center rounded-[var(--nd-radius-md)] px-2 py-2 text-left transition-[background-color,border-color,color] duration-[var(--nd-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)] ${
                        active
                          ? "active border-l-2 border-[var(--nd-border-focus)] bg-[var(--nd-surface-selected)] pl-1.5 font-semibold text-[var(--nd-accent-primary)]"
                          : "border-l-2 border-transparent text-[var(--nd-text-muted)] hover:bg-[var(--nd-surface-hover)] hover:text-[var(--nd-text-primary)]"
                      } ${expanded ? "" : "justify-center"}`}
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span
                        className={`ml-2.5 overflow-hidden whitespace-nowrap text-sm font-medium transition-opacity duration-[var(--nd-motion-fast)] ${
                          expanded ? "opacity-100" : "opacity-0 w-0"
                        }`}
                        aria-hidden={!expanded}
                      >
                        {item.label}
                      </span>
                      {item.shortcut && (
                        expanded ? (
                          <span className="ml-auto rounded border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--nd-text-muted)]">
                            {item.shortcut}
                          </span>
                        ) : (
                          <span className="sr-only">{item.shortcut}</span>
                        )
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
      <div className="shrink-0 space-y-1.5 border-t border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/40 p-2">
        <div className="flex items-center justify-center">
          {expanded ? (
            <div className="flex w-full min-h-touch items-center justify-between px-1">
              <Badge tone="success" variant="outline" dot>
                Offline Ready
              </Badge>
              <WifiOff className="h-4 w-4 text-[var(--nd-accent-success)]" />
            </div>
          ) : (
            <WifiOff
              className="h-4 w-4 text-[var(--nd-accent-success)]"
              aria-label="Offline ready"
            />
          )}
        </div>
        <div className={`flex gap-1 ${expanded ? "" : "flex-col"}`}>
          <button
            id="settings-btn"
            type="button"
            onClick={() => onOpenSettings?.()}
            aria-label="Open settings"
            title="Settings"
            className="flex flex-1 min-h-touch items-center justify-center rounded-[var(--nd-radius-md)] border border-transparent px-2 py-1.5 text-xs text-[var(--nd-text-muted)] transition-[border-color,background-color,color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-border-subtle)] hover:text-[var(--nd-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)]"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {expanded && <span className="ml-1.5 whitespace-nowrap">Settings</span>}
          </button>
          <button
            id="notif-btn"
            type="button"
            onClick={() => onOpenNotifications?.()}
            aria-label="Notifications"
            title="Notifications"
            className="flex flex-1 min-h-touch items-center justify-center rounded-[var(--nd-radius-md)] border border-transparent px-2 py-1.5 text-xs text-[var(--nd-text-muted)] transition-[border-color,background-color,color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-border-subtle)] hover:text-[var(--nd-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)]"
          >
            <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {expanded && <span className="ml-1.5 whitespace-nowrap">Alerts</span>}
          </button>
        </div>
        <button
          type="button"
          data-testid="deck-mode-toggle"
          onClick={() => dispatch({ type: "toggle-deck-mode" })}
          className={`flex w-full min-h-touch items-center justify-center rounded-full border px-2 py-1.5 text-xs transition-[border-color,background-color,color] duration-[var(--nd-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)] ${
            state.deckMode
              ? "border-[var(--nd-accent-primary)]/40 bg-[var(--nd-accent-primary)]/10 text-[var(--nd-accent-primary)]"
              : "border-[var(--nd-border-subtle)] text-[var(--nd-text-muted)] hover:text-[var(--nd-text-primary)]"
          }`}
          aria-label={`Deck Mode ${state.deckMode ? "On" : "Off"}`}
          title={`Deck Mode ${state.deckMode ? "On" : "Off"}`}
        >
          <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
          {expanded && (
            <span className="ml-1.5 whitespace-nowrap">{state.deckMode ? "On" : "Off"}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
