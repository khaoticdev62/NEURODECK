import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  removeLockPinRequestSchema,
  setLockPinRequestSchema,
  verifyLockPinRequestSchema,
  type LockStatus,
  type NdxResult,
  type VerifyLockPinResult
} from '@shared/contracts'
import { LockPinMismatchError, type LockSettingsStore } from '../../core/lock/LockSettingsStore'

/** Real ND-002 Lock Screen IPC — see `LockSettingsStore` for why this is scoped to a single local PIN. */
export function registerLockHandlers(store: LockSettingsStore): void {
  ipcMain.handle(IPC_CHANNELS.lockGetStatus, async (): Promise<NdxResult<LockStatus>> => {
    return { ok: true, data: await store.getStatus() }
  })

  ipcMain.handle(
    IPC_CHANNELS.lockSetPin,
    async (_event, payload: unknown): Promise<NdxResult<LockStatus>> => {
      const parsed = setLockPinRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.setPin(parsed.data.newPin, parsed.data.currentPin) }
      } catch (error) {
        return { ok: false, error: toLockError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lockRemovePin,
    async (_event, payload: unknown): Promise<NdxResult<LockStatus>> => {
      const parsed = removeLockPinRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.removePin(parsed.data.currentPin) }
      } catch (error) {
        return { ok: false, error: toLockError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lockVerifyPin,
    async (_event, payload: unknown): Promise<NdxResult<VerifyLockPinResult>> => {
      const parsed = verifyLockPinRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const valid = await store.verifyPin(parsed.data.pin)
      return { ok: true, data: { valid } }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That lock screen request is invalid.')
  }
}

function toLockError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof LockPinMismatchError) {
    return ndxError('validation', 'lock-pin-mismatch', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'lock-operation-failed', message, { message })
}
