/* NEURODECK nav rail — 72px controller-first primary navigation. */

import * as React from "react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface NavRailProps {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
}

export function NavRail({ items, active, onSelect }: NavRailProps): React.ReactNode {
  return (
    <nav
      style={{
        width: 72,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 4,
        padding: "10px 8px",
        background: "var(--nd-surface-sidebar)",
        borderRight: "1px solid var(--nd-border-subtle)",
      }}
    >
      {items.map((it) => {
        const on = it.id === active;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            aria-current={on ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 2px",
              border: "1px solid transparent",
              borderRadius: "var(--nd-radius-md)",
              cursor: "pointer",
              background: on ? "rgba(var(--nd-cyan-rgb),0.1)" : "transparent",
              borderColor: on ? "rgba(var(--nd-cyan-rgb),0.3)" : "transparent",
              color: on ? "var(--nd-accent-primary)" : "var(--nd-text-muted)",
              transition: "background var(--nd-motion-fast), color var(--nd-motion-fast)",
            }}
            onMouseEnter={(e) => {
              if (!on) {
                e.currentTarget.style.background = "var(--nd-surface-tertiary)";
                e.currentTarget.style.color = "var(--nd-text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!on) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--nd-text-muted)";
              }
            }}
          >
            <Icon size={20} />
            <span
              style={{
                fontFamily: "var(--nd-font-hud)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: 8.5,
                fontWeight: 600,
              }}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
