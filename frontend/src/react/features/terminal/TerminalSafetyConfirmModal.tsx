import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Modal } from "../../components/primitives/Modal";
import type { TerminalCommandSafety } from "../../../../../src/shared/terminal/terminalSafetyTypes";

type Props = {
  open: boolean;
  command: string;
  safety: TerminalCommandSafety;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TerminalSafetyConfirmModal({ open, command, safety, description, onConfirm, onCancel }: Props) {
  const isDangerous = safety.level === "dangerous";
  const requiresConfirm = safety.level === "confirm" || safety.level === "dangerous";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isDangerous ? "Dangerous Command" : "Confirm Command"}
      description={isDangerous ? "Type-confirmed actions are required before execution." : "Review the command before it runs."}
      size="md"
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-xl border border-nd-text-muted/20 bg-nd-surface/40 px-4 py-2 text-sm text-nd-text-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!requiresConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${isDangerous ? "bg-nd-accent-error/20 text-nd-accent-error" : "bg-nd-accent-warning/20 text-nd-accent-warning"} disabled:opacity-40`}
          >
            Run
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isDangerous ? <ShieldAlert className="mt-0.5 h-5 w-5 text-nd-accent-error" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-nd-accent-warning" aria-hidden="true" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-nd-text-primary">{safety.reason}</div>
            {description && <div className="mt-1 text-xs text-nd-text-muted">{description}</div>}
          </div>
        </div>
        <pre className="overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-[12px] font-mono text-nd-text-primary">
          {command}
        </pre>
        <div className="text-xs text-nd-text-muted">
          Safety level: <span className={isDangerous ? "text-nd-accent-error" : "text-nd-accent-warning"}>{safety.level}</span>
        </div>
      </div>
    </Modal>
  );
}

