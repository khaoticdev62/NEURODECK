import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanShareIdentityStore } from '../LanShareIdentityStore'

describe('LanShareIdentityStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-identity-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('generates and persists a stable identity on first read', async () => {
    const filePath = join(dir, 'identity.json')
    const store = new LanShareIdentityStore(filePath, 'Test Device')
    const first = await store.get()
    expect(first.displayName).toBe('Test Device')

    const reopened = new LanShareIdentityStore(filePath, 'Different Default')
    const second = await reopened.get()
    expect(second.id).toBe(first.id)
    expect(second.displayName).toBe('Test Device')
  })

  it('updates the display name without changing the id', async () => {
    const store = new LanShareIdentityStore(join(dir, 'identity.json'), 'Test Device')
    const original = await store.get()
    const updated = await store.setDisplayName('Renamed Device')
    expect(updated.id).toBe(original.id)
    expect(updated.displayName).toBe('Renamed Device')
  })

  it('generates a connect id matching the real Warpinator format and keeps it stable across reads', async () => {
    const filePath = join(dir, 'identity.json')
    const store = new LanShareIdentityStore(filePath, 'Test Device')
    const identity = await store.get()
    expect(identity.connectId).toMatch(/^.+-[0-9A-F]{20}$/)

    const reopened = new LanShareIdentityStore(filePath, 'Test Device')
    expect((await reopened.get()).connectId).toBe(identity.connectId)
  })
})
