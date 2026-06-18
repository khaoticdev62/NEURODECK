import { Gamepad2, Radio } from "lucide-react";
import { useController } from "./ControllerProvider";

export function ControllerDebugOverlay() {
  const { runtime } = useController();

  if (!runtime.debugOverlayOpen) return null;

  return (
    <aside
      data-controller-overlay="true"
      className="fixed bottom-16 right-4 z-[var(--z-toast)] w-[360px] rounded-3xl border border-nd-accent/25 bg-nd-bg/95 p-4 shadow-2xl shadow-nd-accent/10"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-nd-text">
        <Gamepad2 className="h-4 w-4 text-nd-accent" />
        Controller Diagnostics
      </div>
      <div className="mt-3 space-y-2 text-xs text-nd-text-muted">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-mono text-nd-text">{runtime.connectionStatus}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Input source</span>
          <span className="font-mono text-nd-text">{runtime.lastInputSource}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Screen</span>
          <span className="font-mono text-nd-text">{runtime.currentScreenId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Zone</span>
          <span className="font-mono text-nd-text">{runtime.currentFocusZone ?? "unknown"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Focused node</span>
          <span className="font-mono text-nd-text">{runtime.currentFocusNodeId ?? "none"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last action</span>
          <span className="font-mono text-nd-text">{runtime.lastAction ?? "none"}</span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
          <Radio className="h-3.5 w-3.5 text-nd-accent" />
          Connected devices
        </div>
        <div className="space-y-2">
          {runtime.devices.length === 0 && (
            <p className="text-xs text-nd-text-muted">No gamepad detected.</p>
          )}
          {runtime.devices.map((device) => (
            <div
              key={device.id}
              className="rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 p-2"
            >
              <div className="text-xs font-semibold text-nd-text">{device.name}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-nd-text-muted">
                <span>{device.kind}</span>
                <span>{device.mapping || "nonstandard"}</span>
                <span>{device.buttons} btn</span>
                <span>{device.axes} axes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
