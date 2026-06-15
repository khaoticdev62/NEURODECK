import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} size="md" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {destructive && (
          <span className="mt-0.5 shrink-0 text-nd-accent-error">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <p className="font-semibold text-nd-text-primary">{title}</p>
          <p className="mt-1 text-sm text-nd-text-secondary">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
