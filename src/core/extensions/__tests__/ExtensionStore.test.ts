import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ExtensionRecord } from '@shared/contracts'
import { ExtensionStore } from '../ExtensionStore'

let dir: string
let store: ExtensionStore

const sample: ExtensionRecord = {
  manifest: {
    schemaVersion: '1',
    id: 'ext.demo',
    name: 'Demo Extension',
    version: '1.0.0',
    publisher: 'demo-publisher',
    description: 'A demo extension',
    type: 'command',
    entrypoints: { main: 'index.js' },
    capabilities: [],
    minimumNdxVersion: '0.1.0',
    supportedPlatforms: []
  },
  installPath: '/tmp/ext-demo',
  state: 'installed',
  trust: 'unsigned',
  grantedCapabilities: [],
  faultCount: 0,
  installedAt: 1,
  updatedAt: 1
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-extensions-'))
  store = new ExtensionStore(join(dir, 'extensions.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ExtensionStore', () => {
  it('starts with no extensions', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upserts a new extension record', async () => {
    const record = await store.upsert(sample)
    expect(record.manifest.id).toBe('ext.demo')
    expect(await store.get('ext.demo')).toEqual(record)
  })

  it('upserting the same id again replaces the record', async () => {
    await store.upsert(sample)
    const updated = await store.upsert({ ...sample, state: 'quarantined', faultCount: 3 })

    expect(updated.state).toBe('quarantined')
    expect(await store.list()).toHaveLength(1)
  })

  it('removes an extension', async () => {
    await store.upsert(sample)
    expect(await store.remove('ext.demo')).toBe(true)
    expect(await store.list()).toEqual([])
  })

  it('remove() returns false for an unknown id', async () => {
    expect(await store.remove('missing')).toBe(false)
  })
})
