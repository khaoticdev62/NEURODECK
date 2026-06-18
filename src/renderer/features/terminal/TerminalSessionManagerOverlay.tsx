import { X } from "lucide-react";
import { IconButton } from "../../components/primitives/IconButton";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import type { TerminalTab } from "../../../shared/terminal/terminalContracts";

export type TerminalSessionManagerOverlayProps = {
  open: boolean;
  tabs: TerminalTab[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onClose: () => void;
};

export function TerminalSessionManagerOverlay({
  open,
  tabs,
  activeTabId,
  onSwitchTab,
  onClose,
}: TerminalSessionManagerOverlayProps) {
  if (!open) return null;

  return (
    <FocusTrapContainer
      active={open}
      onEscape={onClose}
      className="fixed right-4 top-24 z-[var(--z-modal)] w-[28rem] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-nd-elevation-card"
      role="dialog"
      aria-label="Terminal session manager"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            Sessions
          </div>
          <div className="text-sm font-semibold text-nd-text-primary">Terminal tabs and panes</div>
        </div>
        <IconButton aria-label="Close session manager" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mt-3 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSwitchTab(tab.id)}
            className={`min-h-touch w-full rounded-2xl border px-3 py-2 text-left ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08]" : "border-nd-text-muted/15 bg-nd-surface/40"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-nd-text-primary">{tab.label}</span>
              <span className="text-xs text-nd-text-muted">{tab.sessionIds.length} pane(s)</span>
            </div>
            <div className="mt-1 text-xs text-nd-text-muted">{tab.cwd || "workspace"}</div>
          </button>
        ))}
      </div>
    </FocusTrapContainer>
  );
}
