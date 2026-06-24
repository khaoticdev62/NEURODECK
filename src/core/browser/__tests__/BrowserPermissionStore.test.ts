import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BrowserPermissionStore } from '../BrowserPermissionStore'

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'browser-permission-store-test-'))
}

describe('BrowserPermissionStore', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await makeTempDir()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('starts empty', async () => {
    const store = new BrowserPermissionStore(join(tempDir, 'permissions.json'))
    expect(await store.list()).toEqual([])
    expect(await store.get('https://example.com', 'notifications')).toBeUndefined()
  })

  it('sets and retrieves a permission grant', async () => {
    const store = new BrowserPermissionStore(join(tempDir, 'permissions.json'))
    const entry = await store.set('https://example.com', 'notifications', true)
    expect(entry.origin).toBe('https://example.com')
    expect(entry.permission).toBe('notifications')
    expect(entry.granted).toBe(true)

    const stored = await store.get('https://example.com', 'notifications')
    expect(stored?.granted).toBe(true)
  })

  it('updates an existing permission and preserves createdAt', async () => {
    const store = new BrowserPermissionStore(join(tempDir, 'permissions.json'))
    const first = await store.set('https://example.com', 'notifications', true)
    const second = await store.set('https://example.com', 'notifications', false)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    expect(second.granted).toBe(false)

    const list = await store.list()
    expect(list).toHaveLength(1)
    expect(list[0].granted).toBe(false)
  })

  it('removes a permission', async () => {
    const store = new BrowserPermissionStore(join(tempDir, 'permissions.json'))
    await store.set('https://example.com', 'notifications', true)
    const removed = await store.remove('https://example.com', 'notifications')
    expect(removed).toBe(true)
    expect(await store.list()).toEqual([])
    expect(await store.remove('https://example.com', 'notifications')).toBe(false)
  })

  it('persists across store instances', async () => {
    const path = join(tempDir, 'permissions.json')
    const first = new BrowserPermissionStore(path)
    await first.set('https://example.com', 'geolocation', false)

    const second = new BrowserPermissionStore(path)
    const stored = await second.get('https://example.com', 'geolocation')
    expect(stored?.granted).toBe(false)
  })
})
