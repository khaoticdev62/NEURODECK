import type {
  BackupIdRequest,
  BackupMigrationReport,
  BackupRecord,
  BackupRestoreResult,
  BackupVerification,
  CreateBackupRequest,
  NdxResult
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listBackups(): Promise<NdxResult<BackupRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.list()
}

export async function createBackup(
  request?: CreateBackupRequest
): Promise<NdxResult<BackupRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.create(request)
}

export async function verifyBackup(
  request: BackupIdRequest
): Promise<NdxResult<BackupVerification>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.verify(request)
}

export async function restoreBackup(
  request: BackupIdRequest
): Promise<NdxResult<BackupRestoreResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.restore(request)
}

export async function importLocalBackup(): Promise<NdxResult<BackupRecord | null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.importLocal()
}

export async function migrateBackups(): Promise<NdxResult<BackupMigrationReport>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.backups.migrate()
}
