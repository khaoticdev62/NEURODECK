import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { KioskModeProvider } from '../kioskMode'
import { useKioskMode } from '../useKioskMode'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('KioskModeProvider / useKioskMode', () => {
  it('loads real persisted settings on mount', async () => {
    stubBridge({
      kioskMode: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            enabled: true,
            allowedRoutePaths: ['/home'],
            restrictSettings: true,
            startRoutePath: '/home'
          }
        }),
        set: vi.fn()
      } as never
    })

    const { result } = renderHook(() => useKioskMode(), {
      wrapper: ({ children }) => <KioskModeProvider>{children}</KioskModeProvider>
    })

    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(result.current.allowedRoutePaths).toEqual(['/home'])
  })

  it('isRouteAllowed permits everything when disabled', () => {
    stubBridge({
      kioskMode: { get: vi.fn().mockResolvedValue({ ok: false }), set: vi.fn() } as never
    })

    const { result } = renderHook(() => useKioskMode(), {
      wrapper: ({ children }) => <KioskModeProvider>{children}</KioskModeProvider>
    })

    expect(result.current.isRouteAllowed('/anything')).toBe(true)
  })

  it('isRouteAllowed blocks settings routes and unlisted routes when enabled', async () => {
    stubBridge({
      kioskMode: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            enabled: true,
            allowedRoutePaths: ['/home'],
            restrictSettings: true,
            startRoutePath: '/home'
          }
        }),
        set: vi.fn()
      } as never
    })

    const { result } = renderHook(() => useKioskMode(), {
      wrapper: ({ children }) => <KioskModeProvider>{children}</KioskModeProvider>
    })
    await waitFor(() => expect(result.current.enabled).toBe(true))

    expect(result.current.isRouteAllowed('/home')).toBe(true)
    expect(result.current.isRouteAllowed('/settings/general')).toBe(false)
    expect(result.current.isRouteAllowed('/build')).toBe(false)
    expect(result.current.isRouteAllowed('/kiosk')).toBe(false)
  })

  it('requestExit only disables kiosk mode when the real PIN is valid', async () => {
    const setMock = vi.fn().mockResolvedValue({
      ok: true,
      data: { enabled: false, allowedRoutePaths: [], restrictSettings: true, startRoutePath: '/' }
    })
    stubBridge({
      kioskMode: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            enabled: true,
            allowedRoutePaths: [],
            restrictSettings: true,
            startRoutePath: '/'
          }
        }),
        set: setMock
      } as never,
      lock: {
        getStatus: vi.fn(),
        setPin: vi.fn(),
        removePin: vi.fn(),
        verifyPin: vi.fn().mockResolvedValue({ ok: true, data: { valid: false } })
      } as never
    })

    const { result } = renderHook(() => useKioskMode(), {
      wrapper: ({ children }) => <KioskModeProvider>{children}</KioskModeProvider>
    })
    await waitFor(() => expect(result.current.enabled).toBe(true))

    let success = false
    await act(async () => {
      success = await result.current.requestExit('wrong')
    })
    expect(success).toBe(false)
    expect(setMock).not.toHaveBeenCalled()

    const bridge = window.ndx as unknown as { lock: { verifyPin: ReturnType<typeof vi.fn> } }
    bridge.lock.verifyPin.mockResolvedValue({ ok: true, data: { valid: true } })

    await act(async () => {
      success = await result.current.requestExit('correct')
    })
    expect(success).toBe(true)
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })
})
