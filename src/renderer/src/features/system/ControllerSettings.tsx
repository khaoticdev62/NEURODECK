import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import {
  HOLD_THRESHOLD_MS,
  REPEAT_DELAY_MS,
  REPEAT_RATE_MS
} from '../../controller/adapters/gamepadPolling'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import type { HapticIntensity } from '../../controller/haptics/hapticPatterns'
import { STICK_DEAD_ZONE } from '../../controller/mappings/standardGamepadMapping'
import {
  getControllerSettings,
  setControllerSettings
} from '../../services/ipc/controllerSettingsClient'

const INTENSITY_LEVELS: HapticIntensity[] = ['off', 'low', 'medium', 'high']

interface DeferredSection {
  title: string
  reason: string
}

const DEFERRED_SECTIONS: DeferredSection[] = [
  {
    title: 'App profiles',
    reason:
      'Per-app focus-speed/haptics profile switching needs a profile-switching concept this slice doesn’t build.'
  },
  {
    title: 'Rear buttons (L4/L5/R4/R5) and gyro',
    reason:
      'Not visible to the standard Gamepad API — needs Steam Input or a native/SDL adapter, a documented open gap.'
  },
  { title: 'Trackpad fallback', reason: 'Needs the same native adapter as rear buttons/gyro.' },
  {
    title: 'Accessibility',
    reason:
      'Needs its own design pass (hold-duration relief, one-handed remap, sticky modifiers) not started yet.'
  }
]

/**
 * ND-043 Controller Settings, scoped to the one real adjustable value this
 * app has: haptics intensity, now genuinely persisted across restarts (the
 * gap `ControllerCalibration.tsx`'s session-only intensity control left
 * open). Hold duration, repeat delay, repeat rate, and stick dead zone are
 * shown as real read-only values for the same reason Calibration shows
 * them that way — making them adjustable needs a config-threading refactor
 * through the pure, tested `gamepadPolling.ts` module, a separate piece of
 * work from persisting one already-adjustable setting.
 */
export function ControllerSettings(): React.JSX.Element {
  const navigate = useNavigate()
  const { controllerKind, haptics } = useFocusEngine()
  const [intensity, setIntensity] = useState<HapticIntensity>(haptics.getIntensity())
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getControllerSettings().then((result) => {
      if (!active) return
      if (result.ok) setIntensity(result.data.hapticsIntensity)
      else setError(result.error.userMessage)
    })
    return () => {
      active = false
    }
  }, [])

  async function applyIntensity(level: HapticIntensity): Promise<void> {
    haptics.setIntensity(level)
    setIntensity(level)
    const result = await setControllerSettings({ hapticsIntensity: level })
    if (result.ok) {
      setSaveStatus('Saved — this setting now survives a restart.')
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function testHaptics(): Promise<void> {
    const result = await haptics.trigger(0, 'selection')
    setTestResult(result)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Controller Settings</p>
        <ControllerButton variant="ghost" onClick={() => navigate('/onboarding/calibration')}>
          Test controller input
        </ControllerButton>
      </div>

      {error && <ErrorState title="Controller settings error" description={error} />}

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Detected controller</p>
        <p className="text-meta text-text-secondary">{controllerKind}</p>
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Haptics</p>
        <div className="flex gap-2">
          {INTENSITY_LEVELS.map((level) => (
            <ControllerButton
              key={level}
              variant={intensity === level ? 'primary' : 'secondary'}
              onClick={() => void applyIntensity(level)}
            >
              {level}
            </ControllerButton>
          ))}
        </div>
        <ControllerButton variant="ghost" onClick={() => void testHaptics()}>
          Test haptics
        </ControllerButton>
        {testResult && <p className="text-meta text-text-tertiary">Result: {testResult}</p>}
        {saveStatus && <p className="text-meta text-status-success">{saveStatus}</p>}
      </section>

      <section className="flex flex-col gap-1 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Input timing (read-only)</p>
        <p className="text-meta text-text-secondary">Hold duration: {HOLD_THRESHOLD_MS} ms</p>
        <p className="text-meta text-text-secondary">Repeat delay: {REPEAT_DELAY_MS} ms</p>
        <p className="text-meta text-text-secondary">Repeat rate: {REPEAT_RATE_MS} ms</p>
        <p className="text-meta text-text-secondary">Left-stick dead zone: {STICK_DEAD_ZONE}</p>
        <p className="text-meta text-text-tertiary">
          Not adjustable yet — needs a config-threading refactor through the polling engine.
        </p>
      </section>

      {DEFERRED_SECTIONS.map((section) => (
        <section key={section.title} className="border border-border bg-surface p-3 opacity-60">
          <p className="text-body font-semibold text-text-primary">{section.title}</p>
          <p className="text-meta text-text-tertiary">Not available: {section.reason}</p>
        </section>
      ))}
    </div>
  )
}
