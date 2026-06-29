import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PresentationModeStore } from '../PresentationModeStore'

describe('PresentationModeStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'presentation-mode-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('defaults to disabled with keep-awake on', async () => {
    const store = new PresentationModeStore(join(dir, 'presentation-mode.json'))
    expect(await store.get()).toEqual({ enabled: false, keepScreenAwake: true })
  })

  it('persists a real change across store instances', async () => {
    const path = join(dir, 'presentation-mode.json')
    const first = new PresentationModeStore(path)
    await first.set({ enabled: true, keepScreenAwake: false })

    const second = new PresentationModeStore(path)
    expect(await second.get()).toEqual({ enabled: true, keepScreenAwake: false })
  })
})
