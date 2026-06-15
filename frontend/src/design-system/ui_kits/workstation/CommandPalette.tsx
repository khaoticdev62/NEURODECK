/* NEURODECK command palette — fast universal launcher (X / Ctrl+K). */

import * as React from "react";
import { Search } from "lucide-react";

export interface CommandPaletteCommand {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
  run?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandPaletteCommand[];
  onRun: (command: CommandPaletteCommand) => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  onRun,
}: CommandPaletteProps): React.ReactNode {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]);

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q.toLowerCase()) ||
      c.group.toLowerCase().includes(q.toLowerCase())
  );

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[sel];
      if (c && !c.disabled) {
        onRun(c);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--nd-surface-overlay)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 90,
        zIndex: 500,
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        style={{
          width: 520,
          maxWidth: "90%",
          background: "var(--nd-surface-tertiary)",
          border: "1px solid var(--nd-border-default)",
          borderRadius: "var(--nd-radius-xl)",
          boxShadow: "var(--nd-elevation-overlay)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--nd-border-subtle)",
          }}
        >
          <Search size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            placeholder="Run a command…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--nd-text-primary)",
              fontFamily: "var(--nd-font-ui)",
              fontSize: 15,
            }}
          />
          <span style={kbd}>ESC</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--nd-text-muted)",
                fontSize: 13,
              }}
            >
              No commands match “{q}”.
            </div>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => {
                    if (!c.disabled) {
                      onRun(c);
                      onClose();
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 12px",
                    borderRadius: "var(--nd-radius-md)",
                    cursor: c.disabled ? "not-allowed" : "pointer",
                    opacity: c.disabled ? 0.45 : 1,
                    background: i === sel ? "rgba(var(--nd-cyan-rgb),0.12)" : "transparent",
                    color: i === sel ? "var(--nd-accent-primary)" : "var(--nd-text-secondary)",
                  }}
                >
                  <Icon size={16} />
                  <span
                    style={{
                      fontSize: 14,
                      color: i === sel ? "var(--nd-text-primary)" : "var(--nd-text-primary)",
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--nd-font-hud)",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontSize: 9,
                      color: "var(--nd-text-muted)",
                    }}
                  >
                    {c.group}
                  </span>
                  {c.disabled ? (
                    <span style={{ ...kbd, color: "var(--nd-accent-warning)" }}>perm</span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const kbd = {
  fontFamily: "var(--nd-font-mono)",
  fontSize: 10,
  color: "var(--nd-text-muted)",
  border: "1px solid var(--nd-border-default)",
  borderRadius: 4,
  padding: "2px 6px",
};
