import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BrowserTabStore } from '../BrowserTabStore'

let dir: string
let store: BrowserTabStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-browser-tabs-'))
  store = new BrowserTabStore(join(dir, 'browser-tabs.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('BrowserTabStore', () => {
  it('starts with no tabs', async () => {
    expect(await store.list('w1')).toEqual([])
  })

  it('creates a tab scoped to a workspace', async () => {
    const tab = await store.create('w1', 'https://example.com')

    expect(tab.workspaceId).toBe('w1')
    expect(tab.url).toBe('https://example.com')
    expect(tab.loading).toBe(true)
    expect(await store.list('w1')).toEqual([tab])
    expect(await store.list('w2')).toEqual([])
  })

  it('updates real tab metadata', async () => {
    const tab = await store.create('w1', 'https://example.com')
    const updated = await store.update(tab.id, {
      title: 'Example',
      loading: false,
      canGoBack: true
    })

    expect(updated).toMatchObject({ title: 'Example', loading: false, canGoBack: true })
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(tab.updatedAt)
  })

  it('returns undefined when updating a tab that does not exist', async () => {
    expect(await store.update('missing', { title: 'x' })).toBeUndefined()
  })

  it('removes a tab', async () => {
    const tab = await store.create('w1', 'https://example.com')
    await store.remove(tab.id)

    expect(await store.get(tab.id)).toBeUndefined()
    expect(await store.list('w1')).toEqual([])
  })
})
