import { useEffect, useMemo, useState } from 'react'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useActionQueueRecords } from '../../ai-safety/useActionQueueRecords'
import { collectSystemMetrics } from '../../services/ipc/systemClient'
import { quitApp, restartApp } from '../../services/ipc/powerClient'
import { useLockState } from '../../state/useLockState'

type PendingPowerAction = 'restart' | 'quit' | null

function shuffledDigits(): string[] {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[digits[i], digits[j]] = [digits[j], digits[i]]
  }
  return digits
}

/**
 * ND-002 Lock Screen, scoped to a single local PIN (see `shared/contracts/lock.ts`
 * for why "[Y] Use account authentication" and per-user personalization are
 * deferred rather than faked). The PIN keypad's digit order is reshuffled
 * every time this mounts — the wireframe spec's security requirement that
 * "Controller PIN uses randomized... selection options" to resist
 * shoulder-surfing.
 */
export function LockScreen(): React.JSX.Element {
  const { unlock, lockedAt } = useLockState()
  const records = useActionQueueRecords()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null)
  const [pendingPower, setPendingPower] = useState<PendingPowerAction>(null)
  const digits = useMemo(() => shuffledDigits(), [])

  useEffect(() => {
    let active = true
    void collectSystemMetrics().then((result) => {
      if (!active || !result.ok) return
      const battery = result.data.battery
      if (battery.available && battery.value?.[0]?.capacityPercent != null) {
        setBatteryPercent(battery.value[0].capacityPercent)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const pendingApprovals = records.filter((record) => record.status === 'pending-approval').length
  const cancelledByLock = records.filter(
    (record) =>
      record.status === 'cancelled' && lockedAt !== null && (record.resolvedAt ?? 0) >= lockedAt
  ).length

  async function attemptUnlock(): Promise<void> {
    if (!pin || checking) return
    setChecking(true)
    setError(null)
    const valid = await unlock(pin)
    setChecking(false)
    if (!valid) {
      setError('Incorrect PIN.')
      setPin('')
    }
  }

  async function handlePowerConfirm(): Promise<void> {
    if (pendingPower === 'restart') await restartApp()
    else if (pendingPower === 'quit') await quitApp()
    setPendingPower(null)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-canvas p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          {batteryPercent !== null ? ` · ${Math.round(batteryPercent)}%` : ''}
        </p>
        <h1 className="text-title font-semibold text-text-primary">NeuroDeck is locked</h1>
        <p className="text-meta text-text-secondary">Enter your PIN to unlock</p>
      </div>

      <div
        aria-label="PIN entry"
        className="flex min-h-8 items-center justify-center gap-2 font-mono text-title text-text-primary"
      >
        {pin
          ? pin
              .split('')
              .map(() => '•')
              .join(' ')
          : '----'}
      </div>

      {error && (
        <p role="alert" className="text-meta text-status-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <PinDigitButton
            key={digit}
            digit={digit}
            onPress={() => setPin((current) => (current.length < 8 ? current + digit : current))}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <ControllerButton variant="ghost" onClick={() => setPin('')} disabled={!pin}>
          Clear
        </ControllerButton>
        <ControllerButton
          variant="primary"
          onClick={() => void attemptUnlock()}
          disabled={!pin || checking}
        >
          {checking ? 'Checking…' : 'Unlock'}
        </ControllerButton>
      </div>

      <div className="flex flex-col items-center gap-1 border-t border-border pt-4 text-center">
        <p className="text-meta text-text-tertiary">
          {pendingApprovals} approval{pendingApprovals === 1 ? '' : 's'} waiting
          {cancelledByLock > 0
            ? ` · ${cancelledByLock} action${cancelledByLock === 1 ? '' : 's'} cancelled while locked`
            : ''}
        </p>
        <p className="text-meta text-text-tertiary opacity-60">
          Account authentication: not available — needs named user profiles (Phase B Epic X10), not
          built yet. The Secrets Vault itself is real; see System Dashboard → Secrets Vault.
        </p>
        <ControllerButton variant="ghost" onClick={() => setPendingPower('quit')}>
          Power options
        </ControllerButton>
      </div>

      <ConfirmationDialog
        open={pendingPower !== null}
        title="Power action"
        action={pendingPower === 'restart' ? 'Restart NeuroDeck' : 'Quit NeuroDeck'}
        consequence="Any unsaved in-progress work in open editors will be lost; persisted data is unaffected. The screen stays locked until NeuroDeck restarts and you unlock again."
        confirmLabel={pendingPower === 'restart' ? 'Restart' : 'Quit'}
        onConfirm={() => void handlePowerConfirm()}
        onCancel={() => setPendingPower(null)}
      />
    </div>
  )
}

function PinDigitButton({
  digit,
  onPress
}: {
  digit: string
  onPress: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `lock-pin-${digit}`,
    groupId: 'lock-screen',
    onActivate: onPress
  })
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      className={`min-h-[var(--ndx-target-min)] min-w-[var(--ndx-target-min)] border font-mono text-title text-text-primary ${
        isFocused ? 'border-border-focus' : 'border-border'
      } bg-surface`}
    >
      {digit}
    </button>
  )
}
