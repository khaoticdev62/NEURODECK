import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { CriticalConfirmationDialog } from '../../components/overlays/CriticalConfirmationDialog'
import { HOLD_THRESHOLD_MS } from '../../controller/adapters/gamepadPolling'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import type { HapticIntensity } from '../../controller/haptics/hapticPatterns'
import { STICK_DEAD_ZONE } from '../../controller/mappings/standardGamepadMapping'
import { useControllerActionLog } from './useControllerActionLog'

const INTENSITY_LEVELS: HapticIntensity[] = ['off', 'low', 'medium', 'high']

/**
 * ND-004 Controller Calibration. Built directly on Epic 2's real adapters —
 * button detection and haptics intensity genuinely affect input processing.
 * Stick dead zone, hold duration, and focus movement speed are shown as real
 * read-only values (not fake sliders) because making them user-adjustable
 * needs a config-threading refactor through `gamepadPolling.ts` that's
 * deferred to Epic 11 (Controller Settings) rather than half-built here.
 */
export function ControllerCalibration(): React.JSX.Element {
  const navigate = useNavigate()
  const { controllerKind, haptics } = useFocusEngine()
  const lastEvent = useControllerActionLog()
  const [intensity, setIntensity] = useState<HapticIntensity>(haptics.getIntensity())
  const [hapticsResult, setHapticsResult] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const { ref: doneRef } = useFocusable<HTMLButtonElement>({
    id: 'calibration:done',
    groupId: 'calibration',
    priority: 1,
    initialFocus: true,
    onActivate: () => navigate('/')
  })

  function applyIntensity(level: HapticIntensity): void {
    haptics.setIntensity(level)
    setIntensity(level)
  }

  async function testHaptics(): Promise<void> {
    const result = await haptics.trigger(0, 'selection')
    setHapticsResult(result)
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
      <div>
        <p className="text-title font-semibold text-text-primary">Controller Calibration</p>
        <p className="text-meta text-text-secondary">
          Detected controller: <span className="text-text-primary">{controllerKind}</span>
        </p>
      </div>

      <Section title="1. Button detection">
        <p className="text-body text-text-secondary">
          {lastEvent
            ? `Last input: ${lastEvent.action} (${lastEvent.phase}) from ${lastEvent.sourceId}`
            : 'Press any mapped button or key to see it appear here.'}
        </p>
      </Section>

      <Section title="2. Stick dead zones">
        <p className="text-body text-text-secondary">
          Current left-stick dead zone: <span className="text-text-primary">{STICK_DEAD_ZONE}</span>
        </p>
        <p className="text-meta text-text-tertiary">
          Adjustable per-profile dead zones ship with Epic 11.
        </p>
      </Section>

      <Section title="4. Back-button mapping">
        <p className="text-body text-text-secondary">
          Steam Deck&apos;s rear grip buttons (L4/L5/R4/R5) and Quick Access aren&apos;t visible to
          the standard Gamepad API — they don&apos;t block setup, but won&apos;t register here yet.
        </p>
      </Section>

      <Section title="5. Haptics">
        <div className="flex gap-2">
          {INTENSITY_LEVELS.map((level) => (
            <ControllerButton
              key={level}
              variant={intensity === level ? 'primary' : 'secondary'}
              onClick={() => applyIntensity(level)}
            >
              {level}
            </ControllerButton>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ControllerButton variant="secondary" onClick={testHaptics}>
            Test haptics
          </ControllerButton>
          {hapticsResult && (
            <StatusBadge
              tone={hapticsResult === 'played' ? 'success' : 'neutral'}
              label={
                hapticsResult === 'played'
                  ? 'Played'
                  : hapticsResult === 'muted'
                    ? 'Muted (intensity off)'
                    : 'No controller with haptics detected'
              }
            />
          )}
        </div>
      </Section>

      <Section title="7. Hold duration">
        <p className="text-body text-text-secondary">
          Hold actions trigger after{' '}
          <span className="text-text-primary">{HOLD_THRESHOLD_MS}ms</span>.
        </p>
      </Section>

      <div className="flex justify-between">
        <ControllerButton variant="ghost" onClick={() => setConfirmingReset(true)}>
          Reset calibration
        </ControllerButton>
        <ControllerButton ref={doneRef} variant="primary" onClick={() => navigate('/')}>
          Done
        </ControllerButton>
      </div>

      <CriticalConfirmationDialog
        open={confirmingReset}
        title="Reset calibration"
        action="Reset haptics intensity to the default"
        target="Controller calibration settings"
        consequence="Haptics intensity returns to medium. No other settings are stored yet."
        onConfirm={() => {
          applyIntensity('medium')
          setConfirmingReset(false)
        }}
        onCancel={() => setConfirmingReset(false)}
      />
    </div>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-2 text-body font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}
