import { ipcMain } from 'electron'
import {
  controllerSettingsSchema,
  IPC_CHANNELS,
  ndxError,
  type ControllerSettings,
  type NdxResult
} from '@shared/contracts'
import type { ControllerSettingsStore } from '../../core/controller/ControllerSettingsStore'

/** Real, persisted ND-043 Controller Settings IPC. */
export function registerControllerSettingsHandlers(store: ControllerSettingsStore): void {
  ipcMain.handle(
    IPC_CHANNELS.controllerSettingsGet,
    async (): Promise<NdxResult<ControllerSettings>> => {
      return { ok: true, data: await store.get() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.controllerSettingsSet,
    async (_event, payload: unknown): Promise<NdxResult<ControllerSettings>> => {
      const parsed = controllerSettingsSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That controller settings request is invalid.'
          )
        }
      }
      return { ok: true, data: await store.set(parsed.data) }
    }
  )
}
