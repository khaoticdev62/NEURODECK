import type {
  AddManualLanSharePeerRequest,
  LanShareHealth,
  LanShareIdentity,
  LanShareNetworkInterface,
  LanSharePeer,
  LanSharePeerIdRequest,
  LanShareServiceStatus,
  LanShareSettings,
  LanShareTransferJob,
  LanShareTransferJobIdRequest,
  NdxBridge,
  NdxResult,
  SendLanShareFilesRequest,
  SetLanShareGroupCodeRequest,
  SetLanSharePeerTrustRequest,
  UpdateLanShareSettingsRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

function getLanShareBridge(): NdxBridge['lanShare'] | null {
  return getNdxBridge()?.lanShare ?? null
}

export async function getLanShareIdentity(): Promise<NdxResult<LanShareIdentity>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getIdentity()
}

export async function getLanShareServiceStatus(): Promise<NdxResult<LanShareServiceStatus>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getServiceStatus()
}

export async function getLanShareSettings(): Promise<NdxResult<LanShareSettings>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getSettings()
}

export async function updateLanShareSettings(
  request: UpdateLanShareSettingsRequest
): Promise<NdxResult<LanShareSettings>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.updateSettings(request)
}

export async function setLanShareGroupCode(
  request: SetLanShareGroupCodeRequest
): Promise<NdxResult<LanShareSettings>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.setGroupCode(request)
}

export async function listLanSharePeers(): Promise<NdxResult<LanSharePeer[]>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.listPeers()
}

export async function addManualLanSharePeer(
  request: AddManualLanSharePeerRequest
): Promise<NdxResult<LanSharePeer>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.addManualPeer(request)
}

export async function removeLanSharePeer(request: LanSharePeerIdRequest): Promise<NdxResult<null>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.removePeer(request)
}

export async function setLanSharePeerTrust(
  request: SetLanSharePeerTrustRequest
): Promise<NdxResult<LanSharePeer>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.setPeerTrust(request)
}

export async function listLanShareTransferJobs(): Promise<NdxResult<LanShareTransferJob[]>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.listTransferJobs()
}

export async function cancelLanShareTransferJob(
  request: LanShareTransferJobIdRequest
): Promise<NdxResult<boolean>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.cancelTransferJob(request)
}

export function onLanShareTransferJobUpdate(
  listener: (jobs: LanShareTransferJob[]) => void
): () => void {
  return getLanShareBridge()?.onTransferJobUpdate(listener) ?? (() => undefined)
}

export async function startLanShareService(): Promise<NdxResult<LanShareServiceStatus>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.startService()
}

export async function stopLanShareService(): Promise<NdxResult<LanShareServiceStatus>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.stopService()
}

export function onLanShareServiceUpdate(
  listener: (status: LanShareServiceStatus) => void
): () => void {
  return getLanShareBridge()?.onServiceUpdate(listener) ?? (() => undefined)
}

export async function listLanShareInterfaces(): Promise<NdxResult<LanShareNetworkInterface[]>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.listInterfaces()
}

export async function getLanShareHealth(): Promise<NdxResult<LanShareHealth>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.getHealth()
}

export async function sendLanShareFiles(
  request: SendLanShareFilesRequest
): Promise<NdxResult<LanShareTransferJob>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.sendFiles(request)
}

export async function acceptLanShareTransfer(
  request: LanShareTransferJobIdRequest
): Promise<NdxResult<LanShareTransferJob>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.acceptTransfer(request)
}

export async function rejectLanShareTransfer(
  request: LanShareTransferJobIdRequest
): Promise<NdxResult<LanShareTransferJob>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.rejectTransfer(request)
}

export async function pickLanShareFiles(): Promise<NdxResult<string[]>> {
  const bridge = getLanShareBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.pickFiles()
}
