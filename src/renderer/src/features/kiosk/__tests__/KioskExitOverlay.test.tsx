import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { KioskModeProvider } from '../../../state/kioskMode'
import { KioskExitOverlay } from '../KioskExitOverlay'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('KioskExitOverlay', () => {
  it('renders nothing when kiosk mode is not enabled', () => {
    stubBridge({
      kioskMode: { get: vi.fn().mockResolvedValue({ ok: false }), set: vi.fn() } as never
    })
    render(
      <KioskModeProvider>
        <KioskExitOverlay />
      </KioskModeProvider>
    )
    expect(screen.queryByRole('button', { name: 'Exit Kiosk Mode' })).not.toBeInTheDocument()
  })

  it('shows an error for an incorrect PIN and exits on a correct one', async () => {
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
        set: vi.fn().mockResolvedValue({ ok: true, data: {} })
      } as never,
      lock: {
        getStatus: vi.fn(),
        setPin: vi.fn(),
        removePin: vi.fn(),
        verifyPin: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, data: { valid: false } })
          .mockResolvedValueOnce({ ok: true, data: { valid: true } })
      } as never
    })
    const user = userEvent.setup()

    render(
      <KioskModeProvider>
        <KioskExitOverlay />
      </KioskModeProvider>
    )

    await user.click(await screen.findByRole('button', { name: 'Exit Kiosk Mode' }))
    await user.type(screen.getByLabelText('Kiosk exit PIN'), '0000')
    await user.click(screen.getByRole('button', { name: 'Exit Kiosk Mode' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect PIN.')

    await user.type(screen.getByLabelText('Kiosk exit PIN'), '1234')
    await user.click(screen.getByRole('button', { name: 'Exit Kiosk Mode' }))

    expect(screen.queryByLabelText('Kiosk exit PIN')).not.toBeInTheDocument()
  })
})
