import { ipcMain } from 'electron'
import {
  deviceIdRequestSchema,
  deviceInventoryReportSchema,
  IPC_CHANNELS,
  ndxError,
  upsertDeviceRequestSchema,
  type DeviceInventoryReport,
  type DeviceRecord,
  type NdxResult
} from '@shared/contracts'
import type { DeviceInventoryService } from '../../core/devices/DeviceInventoryService'
import type { DeviceStore } from '../../core/devices/DeviceStore'

/** Real Epic X1 Device Registry IPC (supplemental spec §22) — CRUD only; detection backends are Epic X8. */
export function registerDeviceHandlers(
  store: DeviceStore,
  inventory?: DeviceInventoryService
): void {
  ipcMain.handle(IPC_CHANNELS.deviceList, async (): Promise<NdxResult<DeviceRecord[]>> => {
    return { ok: true, data: await store.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.deviceInventory,
    async (): Promise<NdxResult<DeviceInventoryReport>> => {
      if (!inventory) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'device-inventory-unavailable',
            'Device inventory is not available in this process.'
          )
        }
      }
      const report = await inventory.collect()
      return { ok: true, data: deviceInventoryReportSchema.parse(report) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deviceUpsert,
    async (_event, payload: unknown): Promise<NdxResult<DeviceRecord>> => {
      const parsed = upsertDeviceRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That device record is invalid.')
        }
      }
      return { ok: true, data: await store.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deviceRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = deviceIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That device id is invalid.')
        }
      }
      await store.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )
}
