import { useEffect, useRef, useState } from "react";
import type { CommandSafety } from "../../shared/ide/ideContracts";
import { Modal } from "../../components/primitives/Modal";
import { Button } from "../../components/primitives/Button";
import { TextInput } from "../../components/primitives/TextInput";

interface SafeCommandConfirmModalProps {
  command: string;
  args: string[];
  cwd: string;
  safety: CommandSafety;
  label: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SafeCommandConfirmModal({
  command,
  args,
  cwd,
  safety,
  label,
  description,
  onConfirm,
  onCancel,
}: SafeCommandConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isDangerous = safety === "dangerous";
  const canConfirm = !isDangerous || typed === "CONFIRM";

  useEffect(() => {
    if (isDangerous) {
      inputRef.current?.focus();
    }
  }, [isDangerous]);

  const cmdPreview = [command, ...args].join(" ");

  return (
    <Modal
      open
      onClose={onCancel}
      title={isDangerous ? "Dangerous Command" : "Confirm Command"}
      description={
        isDangerous
          ? "This command may be irreversible. Type CONFIRM to proceed."
          : "Review the command before running."
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={isDangerous ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            Run
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
            Command
          </span>
          <pre className="mt-1 overflow-x-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary p-3 text-[11px] font-mono text-nd-text-primary">
            {cmdPreview}
          </pre>
        </div>

        <div className="grid gap-3 text-xs text-nd-text-secondary sm:grid-cols-2">
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-nd-text-muted">Label</span>
            <p className="mt-1 truncate">{label}</p>
          </div>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-nd-text-muted">Safety</span>
            <p
              className={`mt-1 truncate ${isDangerous ? "text-nd-accent-error" : "text-nd-accent-warning"}`}
            >
              {safety}
            </p>
          </div>
        </div>

        {description && <p className="text-xs text-nd-text-secondary">{description}</p>}

        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-nd-text-muted">
            Working Directory
          </span>
          <p className="mt-1 truncate font-mono text-xs text-nd-text-secondary">{cwd}</p>
        </div>

        {isDangerous && (
          <TextInput
            ref={inputRef}
            label="Type CONFIRM to enable the run button"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </div>
    </Modal>
  );
}
