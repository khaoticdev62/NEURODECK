import { afterEach, describe, expect, it, vi } from 'vitest'
import { HapticsService, isHapticsSupported } from '../hapticsService'

function mockGamepads(gamepads: Array<Partial<Gamepad> | null>): void {
  // jsdom does not implement the Gamepad API at all, so there is nothing for
  // vi.spyOn to wrap — the property must be defined before it can be mocked.
  Object.defineProperty(navigator, 'getGamepads', {
    value: vi.fn().mockReturnValue(gamepads as Gamepad[]),
    configurable: true
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isHapticsSupported', () => {
  it('returns false rather than throwing when the Gamepad API itself is unavailable (e.g. some embedders)', () => {
    const original = navigator.getGamepads
    // @ts-expect-error simulating an environment without the Gamepad API at all
    delete navigator.getGamepads
    expect(() => isHapticsSupported(0)).not.toThrow()
    expect(isHapticsSupported(0)).toBe(false)
    Object.defineProperty(navigator, 'getGamepads', { value: original, configurable: true })
  })

  it('returns false when no gamepad is connected', () => {
    mockGamepads([null])
    expect(isHapticsSupported(0)).toBe(false)
  })

  it('returns false when the connected gamepad has no vibrationActuator', () => {
    mockGamepads([{ index: 0 } as Partial<Gamepad>])
    expect(isHapticsSupported(0)).toBe(false)
  })

  it('returns true when a vibrationActuator is present', () => {
    mockGamepads([{ vibrationActuator: { playEffect: vi.fn() } } as unknown as Partial<Gamepad>])
    expect(isHapticsSupported(0)).toBe(true)
  })
})

describe('HapticsService', () => {
  it('defaults to medium intensity', () => {
    const service = new HapticsService()
    expect(service.getIntensity()).toBe('medium')
  })

  it('returns "muted" without touching the actuator when intensity is off', async () => {
    const playEffect = vi.fn()
    mockGamepads([{ vibrationActuator: { playEffect } } as unknown as Partial<Gamepad>])
    const service = new HapticsService()
    service.setIntensity('off')

    const result = await service.trigger(0, 'selection')

    expect(result).toBe('muted')
    expect(playEffect).not.toHaveBeenCalled()
  })

  it('returns "unsupported" when there is no actuator', async () => {
    mockGamepads([{} as Partial<Gamepad>])
    const service = new HapticsService()

    const result = await service.trigger(0, 'selection')

    expect(result).toBe('unsupported')
  })

  it('plays the pattern and scales magnitude by intensity', async () => {
    const playEffect = vi.fn().mockResolvedValue('complete')
    mockGamepads([{ vibrationActuator: { playEffect } } as unknown as Partial<Gamepad>])
    const service = new HapticsService()
    service.setIntensity('low')

    const result = await service.trigger(0, 'selection')

    expect(result).toBe('played')
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', {
      duration: 25,
      weakMagnitude: 0.5 * 0.4,
      strongMagnitude: 0.2 * 0.4
    })
  })
})
