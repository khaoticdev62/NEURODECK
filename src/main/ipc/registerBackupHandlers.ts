import { dialog, ipcMain, type BrowserWindow, type OpenDialogOptions } from 'electron'
import {
  backupIdRequestSchema,
  backupMigrationReportSchema,
  backupRecordSchema,
  backupRestoreResultSchema,
  backupVerificationSchema,
  createBackupRequestSchema,
  IPC_CHANNELS,
  ndxError,
  type BackupMigrationReport,
  type BackupRecord,
  type BackupRestoreResult,
  type BackupVerification,
  type NdxResult
} from '@shared/contracts'
import type { BackupService } from '../../core/backup/BackupService'

export function registerBackupHandlers(
  backupService: BackupService,
  getWindow: () => BrowserWindow | null
): void {
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

  ipcMain.handle(
    IPC_CHANNELS.backupRestore,
    async (_event, payload: unknown): Promise<NdxResult<BackupRestoreResult>> => {
      const parsed = backupIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const result = await backupService.restore(parsed.data.id)
        return { ok: true, data: backupRestoreResultSchema.parse(result) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'backup-restore-failed',
            error instanceof Error ? error.message : 'Backup restore failed.'
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.backupImportLocal,
    async (): Promise<NdxResult<BackupRecord | null>> => {
      const window = getWindow()
      const options: OpenDialogOptions = {
        title: 'Import NeuroDeck backup',
        properties: ['openFile'],
        filters: [{ name: 'NeuroDeck backups', extensions: ['json'] }]
      }
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) return { ok: true, data: null }

      try {
        const record = await backupService.importFromPath(result.filePaths[0])
        return { ok: true, data: backupRecordSchema.parse(record) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'backup-import-failed',
            error instanceof Error ? error.message : 'Backup import failed.'
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.backupMigrate,
    async (): Promise<NdxResult<BackupMigrationReport>> => {
      const report = await backupService.migrateManagedBackups()
      return { ok: true, data: backupMigrationReportSchema.parse(report) }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That backup request is invalid.')
  }
}
