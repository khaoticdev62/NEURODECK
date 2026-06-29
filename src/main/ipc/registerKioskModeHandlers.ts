import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  setKioskModeRequestSchema,
  type KioskModeSettings,
  type NdxResult
} from '@shared/contracts'
import type { KioskModeStore } from '../../core/kiosk/KioskModeStore'

/** Real Epic X14 Kiosk Mode IPC — see `KioskModeStore` for the real persisted scope behind it. */
export function registerKioskModeHandlers(store: KioskModeStore): void {
  ipcMain.handle(IPC_CHANNELS.kioskModeGet, async (): Promise<NdxResult<KioskModeSettings>> => {
    return { ok: true, data: await store.get() }
  })

  ipcMain.handle(
    IPC_CHANNELS.kioskModeSet,
    async (_event, payload: unknown): Promise<NdxResult<KioskModeSettings>> => {
      const parsed = setKioskModeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That kiosk mode request is invalid.')
        }
      }
      return { ok: true, data: await store.set(parsed.data) }
    }
  )
}
