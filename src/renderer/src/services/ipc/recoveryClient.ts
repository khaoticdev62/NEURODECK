import type {
  NdxResult,
  RecoveryCheckpoint,
  RecoveryCheckpointRequest,
  RecoveryDiffResult,
  RecoveryStorageSummary,
  WorkspaceRecoveryRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listRecoveryCheckpoints(
  request: WorkspaceRecoveryRequest
): Promise<NdxResult<RecoveryCheckpoint[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.recovery.list(request)
}

export async function getRecoveryDiff(
  request: RecoveryCheckpointRequest
): Promise<NdxResult<RecoveryDiffResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.recovery.diff(request)
}

export async function restoreRecoveryCheckpoint(
  request: RecoveryCheckpointRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.recovery.restore(request)
}

export async function getRecoveryStorageSummary(
  request: WorkspaceRecoveryRequest
): Promise<NdxResult<RecoveryStorageSummary>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.recovery.storageSummary(request)
}
