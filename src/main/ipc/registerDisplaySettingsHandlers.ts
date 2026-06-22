import { ipcMain } from 'electron'
import {
  displaySettingsSchema,
  IPC_CHANNELS,
  ndxError,
  type DisplaySettings,
  type NdxResult
} from '@shared/contracts'
import type { DisplaySettingsStore } from '../../core/display/DisplaySettingsStore'

/** Real, persisted ND-044 Display and Theme Settings IPC. */
export function registerDisplaySettingsHandlers(store: DisplaySettingsStore): void {
  ipcMain.handle(IPC_CHANNELS.displaySettingsGet, async (): Promise<NdxResult<DisplaySettings>> => {
    return { ok: true, data: await store.get() }
  })

  ipcMain.handle(
    IPC_CHANNELS.displaySettingsSet,
    async (_event, payload: unknown): Promise<NdxResult<DisplaySettings>> => {
      const parsed = displaySettingsSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That display settings request is invalid.'
          )
        }
      }
      return { ok: true, data: await store.set(parsed.data) }
    }
  )
}
