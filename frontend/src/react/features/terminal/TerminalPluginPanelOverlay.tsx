import { X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";

export type TerminalPluginPanelOverlayProps = {
  open: boolean;
  onClose: () => void;
  onRunAudit: () => void;
  onRunLuaCheck: () => void;
};

export function TerminalPluginPanelOverlay({
  open,
  onClose,
  onRunAudit,
  onRunLuaCheck,
}: TerminalPluginPanelOverlayProps) {
  if (!open) return null;

  return (
    <FocusTrapContainer
      active={open}
      onEscape={onClose}
      className="fixed left-4 top-24 z-[var(--z-modal)] w-[24rem] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-nd-elevation-card"
      role="dialog"
      aria-label="Terminal plugin hooks"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            Plugin Hooks
          </div>
          <div className="text-sm font-semibold text-nd-text-primary">Lua / Hermes / tool commands</div>
        </div>
        <IconButton aria-label="Close plugin panel" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mt-3 space-y-2 text-sm text-nd-text-muted">
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
          Use the active shell profile to run Lua plugin checks, Fallow audits, or Hermes repair
          commands when the tools are detected in the environment probe.
        </div>
        <Button size="sm" variant="ghost" fullWidth className="min-h-touch" onClick={() => void onRunAudit()}>
          Run Fallow audit
        </Button>
        <Button size="sm" variant="ghost" fullWidth className="min-h-touch" onClick={() => void onRunLuaCheck()}>
          Check Lua runtime
        </Button>
      </div>
    </FocusTrapContainer>
  );
}
