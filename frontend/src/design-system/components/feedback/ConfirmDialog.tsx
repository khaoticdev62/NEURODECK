import * as React from 'react';
import { Button } from '../core/Button';
import { Modal } from './Modal';

/**
 * Explicit confirmation for destructive or security-sensitive actions. Follows
 * NEURODECK's required copy pattern: specific title, plain-language consequence,
 * exact destructive verb. Never "Are you sure?".
 */
export interface ConfirmDialogProps {
  open: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** Specific action, e.g. `Delete session "Security Lab Notes"?` */
  title: React.ReactNode;
  /** Plain-language consequence of confirming. */
  consequence: React.ReactNode;
  /** Exact verb, e.g. "Delete Session". @default 'Confirm' */
  confirmLabel?: string;
  /** @default 'Cancel' */
  cancelLabel?: string;
  /** @default 'destructive' */
  tone?: 'destructive' | 'security' | 'safe';
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  consequence,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'destructive',
}: ConfirmDialogProps): React.ReactNode {
  const confirmVariant = tone === 'destructive' ? 'danger' : tone === 'security' ? 'danger' : 'primary';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      emphasis={tone === 'safe' ? 'default' : 'critical'}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {consequence}
    </Modal>
  );
}
