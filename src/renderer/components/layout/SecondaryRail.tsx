import { memo, useState } from "react";
import type { Dispatch } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  FolderOpen,
  Gauge,
  PanelRightClose,
  PanelRightOpen,
  PlugZap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NeuroDeckAction, NeuroDeckSelectors, NeuroDeckState } from "../../types/neurodeck";
import { Badge } from "../primitives/Badge";
import { Panel } from "../primitives/Panel";
import { MemoryPanel } from "../systems/MemoryPanel";

export const SecondaryRail = memo(function SecondaryRail({
  state,
  dispatch,
  selectors,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  selectors: NeuroDeckSelectors;
}) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("nd:rail-collapsed") === "true"
  );
  const thinking = state.agents.filter((agent) => agent.status === "thinking");

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("nd:rail-collapsed", "false");
          setCollapsed(false);
        }}
        className="hidden h-full shrink-0 items-center border-l border-[var(--nd-border-subtle)] bg-[var(--nd-surface-sidebar)]/35 backdrop-blur-[var(--nd-glass-blur,8px)] px-1 text-[var(--nd-text-muted)] transition-[color,background-color] duration-[var(--nd-motion-fast)] hover:bg-[var(--nd-surface-hover)] hover:text-[var(--nd-accent-primary)] desktop:flex"
        aria-label="Expand side panel"
        title="Expand side panel (B)"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside
      className="hidden shrink-0 flex-col border-l border-nd-border-subtle bg-nd-surface-sidebar/30 backdrop-blur-[var(--nd-glass-blur,8px)] desktop:flex"
      style={{ width: "var(--nd-shell-context)" }}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end border-b border-[var(--nd-border-subtle)] px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("nd:rail-collapsed", "true");
            setCollapsed(true);
          }}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] text-[var(--nd-text-muted)] transition-[border-color,background-color,color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-accent-primary)]/30 hover:text-[var(--nd-accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nd-focus-ring)]"
          aria-label="Collapse side panel"
          aria-expanded={true}
          title="Collapse side panel"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        role="region"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin"
        aria-label="Side panel"
      >
        <Panel eyebrow="Mission" title="Control Stack">
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={Cpu} label="Models" value={selectors.readyModels} />
              <MiniStat icon={Gauge} label="Agents" value={selectors.activeAgents} />
              <MiniStat icon={Database} label="Pins" value={selectors.pinnedMemories} />
              <MiniStat icon={PlugZap} label="Plugins" value={selectors.enabledPlugins} />
            </div>
            <div className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/25 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--nd-text-muted)]">Context Used</span>
                <span className="font-mono text-[var(--nd-accent-primary)]">
                  {state.telemetry.contextUsed}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--nd-border-subtle)]"
                role="progressbar"
                aria-label="Context used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state.telemetry.contextUsed}
              >
                <div
                  className="h-full rounded-full bg-[var(--nd-accent-primary)] transition-[width] duration-[var(--nd-motion-normal)]"
                  style={{ width: `${state.telemetry.contextUsed}%` }}
                />
              </div>
            </div>
            <div className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/25 p-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[var(--nd-accent-primary)]" />
                <span className="min-w-0 truncate text-xs font-semibold text-[var(--nd-text-secondary)]">
                  {state.activeProject?.name ?? "No project"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--nd-text-muted)]">
                <span>Release risks</span>
                <Badge tone={selectors.riskCount ? "warning" : "success"}>
                  {selectors.riskCount}
                </Badge>
              </div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Memory" title="Context Sources">
          <div className="p-3">
            <MemoryPanel
              memories={state.memories}
              onTogglePin={(id) => dispatch({ type: "toggle-memory-pin", id })}
              maxItems={4}
              compact
            />
          </div>
        </Panel>

        <Panel
          eyebrow="Agent Dock"
          title="Active Operators"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <ul
            role="list"
            aria-label="Active agents"
            className="max-h-full space-y-2 overflow-y-auto p-3 scrollbar-thin"
          >
            {state.agents.map((agent) => (
              <li
                key={agent.id}
                className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/25 p-3 transition-[border-color,background-color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-accent-primary)]/20 hover:bg-[var(--nd-surface-hover)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--nd-text-primary)]">
                      {agent.name}
                    </p>
                    <p className="truncate text-xs text-[var(--nd-text-muted)]">{agent.model}</p>
                  </div>
                  <Badge
                    tone={
                      agent.status === "thinking"
                        ? "accent"
                        : agent.status === "complete"
                          ? "success"
                          : agent.status === "blocked"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {agent.status}
                  </Badge>
                </div>
              </li>
            ))}
            {!thinking.length && (
              <li className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/20 p-3 text-xs leading-5 text-[var(--nd-text-muted)]">
                No agents are actively thinking. That is either peaceful or suspicious. Probably
                both.
              </li>
            )}
          </ul>
        </Panel>

        <Panel eyebrow="System" title="Local State">
          <div className="space-y-2 p-3 text-xs text-[var(--nd-text-muted)]">
            <div className="flex items-center justify-between">
              <span>Saved</span>
              <span className="text-[var(--nd-text-secondary)]">
                {state.lastSavedAt ? "yes" : "pending"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Export</span>
              <span className="text-[var(--nd-text-secondary)]">
                {state.lastExportPath ? "ready" : "none"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Diagnostics</span>
              <span className="text-[var(--nd-text-secondary)]">
                {state.diagnostics ? "loaded" : "cold"}
              </span>
            </div>
            {state.lastError && (
              <div className="mt-2 flex items-center gap-2 rounded-[var(--nd-radius-md)] border border-[var(--nd-accent-error)]/20 bg-[var(--nd-accent-error)]/10 p-2 text-[var(--nd-accent-error)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />{" "}
                <span className="truncate">{state.lastError.title}</span>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </aside>
  );
});

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)]/25 p-3 transition-[border-color,background-color] duration-[var(--nd-motion-fast)] hover:border-[var(--nd-accent-primary)]/20 hover:bg-[var(--nd-surface-hover)]"
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <Icon className="h-4 w-4 text-[var(--nd-accent-primary)]" aria-hidden="true" />
      <p
        className="mt-2 text-[10px] uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]/60"
        aria-hidden="true"
      >
        {label}
      </p>
      <p className="mt-1 font-mono text-lg text-[var(--nd-text-primary)]" aria-hidden="true">
        {value}
      </p>
    </div>
  );
}
