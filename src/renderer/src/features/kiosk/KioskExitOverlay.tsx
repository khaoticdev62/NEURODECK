import { useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useKioskMode } from '../../state/useKioskMode'

/**
 * Real, globally-mounted Kiosk Mode exit control (supplemental spec
 * §46.2 "Restricted exit") — rendered regardless of the current
 * route's allowlist status, the same "always reachable" principle
 * `RecordingIndicatorOverlay` already established for its Stop
 * control. Exiting requires the real, existing Lock PIN.
 */
export function KioskExitOverlay(): React.JSX.Element | null {
  const { enabled, requestExit } = useKioskMode()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return null

  async function handleSubmit(): Promise<void> {
    const success = await requestExit(pin)
    if (success) {
      setOpen(false)
      setPin('')
      setError(null)
    } else {
      setError('Incorrect PIN.')
      setPin('')
    }
  }

  return (
    <div
      role="status"
      className="pointer-events-auto fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {open ? (
        <div className="flex flex-col gap-2 rounded-md ndx-settings-section shadow-lg">
          <p className="text-meta font-semibold text-text-primary">Enter PIN to exit Kiosk Mode</p>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
            aria-label="Kiosk exit PIN"
          />
          {error && (
            <p role="alert" className="text-meta text-status-error">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <ControllerButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </ControllerButton>
            <ControllerButton variant="primary" disabled={!pin} onClick={() => void handleSubmit()}>
              Exit Kiosk Mode
            </ControllerButton>
          </div>
        </div>
      ) : (
        <ControllerButton variant="secondary" onClick={() => setOpen(true)}>
          Exit Kiosk Mode
        </ControllerButton>
      )}
    </div>
  )
}
