export type HapticEvent =
  | 'focusMovement'
  | 'paneBoundary'
  | 'selection'
  | 'success'
  | 'warning'
  | 'destructiveConfirmation'
  | 'invalidAction'
  | 'agentApprovalNeeded'

export type HapticIntensity = 'off' | 'low' | 'medium' | 'high'

export interface HapticPulse {
  durationMs: number
  weakMagnitude: number
  strongMagnitude: number
  /** Gap before the next pulse in a multi-pulse pattern; omitted on the last pulse. */
  gapMs?: number
}

/** Event -> pulse pattern (wireframe §4.4). Magnitudes are full-intensity; scaled by `intensityScale`. */
export const HAPTIC_PATTERNS: Record<HapticEvent, HapticPulse[]> = {
  focusMovement: [{ durationMs: 12, weakMagnitude: 0.15, strongMagnitude: 0 }],
  paneBoundary: [{ durationMs: 35, weakMagnitude: 0.4, strongMagnitude: 0.1 }],
  selection: [{ durationMs: 25, weakMagnitude: 0.5, strongMagnitude: 0.2 }],
  success: [
    { durationMs: 30, weakMagnitude: 0.3, strongMagnitude: 0, gapMs: 40 },
    { durationMs: 45, weakMagnitude: 0.5, strongMagnitude: 0.1 }
  ],
  warning: [{ durationMs: 220, weakMagnitude: 0.6, strongMagnitude: 0.3 }],
  destructiveConfirmation: [
    { durationMs: 90, weakMagnitude: 0.8, strongMagnitude: 0.6, gapMs: 60 },
    { durationMs: 90, weakMagnitude: 0.8, strongMagnitude: 0.6 }
  ],
  invalidAction: [
    { durationMs: 50, weakMagnitude: 0.5, strongMagnitude: 0, gapMs: 30 },
    { durationMs: 20, weakMagnitude: 0.2, strongMagnitude: 0, gapMs: 30 },
    { durationMs: 50, weakMagnitude: 0.5, strongMagnitude: 0 }
  ],
  agentApprovalNeeded: [
    { durationMs: 40, weakMagnitude: 0.4, strongMagnitude: 0.2, gapMs: 50 },
    { durationMs: 40, weakMagnitude: 0.4, strongMagnitude: 0.2, gapMs: 50 },
    { durationMs: 40, weakMagnitude: 0.4, strongMagnitude: 0.2 }
  ]
}

const INTENSITY_SCALE: Record<HapticIntensity, number> = {
  off: 0,
  low: 0.4,
  medium: 0.7,
  high: 1
}

export function intensityScale(level: HapticIntensity): number {
  return INTENSITY_SCALE[level]
}
