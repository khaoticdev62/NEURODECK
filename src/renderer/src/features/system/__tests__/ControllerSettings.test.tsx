import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { ControllerSettings } from '../ControllerSettings'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    workspaces: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
    ...partial
  } as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/settings/controller" element={<ControllerSettings />} />
      <Route path="/onboarding/calibration" element={<p>Calibration placeholder</p>} />
    </Routes>,
    { initialEntries: ['/settings/controller'] }
  )
}

describe('ControllerSettings', () => {
  it('shows real read-only input timing values, not fabricated ones', () => {
    stubBridge({
      controllerSettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'medium' } })
      } as never
    })
    renderScreen()

    expect(screen.getByText('700', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('400', { exact: false })).toBeInTheDocument()
  })

  it('shows honestly disabled deferred sections with a real reason', () => {
    stubBridge({
      controllerSettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'medium' } })
      } as never
    })
    renderScreen()

    expect(screen.getByText(/needs Steam Input or a native\/SDL adapter/)).toBeInTheDocument()
  })

  it('persists a real haptics intensity change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'high' } })
    stubBridge({
      controllerSettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'medium' } }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'high' }))

    expect(set).toHaveBeenCalledWith({ hapticsIntensity: 'high' })
    expect(
      await screen.findByText(/Saved — this setting now survives a restart\./)
    ).toBeInTheDocument()
  })
})
