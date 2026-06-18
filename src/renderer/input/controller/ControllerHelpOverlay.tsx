import { HelpCircle } from "lucide-react";
import { getActionHint } from "./steamInputHints";
import { useController } from "./ControllerProvider";

const ACTIONS = [
  { action: "confirm", label: "Confirm / activate" },
  { action: "cancel", label: "Back / close" },
  { action: "openSearch", label: "Search / focus input" },
  { action: "reload", label: "Reload / secondary action" },
  { action: "previousTab", label: "Previous section" },
  { action: "nextTab", label: "Next section" },
  { action: "pageUp", label: "Scroll up" },
  { action: "pageDown", label: "Scroll down" },
  { action: "openMainMenu", label: "Main menu" },
  { action: "openHelp", label: "Controller help" },
] as const;

export function ControllerHelpOverlay() {
  const { runtime, setHelpOverlayOpen } = useController();
  if (!runtime.helpOverlayOpen) return null;

  const activeKind = runtime.devices[0]?.kind ?? "generic";

  return (
    <div
      data-controller-overlay="true"
      className="fixed inset-0 z-[var(--z-modal)] bg-nd-bg/70 backdrop-blur-sm"
      onMouseDown={() => setHelpOverlayOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Controller help"
        className="absolute left-1/2 top-20 w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-accent/25 bg-nd-bg/96 p-5 shadow-2xl shadow-nd-accent/10"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-nd-text">
            <HelpCircle className="h-4 w-4 text-nd-accent" />
            Controller Help
          </div>
          <button
            type="button"
            onClick={() => setHelpOverlayOpen(false)}
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-xs text-nd-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            B / Close
          </button>
        </div>
        <p className="mt-2 text-sm text-nd-text-muted">
          Detected controller: <span className="font-semibold text-nd-text">{activeKind}</span>
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ACTIONS.map(({ action, label }) => (
            <div
              key={action}
              className="flex items-center justify-between rounded-2xl border border-nd-text-muted/15 bg-nd-surface/35 px-3 py-2 text-sm"
            >
              <span className="text-nd-text">{label}</span>
              <kbd className="rounded-lg border border-nd-text-muted/15 bg-nd-bg/70 px-2 py-1 text-xs text-nd-accent">
                {getActionHint(action, activeKind)}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
