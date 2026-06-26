import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UpsertApplicationRequest } from '@shared/contracts'
import { ApplicationStore } from '../ApplicationStore'

let dir: string
let store: ApplicationStore

const sample: UpsertApplicationRequest = {
  id: 'app-1',
  source: 'internal',
  name: 'Build Studio',
  launchArguments: [],
  categories: ['development'],
  installed: true,
  workspaceIds: [],
  launchMode: 'windowed',
  capabilityRequirements: []
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-applications-'))
  store = new ApplicationStore(join(dir, 'applications.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ApplicationStore', () => {
  it('starts with no applications', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upserts a new application and stamps createdAt/updatedAt', async () => {
    const record = await store.upsert(sample)

    expect(record.id).toBe('app-1')
    expect(record.createdAt).toBeGreaterThan(0)
    expect(record.updatedAt).toBe(record.createdAt)
    expect(await store.list()).toEqual([record])
  })

  it('upserting the same id again preserves createdAt but updates the rest', async () => {
    const first = await store.upsert(sample)
    const second = await store.upsert({ ...sample, name: 'Build Studio (renamed)' })

    expect(second.createdAt).toBe(first.createdAt)
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    expect(second.name).toBe('Build Studio (renamed)')
    expect(await store.list()).toEqual([second])
  })

  it('get() returns undefined for an unknown id', async () => {
    expect(await store.get('missing')).toBeUndefined()
  })

  it('removes an application', async () => {
    await store.upsert(sample)
    expect(await store.remove('app-1')).toBe(true)
    expect(await store.list()).toEqual([])
  })

  it('remove() returns false for an unknown id', async () => {
    expect(await store.remove('missing')).toBe(false)
  })
})
