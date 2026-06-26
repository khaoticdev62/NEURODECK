import type {
  AddManualPeerRequest,
  NdxResult,
  PeerDevice,
  PeerIdRequest,
  SendFileToPeerRequest,
  SetPeerTrustRequest,
  TransferJob,
  TransferJobIdRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listPeers(): Promise<NdxResult<PeerDevice[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.peers.list()
}

export async function addManualPeer(request: AddManualPeerRequest): Promise<NdxResult<PeerDevice>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.peers.addManual(request)
}

export async function removePeer(request: PeerIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.peers.remove(request)
}

export async function setPeerTrust(request: SetPeerTrustRequest): Promise<NdxResult<PeerDevice>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.peers.setTrust(request)
}

export async function sendFileToPeer(
  request: SendFileToPeerRequest
): Promise<NdxResult<TransferJob>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.peers.sendFile(request)
}

export function onPeerUpdate(listener: (peers: PeerDevice[]) => void): () => void {
  return getNdxBridge()?.peers.onUpdate(listener) ?? (() => undefined)
}

export async function listTransferJobs(): Promise<NdxResult<TransferJob[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.transferJobs.list()
}

export async function cancelTransferJob(
  request: TransferJobIdRequest
): Promise<NdxResult<boolean>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.transferJobs.cancel(request)
}

export function onTransferJobUpdate(listener: (jobs: TransferJob[]) => void): () => void {
  return getNdxBridge()?.transferJobs.onUpdate(listener) ?? (() => undefined)
}
