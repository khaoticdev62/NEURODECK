import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CapabilityState, SystemMetricsSnapshot } from '@shared/contracts'
import { CapabilityRegistry } from '../../capability/CapabilityRegistry'
import type { SystemMetricsService } from '../../system/SystemMetricsService'
import { DeviceInventoryService } from '../DeviceInventoryService'
import { DeviceStore } from '../DeviceStore'

let dir: string
let store: DeviceStore

const now = 1_700_000_000_000

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-device-inventory-'))
  store = new DeviceStore(join(dir, 'devices.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DeviceInventoryService', () => {
  it('combines persisted device records with real metric-derived devices', async () => {
    await store.upsert({
      id: 'controller-1',
      category: 'controller',
      name: 'Steam Deck Controls',
      connectionState: 'connected',
      capabilityDependencies: ['haptics'],
      lastSeenAt: now - 1000
    })
    const service = new DeviceInventoryService(
      store,
      registry([capability('haptics', 'available')]),
      metrics(sampleSnapshot),
      () => now
    )

    const report = await service.collect()

    expect(report.deviceCount).toBe(3)
    expect(report.connectedCount).toBe(3)
    expect(report.devices.map((device) => device.id).sort()).toEqual([
      'network:wlan0',
      'registered:controller-1',
      'storage:/'
    ])
    expect(report.devices.find((device) => device.id === 'registered:controller-1')).toMatchObject({
      category: 'controller',
      health: 'healthy',
      capabilityStatus: 'available'
    })
  })

  it('reports capability gaps without inventing device cards for unavailable backends', async () => {
    const service = new DeviceInventoryService(
      store,
      registry([capability('bluetooth', 'unsupported', 'No Bluetooth adapter probe exists.')]),
      metrics({
        ...sampleSnapshot,
        network: { available: false, source: 'node:os', reason: 'No network interfaces.' },
        storage: { available: false, source: 'fs.statfs', reason: 'No storage metrics.' }
      }),
      () => now
    )

    const report = await service.collect()

    expect(report.devices).toEqual([])
    expect(report.deviceCount).toBe(0)
    expect(report.hotPlug.available).toBe(false)
    expect(report.capabilities.find((state) => state.id === 'bluetooth')).toMatchObject({
      status: 'unsupported',
      reason: 'No Bluetooth adapter probe exists.'
    })
  })
})

function registry(states: CapabilityState[]): CapabilityRegistry {
  return {
    refresh: async () => states
  } as CapabilityRegistry
}

function metrics(snapshot: SystemMetricsSnapshot): SystemMetricsServiceStub {
  return {
    collect: async () => snapshot
  } as unknown as SystemMetricsServiceStub
}

type SystemMetricsServiceStub = SystemMetricsService

function capability(
  id: CapabilityState['id'],
  status: CapabilityState['status'],
  reason = `${id} is ${status}.`
): CapabilityState {
  return {
    id,
    status,
    reason,
    remediation: [],
    lastCheckedAt: now - 500
  }
}

const sampleSnapshot: SystemMetricsSnapshot = {
  collectedAt: now - 250,
  hostPlatform: 'linux',
  core: { pid: 123, uptimeSeconds: 40 },
  cpu: {
    available: true,
    source: 'node:os',
    value: { usagePercent: 10, logicalCores: 8, model: 'CPU' }
  },
  memory: {
    available: true,
    source: 'node:os',
    value: {
      totalBytes: 100,
      usedBytes: 40,
      availableBytes: 60,
      usagePercent: 40
    }
  },
  swap: { available: false, source: '/proc/meminfo', reason: 'No swap.' },
  storage: {
    available: true,
    source: 'fs.statfs',
    value: {
      path: '/',
      totalBytes: 1000,
      usedBytes: 500,
      availableBytes: 500,
      usagePercent: 50
    }
  },
  battery: { available: false, source: 'sysfs', reason: 'No battery.' },
  thermal: { available: false, source: 'sysfs', reason: 'No thermal sensors.' },
  fans: { available: false, source: 'sysfs', reason: 'No fans.' },
  gpu: { available: false, source: 'sysfs', reason: 'No GPU sensor.' },
  network: {
    available: true,
    source: 'node:os',
    value: [{ name: 'wlan0', addressCount: 1, internal: false, families: ['IPv4'] }]
  },
  processes: { available: true, source: '/proc', value: [] }
}
