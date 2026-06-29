import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { PresentationModeProvider } from '../../../state/presentationMode'
import { PresentationModeSettingsScreen } from '../PresentationModeSettingsScreen'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderScreen(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <DisplaySettingsProvider>
        <PresentationModeProvider>
          <PresentationModeSettingsScreen />
        </PresentationModeProvider>
      </DisplaySettingsProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('PresentationModeSettingsScreen', () => {
  it('shows Off by default and toggles to On, persisting through the real IPC client', async () => {
    const set = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { enabled: true, keepScreenAwake: true } })
    stubBridge({
      presentationMode: {
        get: vi
          .fn()
          .mockResolvedValue({ ok: true, data: { enabled: false, keepScreenAwake: true } }),
        set
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText('Keep screen awake while active')

    const offButton = await screen.findByRole('button', { name: 'Off' })
    await user.click(offButton)

    expect(set).toHaveBeenCalledWith({ enabled: true, keepScreenAwake: true })
  })
})
