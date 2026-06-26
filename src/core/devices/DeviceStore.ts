import type { DeviceRecord, UpsertDeviceRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface DeviceIndex {
  devices: DeviceRecord[]
}

/**
 * Epic X1 Device Registry (supplemental spec §22) — real persisted CRUD
 * only. Real detection backends (Bluetooth pairing, audio device
 * enumeration, display/dock detection, removable storage) are Epic X8's
 * job; this store is the shared destination those backends will write
 * real, detected records into.
 */
export class DeviceStore {
  private readonly store: JsonStore<DeviceIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<DeviceIndex>(filePath, { devices: [] })
  }

  async list(): Promise<DeviceRecord[]> {
    const index = await this.store.read()
    return index.devices
  }

  async get(id: string): Promise<DeviceRecord | undefined> {
    const index = await this.store.read()
    return index.devices.find((device) => device.id === id)
  }

  async upsert(request: UpsertDeviceRequest): Promise<DeviceRecord> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.devices.find((device) => device.id === request.id)
    const record: DeviceRecord = {
      ...request,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const devices = existing
      ? index.devices.map((device) => (device.id === request.id ? record : device))
      : [...index.devices, record]
    await this.store.write({ devices })
    return record
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.devices.filter((device) => device.id !== id)
    if (next.length === index.devices.length) return false
    await this.store.write({ devices: next })
    return true
  }
}
