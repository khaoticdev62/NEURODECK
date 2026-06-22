import type {
  ControllerAction,
  ControllerActionEvent,
  ControllerActionListener
} from './controllerAction'
import {
  LEFT_STICK_AXES,
  STANDARD_BUTTON_ACTION,
  STANDARD_CHORDS,
  STICK_DEAD_ZONE
} from '../mappings/standardGamepadMapping'

export const HOLD_THRESHOLD_MS = 700
export const REPEAT_DELAY_MS = 400
export const REPEAT_RATE_MS = 120

const REPEATABLE_ACTIONS = new Set<ControllerAction>([
  'nav.up',
  'nav.down',
  'nav.left',
  'nav.right',
  'tab.previous',
  'tab.next',
  'pane.previous',
  'pane.next'
])

/** Decoupled from the real Gamepad object so the polling logic is pure and testable. */
export interface GamepadFrameInput {
  /** `buttons[i]` is whether physical button `i` is currently pressed. */
  buttons: boolean[]
  /** `axes[i]` matches the standard-mapping axis layout (0/1 = left stick x/y). */
  axes: number[]
}

interface RawKeyState {
  pressedAt: number
  holdFired: boolean
  nextRepeatAt: number
}

export interface GamepadFrameState {
  keys: Map<string, RawKeyState>
  activeChords: Set<string>
}

export function createGamepadFrameState(): GamepadFrameState {
  return { keys: new Map(), activeChords: new Set() }
}

function rawPressedKeys(input: GamepadFrameInput): Set<string> {
  const pressed = new Set<string>()
  input.buttons.forEach((isPressed, index) => {
    if (isPressed) pressed.add(`btn:${index}`)
  })

  const x = input.axes[LEFT_STICK_AXES.x] ?? 0
  const y = input.axes[LEFT_STICK_AXES.y] ?? 0
  if (y < -STICK_DEAD_ZONE) pressed.add('stick:up')
  if (y > STICK_DEAD_ZONE) pressed.add('stick:down')
  if (x < -STICK_DEAD_ZONE) pressed.add('stick:left')
  if (x > STICK_DEAD_ZONE) pressed.add('stick:right')

  return pressed
}

function actionForRawKey(key: string): ControllerAction | undefined {
  if (key.startsWith('stick:')) {
    const direction = key.slice('stick:'.length)
    return `nav.${direction}` as ControllerAction
  }
  const index = Number(key.slice('btn:'.length))
  return STANDARD_BUTTON_ACTION[index]
}

function consumedButtonIndices(rawPressed: Set<string>): {
  consumed: Set<number>
  active: Set<string>
} {
  const consumed = new Set<number>()
  const active = new Set<string>()
  for (const chord of STANDARD_CHORDS) {
    const allHeld = chord.buttons.every((index) => rawPressed.has(`btn:${index}`))
    if (allHeld) {
      chord.buttons.forEach((index) => consumed.add(index))
      active.add(chord.action)
    }
  }
  return { consumed, active }
}

/**
 * Pure per-frame transition function (mega-prompt §9.2: debouncing, repeat
 * delay/rate, dead zones, hold detection, chord detection). Kept free of
 * `requestAnimationFrame`/`navigator.getGamepads()` so it can be unit tested
 * by feeding synthetic frames directly.
 */
export function processGamepadFrame(
  input: GamepadFrameInput,
  state: GamepadFrameState,
  now: number,
  sourceId: string,
  emit: ControllerActionListener
): GamepadFrameState {
  const rawPressed = rawPressedKeys(input)
  const { consumed, active } = consumedButtonIndices(rawPressed)

  for (const chordAction of active) {
    if (!state.activeChords.has(chordAction)) {
      emit({ action: chordAction as ControllerAction, phase: 'press', sourceId, timestamp: now })
    }
  }
  for (const chordAction of state.activeChords) {
    if (!active.has(chordAction)) {
      emit({ action: chordAction as ControllerAction, phase: 'release', sourceId, timestamp: now })
    }
  }
  const nextActiveChords = new Set(active)

  const nextKeys = new Map(state.keys)
  const allKeys = new Set([...rawPressed, ...state.keys.keys()])

  for (const key of allKeys) {
    if (key.startsWith('btn:') && consumed.has(Number(key.slice('btn:'.length)))) {
      // Part of an active chord this frame — suppress its individual action.
      nextKeys.delete(key)
      continue
    }

    const action = actionForRawKey(key)
    const isPressed = rawPressed.has(key)
    const wasPressed = state.keys.has(key)

    if (!action) continue

    if (isPressed && !wasPressed) {
      emit({ action, phase: 'press', sourceId, timestamp: now })
      nextKeys.set(key, {
        pressedAt: now,
        holdFired: false,
        nextRepeatAt: now + REPEAT_DELAY_MS
      })
    } else if (isPressed && wasPressed) {
      const keyState = state.keys.get(key)!
      if (REPEATABLE_ACTIONS.has(action) && now >= keyState.nextRepeatAt) {
        emit({ action, phase: 'press', sourceId, timestamp: now })
        nextKeys.set(key, { ...keyState, nextRepeatAt: now + REPEAT_RATE_MS })
      } else if (
        !REPEATABLE_ACTIONS.has(action) &&
        !keyState.holdFired &&
        now - keyState.pressedAt >= HOLD_THRESHOLD_MS
      ) {
        emit({ action, phase: 'hold', sourceId, timestamp: now })
        nextKeys.set(key, { ...keyState, holdFired: true })
      }
    } else if (!isPressed && wasPressed) {
      emit({ action, phase: 'release', sourceId, timestamp: now })
      nextKeys.delete(key)
    }
  }

  return { keys: nextKeys, activeChords: nextActiveChords }
}

export type { ControllerActionEvent }
