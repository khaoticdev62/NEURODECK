import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { DisplayThemeSettings } from '../DisplayThemeSettings'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return render(
    <DisplaySettingsProvider>
      <DisplayThemeSettings />
    </DisplaySettingsProvider>
  )
}

describe('DisplayThemeSettings', () => {
  it('shows real defaults and honestly disabled deferred sections', async () => {
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: { reduceMotion: false, highContrast: false, textScale: 'normal' }
        })
      } as never
    })
    renderScreen()

    expect(await screen.findByText('Reduce motion: off')).toBeInTheDocument()
    expect(screen.getByText('High contrast: off')).toBeInTheDocument()
    expect(screen.getByText(/No light theme exists yet/)).toBeInTheDocument()
  })

  it('persists a real reduce-motion change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: { reduceMotion: true, highContrast: false, textScale: 'normal' }
    })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: { reduceMotion: false, highContrast: false, textScale: 'normal' }
        }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByText('Reduce motion: off'))

    expect(set).toHaveBeenCalledWith({
      reduceMotion: true,
      highContrast: false,
      textScale: 'normal'
    })
    expect(await screen.findByText('Reduce motion: on')).toBeInTheDocument()
  })

  it('persists a real text-scale change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: { reduceMotion: false, highContrast: false, textScale: 'larger' }
    })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: { reduceMotion: false, highContrast: false, textScale: 'normal' }
        }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: 'larger' }))

    expect(set).toHaveBeenCalledWith({
      reduceMotion: false,
      highContrast: false,
      textScale: 'larger'
    })
  })
})
