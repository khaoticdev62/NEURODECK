import { useRef, useState } from 'react'
import { ControllerButton } from '../primitives/ControllerButton'
import { Modal } from './Modal'

const HOLD_DURATION_MS = 700

export interface CriticalConfirmationDialogProps {
  open: boolean
  title: string
  action: string
  target: string
  consequence: string
  /** Extreme operations may additionally require typing this exact phrase. */
  requiredPhrase?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Irreversible/privileged/external action confirmation (wireframe §9.2).
 * Hold-to-confirm (700ms, spec §4.3) means a single tap or accidental button
 * repeat can never trigger the action — the pointer/key must stay down for
 * the full duration. The confirm trigger is a single `setTimeout`; the fill
 * animation is pure CSS (width transition), not a second source of truth.
 */
export function CriticalConfirmationDialog({
  open,
  title,
  action,
  target,
  consequence,
  requiredPhrase,
  onConfirm,
  onCancel
}: CriticalConfirmationDialogProps): React.JSX.Element {
  const [holding, setHolding] = useState(false)
  const [typedPhrase, setTypedPhrase] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const phraseSatisfied = !requiredPhrase || typedPhrase === requiredPhrase

  function startHold(): void {
    if (!phraseSatisfied) return
    setHolding(true)
    timeoutRef.current = setTimeout(() => {
      setHolding(false)
      onConfirm()
    }, HOLD_DURATION_MS)
  }

  function cancelHold(): void {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setHolding(false)
  }

  function handleClose(): void {
    cancelHold()
    setTypedPhrase('')
    onCancel()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} className="border-status-error/60">
      <div className="rounded-md border border-status-error/40 bg-status-error/10 px-3 py-2 text-meta font-semibold uppercase tracking-wide text-status-error">
        Critical action — cannot be undone
      </div>
      <dl className="flex flex-col gap-3 text-body text-text-secondary">
        <Field label="Action" value={action} />
        <Field label="Target" value={target} />
        <Field label="Consequence" value={consequence} />
      </dl>
      {requiredPhrase && (
        <label className="flex flex-col gap-1 text-meta text-text-secondary">
          Type &ldquo;{requiredPhrase}&rdquo; to enable confirmation
          <input
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            className="rounded-sm border border-border bg-surface-raised px-3 py-2 text-body text-text-primary outline-none focus-visible:border-border-focus"
          />
        </label>
      )}
      <div className="flex justify-end gap-3">
        <ControllerButton variant="ghost" onClick={handleClose}>
          Cancel
        </ControllerButton>
        <ControllerButton
          variant="destructive"
          disabled={!phraseSatisfied}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          className="relative overflow-hidden"
        >
          <span
            className="absolute inset-y-0 left-0 bg-canvas/30 transition-[width] ease-linear"
            style={{
              width: holding ? '100%' : '0%',
              transitionDuration: holding ? `${HOLD_DURATION_MS}ms` : '0ms'
            }}
            aria-hidden
          />
          <span className="relative">Hold to confirm</span>
        </ControllerButton>
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <dt className="text-meta uppercase tracking-wide text-text-tertiary">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}
