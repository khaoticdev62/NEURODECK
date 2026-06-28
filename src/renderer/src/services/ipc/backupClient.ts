import type {
  BackupIdRequest,
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
