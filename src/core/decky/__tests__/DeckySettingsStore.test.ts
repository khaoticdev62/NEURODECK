import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DeckySettingsStore } from '../DeckySettingsStore'

let dir: string
let store: DeckySettingsStore
let filePath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-decky-settings-'))
  filePath = join(dir, 'decky-settings.json')
  store = new DeckySettingsStore(filePath)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DeckySettingsStore', () => {
  it('defaults to disabled — the bridge never auto-enables itself', async () => {
    expect(await store.get()).toEqual({ enabled: false })
  })

  it('persists a real enabled change across a new store instance over the same file', async () => {
    await store.set({ enabled: true })

    const reopened = new DeckySettingsStore(filePath)
    expect(await reopened.get()).toEqual({ enabled: true })
  })
})
