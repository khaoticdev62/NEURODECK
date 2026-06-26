import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ExtensionDataStore } from '../ExtensionDataStore'

let dir: string
let store: ExtensionDataStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-extension-data-'))
  store = new ExtensionDataStore(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ExtensionDataStore', () => {
  it('returns undefined for a key that was never set', async () => {
    expect(await store.get('ext.demo', 'missing')).toBeUndefined()
  })

  it('sets and gets a real value scoped to one extension', async () => {
    await store.set('ext.demo', 'theme', 'dark')
    expect(await store.get('ext.demo', 'theme')).toBe('dark')
  })

  it('keeps two extensions completely isolated from each other', async () => {
    await store.set('ext.one', 'shared-key', 'one')
    await store.set('ext.two', 'shared-key', 'two')

    expect(await store.get('ext.one', 'shared-key')).toBe('one')
    expect(await store.get('ext.two', 'shared-key')).toBe('two')
  })

  it('clear() really removes all of one extension data without touching another', async () => {
    await store.set('ext.one', 'key', 'value')
    await store.set('ext.two', 'key', 'value')

    await store.clear('ext.one')

    expect(await store.get('ext.one', 'key')).toBeUndefined()
    expect(await store.get('ext.two', 'key')).toBe('value')
  })
})
