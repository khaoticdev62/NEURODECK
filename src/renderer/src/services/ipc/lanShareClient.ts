import type {
  AddManualLanSharePeerRequest,
  LanShareIdentity,
  LanSharePeer,
  LanSharePeerIdRequest,
  LanShareServiceStatus,
  LanShareSettings,
  LanShareTransferJob,
  LanShareTransferJobIdRequest,
  NdxResult,
  SetLanShareGroupCodeRequest,
  SetLanSharePeerTrustRequest,
  UpdateLanShareSettingsRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getLanShareIdentity(): Promise<NdxResult<LanShareIdentity>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.getIdentity()
}

export async function getLanShareServiceStatus(): Promise<NdxResult<LanShareServiceStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.getServiceStatus()
}

export async function getLanShareSettings(): Promise<NdxResult<LanShareSettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.getSettings()
}

export async function updateLanShareSettings(
  request: UpdateLanShareSettingsRequest
): Promise<NdxResult<LanShareSettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.updateSettings(request)
}

export async function setLanShareGroupCode(
  request: SetLanShareGroupCodeRequest
): Promise<NdxResult<LanShareSettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.setGroupCode(request)
}

export async function listLanSharePeers(): Promise<NdxResult<LanSharePeer[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.listPeers()
}

export async function addManualLanSharePeer(
  request: AddManualLanSharePeerRequest
): Promise<NdxResult<LanSharePeer>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.addManualPeer(request)
}

export async function removeLanSharePeer(request: LanSharePeerIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.removePeer(request)
}

export async function setLanSharePeerTrust(
  request: SetLanSharePeerTrustRequest
): Promise<NdxResult<LanSharePeer>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.setPeerTrust(request)
}

export async function listLanShareTransferJobs(): Promise<NdxResult<LanShareTransferJob[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.listTransferJobs()
}

export async function cancelLanShareTransferJob(
  request: LanShareTransferJobIdRequest
): Promise<NdxResult<boolean>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.lanShare.cancelTransferJob(request)
}

export function onLanShareTransferJobUpdate(
  listener: (jobs: LanShareTransferJob[]) => void
): () => void {
  return getNdxBridge()?.lanShare.onTransferJobUpdate(listener) ?? (() => undefined)
}
