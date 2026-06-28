import type {
  ContinuityPowerEvent,
  ContinuityState,
  NdxBridge,
  NdxResult,
  RecordPowerEventRequest,
  SaveSessionSnapshotRequest,
  SetSafeModeRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

function getContinuityBridge(): NdxBridge['continuity'] | null {
  return getNdxBridge()?.continuity ?? null
}

export async function getContinuityState(): Promise<NdxResult<ContinuityState>> {
  const bridge = getContinuityBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getState()
}

export async function setSafeMode(
  request: SetSafeModeRequest
): Promise<NdxResult<ContinuityState>> {
  const bridge = getContinuityBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.setSafeMode(request)
}

export async function recordContinuityPowerEvent(
  request: RecordPowerEventRequest
): Promise<NdxResult<ContinuityPowerEvent>> {
  const bridge = getContinuityBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.recordPowerEvent(request)
}

export async function saveSessionSnapshot(
  request: SaveSessionSnapshotRequest
): Promise<NdxResult<ContinuityState>> {
  const bridge = getContinuityBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.saveSessionSnapshot(request)
}
