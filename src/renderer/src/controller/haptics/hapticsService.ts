import {
  HAPTIC_PATTERNS,
  intensityScale,
  type HapticEvent,
  type HapticIntensity
} from './hapticPatterns'

interface VibrationActuatorLike {
  playEffect(
    type: 'dual-rumble',
    params: { duration: number; weakMagnitude: number; strongMagnitude: number }
  ): Promise<string>
}

function getActuator(gamepadIndex: number): VibrationActuatorLike | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null
  const pad = navigator.getGamepads()[gamepadIndex]
  const actuator = (pad as unknown as { vibrationActuator?: VibrationActuatorLike } | null)
    ?.vibrationActuator
  return actuator ?? null
}

/** Real capability check — never fabricate haptic support (supplemental §3.7). */
export function isHapticsSupported(gamepadIndex: number): boolean {
  return getActuator(gamepadIndex) !== null
}

export type HapticResult = 'played' | 'unsupported' | 'muted'

/**
 * Haptics service (wireframe §4.4, mega-prompt §9.2 "configurable haptics").
 * `intensity` must support off/low/medium/high; `off` short-circuits before
 * ever touching the actuator.
 */
export class HapticsService {
  private intensity: HapticIntensity = 'medium'

  setIntensity(level: HapticIntensity): void {
    this.intensity = level
  }

  getIntensity(): HapticIntensity {
    return this.intensity
  }

  async trigger(gamepadIndex: number, event: HapticEvent): Promise<HapticResult> {
    if (this.intensity === 'off') return 'muted'

    const actuator = getActuator(gamepadIndex)
    if (!actuator) return 'unsupported'

    const scale = intensityScale(this.intensity)
    for (const pulse of HAPTIC_PATTERNS[event]) {
      await actuator.playEffect('dual-rumble', {
        duration: pulse.durationMs,
        weakMagnitude: pulse.weakMagnitude * scale,
        strongMagnitude: pulse.strongMagnitude * scale
      })
      if (pulse.gapMs) await delay(pulse.gapMs)
    }
    return 'played'
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
