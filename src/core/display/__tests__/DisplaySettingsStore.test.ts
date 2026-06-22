import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DisplaySettingsStore } from '../DisplaySettingsStore'

let dir: string
let store: DisplaySettingsStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-display-settings-'))
  store = new DisplaySettingsStore(join(dir, 'display-settings.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DisplaySettingsStore', () => {
  it('defaults to no overrides and normal text scale', async () => {
    expect(await store.get()).toEqual({
      reduceMotion: false,
      highContrast: false,
      textScale: 'normal'
    })
  })

  it('persists a real change across a new store instance over the same file', async () => {
    await store.set({ reduceMotion: true, highContrast: true, textScale: 'larger' })

    const reopened = new DisplaySettingsStore(join(dir, 'display-settings.json'))
    expect(await reopened.get()).toEqual({
      reduceMotion: true,
      highContrast: true,
      textScale: 'larger'
    })
  })
})
