import type {
  CapabilityId,
  CapabilityState,
  DeviceInventoryCategory,
  DeviceInventoryHealth,
  DeviceInventoryRecord,
  DeviceInventoryReport,
  DeviceRecord,
  SystemMetricsSnapshot
} from '@shared/contracts'
import type { CapabilityRegistry } from '../capability/CapabilityRegistry'
import type { SystemMetricsService } from '../system/SystemMetricsService'
import type { DeviceStore } from './DeviceStore'

const DEVICE_CAPABILITIES: CapabilityId[] = [
  'rear-buttons',
  'haptics',
  'gyro',
  'microphone',
  'camera',
  'bluetooth',
  'network-manager',
  'gpu-acceleration',
  'external-displays'
]

export class DeviceInventoryService {
  constructor(
    private readonly store: DeviceStore,
    private readonly capabilities: CapabilityRegistry,
    private readonly metrics: SystemMetricsService,
    private readonly now: () => number = Date.now
  ) {}

  async collect(): Promise<DeviceInventoryReport> {
    const [persisted, capabilityStates, snapshot] = await Promise.all([
      this.store.list(),
      this.capabilities.refresh(),
      this.metrics.collect()
    ])
    const capabilityMap = new Map(capabilityStates.map((state) => [state.id, state]))
    const devices = [
      ...persisted.map((device) => this.fromPersistedDevice(device, capabilityMap)),
      ...this.fromNetwork(snapshot),
      ...this.fromStorage(snapshot)
    ].sort((a, b) => `${a.category}:${a.name}`.localeCompare(`${b.category}:${b.name}`))
    const categories = Array.from(new Set(devices.map((device) => device.category))).sort()

    return {
      collectedAt: this.now(),
      deviceCount: devices.length,
      connectedCount: devices.filter((device) => device.connected).length,
      categories,
      devices,
      capabilities: DEVICE_CAPABILITIES.map((id) => {
        const state = capabilityMap.get(id)
        return {
          id,
          status: state?.status ?? 'unsupported',
          reason: state?.reason ?? 'Capability was not registered.',
          provider: state?.provider,
          lastCheckedAt: state?.lastCheckedAt ?? this.now()
        }
      }),
      hotPlug: {
        available: false,
        reason:
          'No real OS hot-plug watcher is implemented yet; refresh re-collects current device facts without restarting services.'
      }
    }
  }

  private fromPersistedDevice(
    device: DeviceRecord,
    capabilityMap: Map<string, CapabilityState>
  ): DeviceInventoryRecord {
    const capabilities = device.capabilityDependencies
      .map((id) => capabilityMap.get(id as CapabilityId))
      .filter((state): state is CapabilityState => Boolean(state))
    const worstCapability = capabilities.find((state) => state.status !== 'available')
    return {
      id: `registered:${device.id}`,
      category: mapDeviceCategory(device.category),
      name: device.name,
      type: device.category,
      connected: device.connectionState === 'connected',
      capabilityStatus:
        worstCapability?.status ?? (capabilities.length > 0 ? 'available' : 'not-declared'),
      driverBackend: 'DeviceStore',
      permissions: device.capabilityDependencies,
      health: healthFromConnection(device.connectionState, worstCapability),
      lastEventAt: device.lastSeenAt,
      source: 'persisted-registry',
      detail: device.vendor ? `Vendor: ${device.vendor}` : undefined
    }
  }

  private fromNetwork(snapshot: SystemMetricsSnapshot): DeviceInventoryRecord[] {
    if (!snapshot.network.available || !snapshot.network.value) return []
    return snapshot.network.value.map((networkInterface) => ({
      id: `network:${networkInterface.name}`,
      category: 'network-adapter',
      name: networkInterface.name,
      type: 'Network adapter',
      connected: !networkInterface.internal && networkInterface.addressCount > 0,
      capabilityStatus: 'available',
      driverBackend: snapshot.network.source,
      permissions: [],
      health: networkInterface.internal ? 'unknown' : 'healthy',
      lastEventAt: snapshot.collectedAt,
      source: 'system-metrics',
      detail: `${networkInterface.addressCount} address${networkInterface.addressCount === 1 ? '' : 'es'} · ${networkInterface.families.join(', ')}`
    }))
  }

  private fromStorage(snapshot: SystemMetricsSnapshot): DeviceInventoryRecord[] {
    if (!snapshot.storage.available || !snapshot.storage.value) return []
    const storage = snapshot.storage.value
    return [
      {
        id: `storage:${storage.path}`,
        category: 'storage',
        name: storage.path,
        type: 'Mounted storage',
        connected: true,
        capabilityStatus: 'available',
        driverBackend: snapshot.storage.source,
        permissions: [],
        health: storage.usagePercent >= 95 ? 'degraded' : 'healthy',
        lastEventAt: snapshot.collectedAt,
        source: 'system-metrics',
        detail: `${storage.usagePercent.toFixed(1)}% used`
      }
    ]
  }
}

function mapDeviceCategory(category: DeviceRecord['category']): DeviceInventoryCategory {
  switch (category) {
    case 'bluetooth':
      return 'bluetooth-device'
    case 'audio':
      return 'audio-output'
    case 'display':
      return 'display'
    case 'storage':
      return 'storage'
    case 'controller':
      return 'controller'
    default:
      return 'other'
  }
}

function healthFromConnection(
  connectionState: DeviceRecord['connectionState'],
  worstCapability?: CapabilityState
): DeviceInventoryHealth {
  if (connectionState === 'error') return 'degraded'
  if (connectionState === 'disconnected') return 'unavailable'
  if (worstCapability?.status === 'unsupported') return 'unsupported'
  if (worstCapability && worstCapability.status !== 'available') return 'degraded'
  return connectionState === 'connected' ? 'healthy' : 'unknown'
}
