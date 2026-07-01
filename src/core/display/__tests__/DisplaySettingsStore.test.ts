import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DisplaySettingsStore } from '../DisplaySettingsStore'

let dir: string
let store: DisplaySettingsStore
let filePath: string

const DEFAULTS = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal',
  accent: 'cyan',
  radiusStyle: 'sharp',
  density: 'comfortable',
  surfaceStyle: 'solid',
  focusStyle: 'ring'
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-display-settings-'))
  filePath = join(dir, 'display-settings.json')
  store = new DisplaySettingsStore(filePath)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DisplaySettingsStore', () => {
  it('defaults to no overrides, normal text scale, and the theme-builder defaults', async () => {
    expect(await store.get()).toEqual(DEFAULTS)
  })

  it('persists a real change across a new store instance over the same file', async () => {
    await store.set({
      reduceMotion: true,
      highContrast: true,
      textScale: 'larger',
      accent: 'violet',
      radiusStyle: 'round',
      density: 'spacious',
      surfaceStyle: 'glass',
      focusStyle: 'bloom'
    })

    const reopened = new DisplaySettingsStore(filePath)
    expect(await reopened.get()).toEqual({
      reduceMotion: true,
      highContrast: true,
      textScale: 'larger',
      accent: 'violet',
      radiusStyle: 'round',
      density: 'spacious',
      surfaceStyle: 'glass',
      focusStyle: 'bloom'
    })
  })

  it('fills in theme-builder defaults for a file persisted before those fields existed', async () => {
    await writeFile(
      filePath,
      JSON.stringify({ reduceMotion: true, highContrast: false, textScale: 'large' }),
      'utf-8'
    )

    expect(await store.get()).toEqual({
      ...DEFAULTS,
      reduceMotion: true,
      textScale: 'large'
    })
  })
})
