import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DisplaySettings, NdxBridge } from '@shared/contracts'
import { getDisplaySettings, setDisplaySettings } from '../displaySettingsClient'

const BASE_SETTINGS: DisplaySettings = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal',
  accent: 'cyan',
  radiusStyle: 'soft',
  density: 'comfortable',
  surfaceStyle: 'solid',
  focusStyle: 'ring'
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('displaySettingsClient', () => {
  it('returns a bridge-unavailable error rather than throwing when displaySettings is missing from the bridge', async () => {
    window.ndx = {} as NdxBridge

    await expect(getDisplaySettings()).resolves.toMatchObject({ ok: false })
    await expect(setDisplaySettings(BASE_SETTINGS)).resolves.toMatchObject({ ok: false })
  })

  it('calls the real bridge methods when displaySettings is present', async () => {
    const get = vi.fn().mockResolvedValue({
      ok: true,
      data: BASE_SETTINGS
    })
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: { ...BASE_SETTINGS, textScale: 'large' }
    })
    window.ndx = { displaySettings: { get, set } } as never

    expect(await getDisplaySettings()).toEqual({
      ok: true,
      data: BASE_SETTINGS
    })
    await setDisplaySettings({ ...BASE_SETTINGS, textScale: 'large' })
    expect(set).toHaveBeenCalledWith({ ...BASE_SETTINGS, textScale: 'large' })
  })
})
