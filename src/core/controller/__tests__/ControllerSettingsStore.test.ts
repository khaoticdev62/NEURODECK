import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ControllerSettingsStore } from '../ControllerSettingsStore'

let dir: string
let store: ControllerSettingsStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-controller-settings-'))
  store = new ControllerSettingsStore(join(dir, 'controller-settings.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ControllerSettingsStore', () => {
  it('defaults to medium haptics intensity', async () => {
    expect(await store.get()).toEqual({ hapticsIntensity: 'medium' })
  })

  it('persists a real change across a new store instance over the same file', async () => {
    await store.set({ hapticsIntensity: 'high' })

    const reopened = new ControllerSettingsStore(join(dir, 'controller-settings.json'))
    expect(await reopened.get()).toEqual({ hapticsIntensity: 'high' })
  })
})
