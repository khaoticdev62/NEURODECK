import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLockStatus, removeLockPin, setLockPin, verifyLockPin } from '../lockClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('lockClient', () => {
  it('returns a real bridge-unavailable error when window.ndx is missing', async () => {
    const result = await getLockStatus()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('returns bridge-unavailable when window.ndx exists but has no lock namespace', async () => {
    // @ts-expect-error partial bridge stub, same shape several existing tests already use
    window.ndx = { power: { quitApp: vi.fn() } }

    const result = await getLockStatus()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('delegates getStatus()', async () => {
    const getStatus = vi.fn().mockResolvedValue({ ok: true, data: { enabled: true } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { lock: { getStatus } }

    const result = await getLockStatus()

    expect(getStatus).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true, data: { enabled: true } })
  })

  it('delegates setPin() with the request payload', async () => {
    const setPin = vi.fn().mockResolvedValue({ ok: true, data: { enabled: true } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { lock: { setPin } }

    await setLockPin({ newPin: '1234', currentPin: '0000' })

    expect(setPin).toHaveBeenCalledWith({ newPin: '1234', currentPin: '0000' })
  })

  it('delegates removePin() with the request payload', async () => {
    const removePin = vi.fn().mockResolvedValue({ ok: true, data: { enabled: false } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { lock: { removePin } }

    await removeLockPin({ currentPin: '1234' })

    expect(removePin).toHaveBeenCalledWith({ currentPin: '1234' })
  })

  it('delegates verifyPin() with the request payload', async () => {
    const verifyPin = vi.fn().mockResolvedValue({ ok: true, data: { valid: true } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { lock: { verifyPin } }

    const result = await verifyLockPin({ pin: '1234' })

    expect(verifyPin).toHaveBeenCalledWith({ pin: '1234' })
    expect(result).toEqual({ ok: true, data: { valid: true } })
  })
})
