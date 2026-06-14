import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '../../../focus-trap.js';
import '../../../design-system/components/feedback/Modal';

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
      className="nd-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (closeOnBackdrop) {
            onClose();
          }
        }}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={['nd-modal', sizeClasses[size]].filter(Boolean).join(' ')}
      >
        {title && (
          <div className="nd-modal__head">
            <div>
              <h2 id="modal-title" className="nd-modal__title">
                {title}
              </h2>
              {description && (
                <p id="modal-desc" className="mt-0.5 text-xs text-nd-text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="nd-modal__close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="nd-modal__body">{children}</div>
        {footer && <div className="nd-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
