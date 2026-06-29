import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { LockProvider } from '../../../state/lockState'
import { KioskModeProvider } from '../../../state/kioskMode'
import { KioskModeSettings } from '../KioskModeSettings'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return render(
    <AiSafetyProvider>
      <LockProvider>
        <KioskModeProvider>
          <KioskModeSettings />
        </KioskModeProvider>
      </LockProvider>
    </AiSafetyProvider>
  )
}

describe('KioskModeSettings', () => {
  it('disables Enable Kiosk Mode and warns when no Lock PIN is configured', async () => {
    stubBridge({
      kioskMode: { get: vi.fn().mockResolvedValue({ ok: false }), set: vi.fn() } as never,
      lock: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: { enabled: false } })
      } as never
    })

    renderScreen()

    expect(await screen.findByText(/Set a Lock PIN in Privacy and Permissions/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable Kiosk Mode' })).toBeDisabled()
  })

  it('enables kiosk mode with the selected routes once a PIN is configured', async () => {
    const setMock = vi.fn().mockResolvedValue({
      ok: true,
      data: { enabled: true, allowedRoutePaths: ['/'], restrictSettings: true, startRoutePath: '/' }
    })
    stubBridge({
      kioskMode: { get: vi.fn().mockResolvedValue({ ok: false }), set: setMock } as never,
      lock: { getStatus: vi.fn().mockResolvedValue({ ok: true, data: { enabled: true } }) } as never
    })
    const user = userEvent.setup()

    renderScreen()

    const enableButton = await screen.findByRole('button', { name: 'Enable Kiosk Mode' })
    await waitFor(() => expect(enableButton).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Home' }))
    await user.click(enableButton)

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, allowedRoutePaths: ['/'] })
    )
  })
})
