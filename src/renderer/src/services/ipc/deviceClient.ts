import type {
  DeviceIdRequest,
  DeviceInventoryReport,
  DeviceRecord,
  NdxResult,
  UpsertDeviceRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listDevices(): Promise<NdxResult<DeviceRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.devices.list()
}

export async function collectDeviceInventory(): Promise<NdxResult<DeviceInventoryReport>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.devices.inventory()
}

export async function upsertDevice(request: UpsertDeviceRequest): Promise<NdxResult<DeviceRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.devices.upsert(request)
}

export async function removeDevice(request: DeviceIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.devices.remove(request)
}
