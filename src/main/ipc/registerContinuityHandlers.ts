import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  recordPowerEventRequestSchema,
  saveSessionSnapshotRequestSchema,
  setSafeModeRequestSchema,
  type ContinuityPowerEvent,
  type ContinuityState,
  type NdxResult
} from '@shared/contracts'
import type { ContinuityStore } from '../../core/continuity/ContinuityStore'

export function registerContinuityHandlers(store: ContinuityStore): void {
  ipcMain.handle(IPC_CHANNELS.continuityStateGet, async (): Promise<NdxResult<ContinuityState>> => {
    return { ok: true, data: await store.getState() }
  })

  ipcMain.handle(
    IPC_CHANNELS.continuitySafeModeSet,
    async (_event, payload: unknown): Promise<NdxResult<ContinuityState>> => {
      const parsed = setSafeModeRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.setSafeMode(parsed.data.active) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.continuityPowerEventRecord,
    async (_event, payload: unknown): Promise<NdxResult<ContinuityPowerEvent>> => {
      const parsed = recordPowerEventRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.recordPowerEvent(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.continuitySessionSnapshotSave,
    async (_event, payload: unknown): Promise<NdxResult<ContinuityState>> => {
      const parsed = saveSessionSnapshotRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.saveSessionSnapshot(parsed.data) }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That continuity request is invalid.')
  }
}
