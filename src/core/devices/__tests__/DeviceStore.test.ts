import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UpsertDeviceRequest } from '@shared/contracts'
import { DeviceStore } from '../DeviceStore'

let dir: string
let store: DeviceStore

const sample: UpsertDeviceRequest = {
  id: 'device-1',
  category: 'bluetooth',
  name: 'Wireless Controller',
  connectionState: 'connected',
  capabilityDependencies: ['bluetooth'],
  lastSeenAt: Date.now()
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-devices-'))
  store = new DeviceStore(join(dir, 'devices.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DeviceStore', () => {
  it('starts with no devices', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upserts a new device and stamps createdAt/updatedAt', async () => {
    const record = await store.upsert(sample)

    expect(record.id).toBe('device-1')
    expect(record.createdAt).toBeGreaterThan(0)
    expect(await store.list()).toEqual([record])
  })

  it('upserting the same id again preserves createdAt', async () => {
    const first = await store.upsert(sample)
    const second = await store.upsert({ ...sample, connectionState: 'disconnected' })

    expect(second.createdAt).toBe(first.createdAt)
    expect(second.connectionState).toBe('disconnected')
  })

  it('removes a device', async () => {
    await store.upsert(sample)
    expect(await store.remove('device-1')).toBe(true)
    expect(await store.list()).toEqual([])
  })

  it('remove() returns false for an unknown id', async () => {
    expect(await store.remove('missing')).toBe(false)
  })
})
