import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DisplaySettings, NdxBridge } from '@shared/contracts'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { DisplayThemeSettings } from '../DisplayThemeSettings'

const BASE_SETTINGS: DisplaySettings = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal',
  accent: 'cyan',
  radiusStyle: 'sharp',
  density: 'comfortable',
  surfaceStyle: 'solid',
  focusStyle: 'ring'
}

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
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS })
      } as never
    })
    renderScreen()

    expect(await screen.findByText('Reduce motion: off')).toBeInTheDocument()
    expect(screen.getByText('High contrast: off')).toBeInTheDocument()
    expect(screen.getByText(/No light theme exists yet/)).toBeInTheDocument()
  })

  it('persists a real reduce-motion change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, reduceMotion: true } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByText('Reduce motion: off'))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, reduceMotion: true })
    expect(await screen.findByText('Reduce motion: on')).toBeInTheDocument()
  })

  it('persists a real text-scale change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, textScale: 'larger' } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: 'larger' }))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, textScale: 'larger' })
  })

  it('persists a real accent change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, accent: 'violet' } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: /Violet/ }))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, accent: 'violet' })
  })

  it('persists a real corner-style change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, radiusStyle: 'round' } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: 'round' }))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, radiusStyle: 'round' })
  })

  it('persists a real density change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, density: 'spacious' } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: 'spacious' }))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, density: 'spacious' })
  })

  it('persists a real focus-style change via IPC', async () => {
    const set = vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, focusStyle: 'underline' } })
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: BASE_SETTINGS }),
        set
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Reduce motion: off')

    await user.click(screen.getByRole('button', { name: 'underline' }))

    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, focusStyle: 'underline' })
  })

  it('disables the glass surface option while high contrast is on', async () => {
    stubBridge({
      displaySettings: {
        get: vi.fn().mockResolvedValue({ ok: true, data: { ...BASE_SETTINGS, highContrast: true } })
      } as never
    })
    renderScreen()

    await screen.findByText('High contrast: on')

    expect(screen.getByRole('button', { name: 'glass' })).toBeDisabled()
  })
})
