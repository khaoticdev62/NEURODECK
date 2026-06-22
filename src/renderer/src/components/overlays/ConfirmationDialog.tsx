import { ControllerButton } from '../primitives/ControllerButton'
import { Modal } from './Modal'

export interface ConfirmationDialogProps {
  open: boolean
  title: string
  /** The exact action being taken — spec §9.1 requires this to be unambiguous, not generic. */
  action: string
  scope?: string
  consequence?: string
  recovery?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Medium-risk confirmation (wireframe §9.1) — single press to confirm. */
export function ConfirmationDialog({
  open,
  title,
  action,
  scope,
  consequence,
  recovery,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel
}: ConfirmationDialogProps): React.JSX.Element {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <dl className="flex flex-col gap-3 text-body text-text-secondary">
        <Field label="Action" value={action} />
        {scope && <Field label="Scope" value={scope} />}
        {consequence && <Field label="Consequence" value={consequence} />}
        {recovery && <Field label="Recovery" value={recovery} />}
      </dl>
      <div className="flex justify-end gap-3">
        <ControllerButton variant="ghost" onClick={onCancel}>
          Cancel
        </ControllerButton>
        <ControllerButton variant="primary" onClick={onConfirm}>
          {confirmLabel}
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
