import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KioskModeStore } from '../KioskModeStore'

describe('KioskModeStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kiosk-mode-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('defaults to disabled with no allowed routes', async () => {
    const store = new KioskModeStore(join(dir, 'kiosk.json'))
    expect(await store.get()).toEqual({
      enabled: false,
      allowedRoutePaths: [],
      restrictSettings: true,
      startRoutePath: '/'
    })
  })

  it('persists real settings across store instances', async () => {
    const path = join(dir, 'kiosk.json')
    const first = new KioskModeStore(path)
    await first.set({
      enabled: true,
      allowedRoutePaths: ['/home', '/build'],
      restrictSettings: true,
      startRoutePath: '/home'
    })

    const second = new KioskModeStore(path)
    expect(await second.get()).toEqual({
      enabled: true,
      allowedRoutePaths: ['/home', '/build'],
      restrictSettings: true,
      startRoutePath: '/home'
    })
  })
})
