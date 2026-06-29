import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { getDisplaySettings, setDisplaySettings } from '../displaySettingsClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('displaySettingsClient', () => {
  it('returns a bridge-unavailable error rather than throwing when displaySettings is missing from the bridge', async () => {
    window.ndx = {} as NdxBridge

    await expect(getDisplaySettings()).resolves.toMatchObject({ ok: false })
    await expect(
      setDisplaySettings({ reduceMotion: false, highContrast: false, textScale: 'normal' })
    ).resolves.toMatchObject({ ok: false })
  })

  it('calls the real bridge methods when displaySettings is present', async () => {
    const get = vi.fn().mockResolvedValue({
      ok: true,
      data: { reduceMotion: false, highContrast: false, textScale: 'normal' }
    })
    const set = vi.fn().mockResolvedValue({
      ok: true,
      data: { reduceMotion: false, highContrast: false, textScale: 'large' }
    })
    window.ndx = { displaySettings: { get, set } } as never

    expect(await getDisplaySettings()).toEqual({
      ok: true,
      data: { reduceMotion: false, highContrast: false, textScale: 'normal' }
    })
    await setDisplaySettings({ reduceMotion: false, highContrast: false, textScale: 'large' })
    expect(set).toHaveBeenCalledWith({
      reduceMotion: false,
      highContrast: false,
      textScale: 'large'
    })
  })
})
