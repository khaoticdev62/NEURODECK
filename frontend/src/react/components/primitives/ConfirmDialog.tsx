import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog as DSConfirmDialog } from '../../../design-system/components/feedback/ConfirmDialog';

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
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <DSConfirmDialog
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      consequence={<p className="mt-1 text-sm text-nd-text-secondary">{message}</p>}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone={destructive ? 'destructive' : 'safe'}
      icon={destructive ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : undefined}
    />
  );
}
