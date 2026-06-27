import { ipcMain } from 'electron'
import {
  backupIdRequestSchema,
  backupRecordSchema,
  backupVerificationSchema,
  createBackupRequestSchema,
  IPC_CHANNELS,
  ndxError,
  type BackupRecord,
  type BackupVerification,
  type NdxResult
} from '@shared/contracts'
import type { BackupService } from '../../core/backup/BackupService'

export function registerBackupHandlers(backupService: BackupService): void {
  ipcMain.handle(IPC_CHANNELS.backupList, async (): Promise<NdxResult<BackupRecord[]>> => {
    const records = await backupService.list()
    return { ok: true, data: backupRecordSchema.array().parse(records) }
  })

  ipcMain.handle(
    IPC_CHANNELS.backupCreate,
    async (_event, payload: unknown): Promise<NdxResult<BackupRecord>> => {
      const parsed = createBackupRequestSchema.safeParse(payload ?? {})
      if (!parsed.success) return invalidRequest()
      const record = await backupService.create(parsed.data)
      return { ok: true, data: backupRecordSchema.parse(record) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.backupVerify,
    async (_event, payload: unknown): Promise<NdxResult<BackupVerification>> => {
      const parsed = backupIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const verification = await backupService.verify(parsed.data.id)
      return { ok: true, data: backupVerificationSchema.parse(verification) }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That backup request is invalid.')
  }
}
