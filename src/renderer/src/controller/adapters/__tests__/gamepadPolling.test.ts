import { describe, expect, it, vi } from 'vitest'
import {
  createGamepadFrameState,
  HOLD_THRESHOLD_MS,
  processGamepadFrame,
  REPEAT_DELAY_MS,
  REPEAT_RATE_MS,
  type GamepadFrameInput
} from '../gamepadPolling'

function frame(pressedButtons: number[] = [], axes: number[] = [0, 0]): GamepadFrameInput {
  const buttons = Array.from({ length: 17 }, (_, i) => pressedButtons.includes(i))
  return { buttons, axes }
}

describe('processGamepadFrame', () => {
  it('emits a single press when button A (index 0) goes down', () => {
    const emit = vi.fn()
    const state = createGamepadFrameState()

    processGamepadFrame(frame([0]), state, 0, 'gamepad:0', emit)

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({
      action: 'confirm',
      phase: 'press',
      sourceId: 'gamepad:0',
      timestamp: 0
    })
  })

  it('does not re-emit press while held below the hold threshold', () => {
    const emit = vi.fn()
    let state = createGamepadFrameState()
    state = processGamepadFrame(frame([0]), state, 0, 'gamepad:0', emit)
    emit.mockClear()

    processGamepadFrame(frame([0]), state, 200, 'gamepad:0', emit)

    expect(emit).not.toHaveBeenCalled()
  })

  it('emits hold once the threshold is crossed for a non-repeatable action', () => {
    const emit = vi.fn()
    let state = createGamepadFrameState()
    state = processGamepadFrame(frame([0]), state, 0, 'gamepad:0', emit)
    emit.mockClear()

    state = processGamepadFrame(frame([0]), state, HOLD_THRESHOLD_MS, 'gamepad:0', emit)
    expect(emit).toHaveBeenCalledWith({
      action: 'confirm',
      phase: 'hold',
      sourceId: 'gamepad:0',
      timestamp: HOLD_THRESHOLD_MS
    })

    emit.mockClear()
    processGamepadFrame(frame([0]), state, HOLD_THRESHOLD_MS + 10, 'gamepad:0', emit)
    expect(emit).not.toHaveBeenCalled() // hold only fires once
  })

  it('emits release when the button comes back up', () => {
    const emit = vi.fn()
    let state = createGamepadFrameState()
    state = processGamepadFrame(frame([0]), state, 0, 'gamepad:0', emit)
    emit.mockClear()

    processGamepadFrame(frame([]), state, 50, 'gamepad:0', emit)

    expect(emit).toHaveBeenCalledWith({
      action: 'confirm',
      phase: 'release',
      sourceId: 'gamepad:0',
      timestamp: 50
    })
  })

  it('repeats a repeatable action (D-pad up) after the repeat delay, at the repeat rate', () => {
    const emit = vi.fn()
    let state = createGamepadFrameState()
    state = processGamepadFrame(frame([12]), state, 0, 'gamepad:0', emit) // D-pad up -> nav.up
    emit.mockClear()

    state = processGamepadFrame(frame([12]), state, REPEAT_DELAY_MS, 'gamepad:0', emit)
    expect(emit).toHaveBeenCalledWith({
      action: 'nav.up',
      phase: 'press',
      sourceId: 'gamepad:0',
      timestamp: REPEAT_DELAY_MS
    })

    emit.mockClear()
    processGamepadFrame(frame([12]), state, REPEAT_DELAY_MS + REPEAT_RATE_MS, 'gamepad:0', emit)
    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('treats the left stick beyond the dead zone as directional navigation', () => {
    const emit = vi.fn()
    const state = createGamepadFrameState()

    processGamepadFrame(frame([], [0, -1]), state, 0, 'gamepad:0', emit)

    expect(emit).toHaveBeenCalledWith({
      action: 'nav.up',
      phase: 'press',
      sourceId: 'gamepad:0',
      timestamp: 0
    })
  })

  it('ignores stick movement inside the dead zone', () => {
    const emit = vi.fn()
    const state = createGamepadFrameState()

    processGamepadFrame(frame([], [0, -0.1]), state, 0, 'gamepad:0', emit)

    expect(emit).not.toHaveBeenCalled()
  })

  it('detects the LB+RB chord and suppresses the individual tab.previous/tab.next actions', () => {
    const emit = vi.fn()
    const state = createGamepadFrameState()

    processGamepadFrame(frame([4, 5]), state, 0, 'gamepad:0', emit)

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({
      action: 'home',
      phase: 'press',
      sourceId: 'gamepad:0',
      timestamp: 0
    })
  })

  it('emits chord release when the chord breaks', () => {
    const emit = vi.fn()
    let state = createGamepadFrameState()
    state = processGamepadFrame(frame([4, 5]), state, 0, 'gamepad:0', emit)
    emit.mockClear()

    processGamepadFrame(frame([4]), state, 10, 'gamepad:0', emit)

    expect(emit).toHaveBeenCalledWith({
      action: 'home',
      phase: 'release',
      sourceId: 'gamepad:0',
      timestamp: 10
    })
  })
})
