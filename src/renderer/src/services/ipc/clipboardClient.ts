import type {
  ClipboardEntry,
  ClipboardEntryIdRequest,
  ClipboardQueryRequest,
  NdxResult,
  SetClipboardMonitoringRequest,
  SetClipboardPinnedRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listClipboardEntries(
  request?: ClipboardQueryRequest
): Promise<NdxResult<ClipboardEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.clipboard.list(request)
}

export async function setClipboardPinned(
  request: SetClipboardPinnedRequest
): Promise<NdxResult<ClipboardEntry>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.clipboard.setPinned(request)
}

export async function removeClipboardEntry(
  request: ClipboardEntryIdRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.clipboard.remove(request)
}

export async function clearClipboard(): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.clipboard.clear()
}

export async function setClipboardMonitoring(
  request: SetClipboardMonitoringRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.clipboard.setMonitoring(request)
}
