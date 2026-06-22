import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../primitives/cn'
import { ToastContext, type ToastCategory, type ToastInput, type ToastRecord } from './toastContext'

const CATEGORY_CLASSES: Record<ToastCategory, string> = {
  information: 'border-status-info/40 text-status-info',
  success: 'border-status-success/40 text-status-success',
  warning: 'border-status-warning/40 text-status-warning',
  error: 'border-status-error/40 text-status-error',
  'approval-required': 'border-status-approval/40 text-status-approval',
  'background-task-complete': 'border-status-success/40 text-status-success'
}

const CATEGORY_LABELS: Record<ToastCategory, string> = {
  information: 'Information',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  'approval-required': 'Approval required',
  'background-task-complete': 'Task complete'
}

const MAX_HISTORY = 100

let toastSequence = 0

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const [history, setHistory] = useState<ToastRecord[]>([])
  const [mutedCategories, setMutedCategories] = useState<ReadonlySet<ToastCategory>>(new Set())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: ToastInput): string => {
      const last = history[history.length - 1]
      // Repeated identical events collapse into one threaded card (ND-012 rules) rather than stacking.
      const isDuplicate =
        last !== undefined && last.category === toast.category && last.title === toast.title
      const id = isDuplicate ? last.id : `toast-${++toastSequence}`
      const timestamp = Date.now()

      if (isDuplicate) {
        const collapsed: ToastRecord = { ...last, ...toast, id, timestamp, count: last.count + 1 }
        setHistory((current) => [...current.slice(0, -1), collapsed])
        setToasts((current) => current.map((t) => (t.id === id ? collapsed : t)))
        return id
      }

      const record: ToastRecord = { ...toast, id, timestamp, count: 1 }
      setHistory((current) => [...current, record].slice(-MAX_HISTORY))

      if (!mutedCategories.has(toast.category)) {
        setToasts((current) => [...current, record])
        if (toast.durationMs) {
          setTimeout(() => dismiss(id), toast.durationMs)
        }
      }

      return id
    },
    [history, mutedCategories, dismiss]
  )

  const muteCategory = useCallback((category: ToastCategory) => {
    setMutedCategories((current) => new Set(current).add(category))
  }, [])

  const unmuteCategory = useCallback((category: ToastCategory) => {
    setMutedCategories((current) => {
      const next = new Set(current)
      next.delete(category)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ toasts, push, dismiss, history, mutedCategories, muteCategory, unmuteCategory }),
    [toasts, push, dismiss, history, mutedCategories, muteCategory, unmuteCategory]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/**
 * Toasts never steal focus (spec §6.4): the host is `aria-live="polite"` rather
 * than focusable, and dismissal is a click affordance, not a focus target the
 * Spatial Focus Engine (Epic 2) needs to register.
 */
function ToastHost({
  toasts,
  onDismiss
}: {
  toasts: ToastRecord[]
  onDismiss: (id: string) => void
}): React.JSX.Element {
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(var(--ndx-rail-bottom-height)+16px)] right-4 flex flex-col gap-2"
      style={{ zIndex: 'var(--ndx-z-toast)' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-80 flex-col gap-1 rounded-md border bg-surface-raised p-3 shadow-elevated',
            CATEGORY_CLASSES[toast.category]
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-meta font-semibold uppercase tracking-wide">
              {CATEGORY_LABELS[toast.category]}
              {toast.count > 1 ? ` (${toast.count})` : ''}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-meta text-text-tertiary hover:text-text-primary"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <p className="text-body text-text-primary">{toast.title}</p>
          {toast.description && (
            <p className="text-meta text-text-secondary">{toast.description}</p>
          )}
        </div>
      ))}
    </div>,
    document.body
  )
}

export { CATEGORY_LABELS as TOAST_CATEGORY_LABELS }
