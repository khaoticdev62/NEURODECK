import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardAdapter } from '../keyboardAdapter'
import { HOLD_THRESHOLD_MS } from '../gamepadPolling'

describe('KeyboardAdapter', () => {
  let adapter: KeyboardAdapter

  beforeEach(() => {
    vi.useFakeTimers()
    adapter = new KeyboardAdapter()
  })

  afterEach(() => {
    adapter.stop()
    vi.useRealTimers()
  })

  it('emits press for a mapped key', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'confirm', phase: 'press', sourceId: 'keyboard' })
    )
  })

  it('ignores unmapped keys', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }))

    expect(emit).not.toHaveBeenCalled()
  })

  it('emits release on keyup', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    emit.mockClear()
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }))

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'confirm', phase: 'release' })
    )
  })

  it('emits hold for a non-repeatable action after the hold threshold', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    emit.mockClear()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ action: 'confirm', phase: 'hold' }))
  })

  it('cancels the hold timer on keyup before the threshold', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }))
    emit.mockClear()
    vi.advanceTimersByTime(HOLD_THRESHOLD_MS)

    expect(emit).not.toHaveBeenCalled()
  })

  it('forwards native key-repeat as press for repeatable actions only', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
    emit.mockClear()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', repeat: true }))

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ action: 'nav.up', phase: 'press' }))
  })

  it('does not forward native key-repeat for non-repeatable actions', () => {
    const emit = vi.fn()
    adapter.start(emit)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    emit.mockClear()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', repeat: true }))

    expect(emit).not.toHaveBeenCalled()
  })

  it('suppresses navigation/letter shortcuts while typing in a text input (e.g. "form" should not fire pin/inspect/commands)', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const emit = vi.fn()
    adapter.start(emit)

    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }))

    expect(emit).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('still allows confirm and back while typing in a text input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const emit = vi.fn()
    adapter.start(emit)

    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ action: 'confirm' }))
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ action: 'back' }))
    document.body.removeChild(input)
  })

  it('stops emitting after stop()', () => {
    const emit = vi.fn()
    adapter.start(emit)
    adapter.stop()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))

    expect(emit).not.toHaveBeenCalled()
  })
})
