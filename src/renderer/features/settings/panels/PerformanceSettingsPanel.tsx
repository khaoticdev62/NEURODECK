import { Badge } from "../../../components/primitives/Badge";
import { Panel } from "../../../components/primitives/Panel";
import type { NeuroDeckState } from "../../../types/neurodeck";

export interface PerformanceSettingsPanelProps {
  state: NeuroDeckState;
}

export function PerformanceSettingsPanel({ state }: PerformanceSettingsPanelProps) {
  return (
    <div id="sp-performance" className="settings-panel active space-y-4">
      <Panel eyebrow="Runtime" title="Performance Tier">
        <div className="space-y-2 p-4">
          {(["battery", "balanced", "performance", "quality"] as const).map((tier) => {
            const meta = {
              battery: {
                label: "Battery Saver",
                desc: "Minimal animations, reduced blur, low GPU load.",
                badge: "muted" as const,
              },
              balanced: {
                label: "Balanced",
                desc: "Default. Good visuals without draining resources.",
                badge: "accent" as const,
              },
              performance: {
                label: "Performance",
                desc: "Full animations, real-time effects, max quality.",
                badge: "success" as const,
              },
              quality: {
                label: "Ultra Quality",
                desc: "Max visual fidelity — plugged-in only.",
                badge: "warning" as const,
              },
            }[tier];
            const active = tier === "balanced";
            return (
              <div
                key={tier}
                className={`rounded-xl border p-4 ${active ? "border-nd-accent-primary/40 bg-nd-accent-primary/[0.07]" : "border-nd-border-subtle bg-nd-surface-secondary/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-nd-text-primary text-sm">{meta.label}</span>
                  {active && <Badge tone="accent">Active</Badge>}
                </div>
                <p className="mt-1 text-xs text-nd-text-muted">{meta.desc}</p>
              </div>
            );
          })}
          <p className="text-xs text-nd-text-muted/60 pt-1">
            Performance tier persistence coming in v1.9.
          </p>
        </div>
      </Panel>

      <Panel eyebrow="Diagnostics" title="System Telemetry">
        <div className="p-4 grid gap-2 sm:grid-cols-2">
          {[
            ["Latency", `${state.telemetry.latencyMs ?? "--"}ms`],
            ["Context used", `${state.telemetry.contextUsed ?? 0}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3"
            >
              <p className="text-xs text-nd-text-muted">{label}</p>
              <p className="mt-1 font-mono text-lg font-bold text-nd-accent-primary">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
