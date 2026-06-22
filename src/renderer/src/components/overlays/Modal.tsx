import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalFocusEngine } from '../../controller/focus/useFocusEngine'
import { cn } from '../primitives/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Wireframe §3.1: standard modal max width is 760px; pass false for fullscreen dialogs (1184px safe width). */
  fullscreen?: boolean
  className?: string
}

/**
 * Base `Modal` primitive (mega-prompt §8.2). Implements focus-trap-on-open and
 * focus-restoration-to-invoker (spec §5.2 rules 2 and 8) using plain DOM APIs —
 * the full spatial focus graph integration lands in Epic 2.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  fullscreen = false,
  className
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null)
  const invokerRef = useRef<HTMLElement | null>(null)
  // onClose is re-created every render in most callers; reading it via a ref
  // (rather than as an effect dependency) keeps the effect below from
  // re-running on every keystroke inside the modal and stealing focus back
  // to the dialog container.
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Optional: Modal must keep working in isolation (its own unit tests, and
  // any future host without a controller runtime) — `back` is wired through
  // the FocusEngine's action stream only when a provider exists, in addition
  // to the always-available Escape keydown handler below.
  const focusEngine = useOptionalFocusEngine()

  useEffect(() => {
    if (!open) return

    invokerRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const unsubscribeBack = focusEngine?.subscribe('back', () => onCloseRef.current())
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unsubscribeBack?.()
      invokerRef.current?.focus()
    }
  }, [open, focusEngine])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-overlay p-6"
      style={{ zIndex: 'var(--ndx-z-modal)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'flex max-h-full flex-col gap-4 overflow-auto rounded-lg border border-border bg-surface p-6 shadow-elevated',
          fullscreen
            ? 'w-[var(--ndx-dialog-safe-width)]'
            : 'w-full max-w-[var(--ndx-modal-max-width)]',
          className
        )}
      >
        <h2 className="text-title font-semibold text-text-primary">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  )
}
