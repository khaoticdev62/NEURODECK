import { ipcMain } from 'electron'
import {
  applicationIdRequestSchema,
  IPC_CHANNELS,
  ndxError,
  upsertApplicationRequestSchema,
  type ApplicationRecord,
  type NdxResult
} from '@shared/contracts'
import type { ApplicationStore } from '../../core/applications/ApplicationStore'

/** Real Epic X1 Application Registry IPC (supplemental spec §6.2) — CRUD only; discovery is Epic X2. */
export function registerApplicationHandlers(store: ApplicationStore): void {
  ipcMain.handle(
    IPC_CHANNELS.applicationList,
    async (): Promise<NdxResult<ApplicationRecord[]>> => {
      return { ok: true, data: await store.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationUpsert,
    async (_event, payload: unknown): Promise<NdxResult<ApplicationRecord>> => {
      const parsed = upsertApplicationRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That application record is invalid.')
        }
      }
      return { ok: true, data: await store.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = applicationIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That application id is invalid.')
        }
      }
      await store.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )
}
