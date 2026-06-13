import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '../../../focus-trap.js';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<FocusTrap | null>(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Focus trap activation / deactivation (restores focus on close)
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    trapRef.current = new FocusTrap(dialogRef.current);
    trapRef.current.activate();
    return () => {
      trapRef.current?.deactivate();
      trapRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      <div
        className="absolute inset-0 bg-nd-bg/70 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full flex-col rounded-2xl border border-nd-text-muted/15',
          'bg-nd-surface shadow-panel-elevated',
          'animate-view-enter outline-none',
          sizeClasses[size],
        ].join(' ')}
      >
        {title && (
          <div className="flex items-start justify-between gap-3 border-b border-nd-text-muted/10 px-5 py-4">
            <div>
              <h2 id="modal-title" className="text-sm font-semibold text-nd-text">{title}</h2>
              {description && (
                <p id="modal-desc" className="mt-0.5 text-xs text-nd-text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg p-1 text-nd-text-muted transition-colors hover:bg-nd-surface-raised hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-nd-text-muted/10 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
