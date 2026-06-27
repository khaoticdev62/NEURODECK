import type {
  ExtensionHealthEvent,
  ExtensionIdRequest,
  ExtensionInstallPreview,
  ExtensionRecord,
  InstallExtensionRequest,
  NdxResult,
  PreviewExtensionInstallRequest,
  SetExtensionEnabledRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listExtensions(): Promise<NdxResult<ExtensionRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.list()
}

export async function previewExtensionInstall(
  request: PreviewExtensionInstallRequest
): Promise<NdxResult<ExtensionInstallPreview>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.previewInstall(request)
}

export async function installExtension(
  request: InstallExtensionRequest
): Promise<NdxResult<ExtensionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.install(request)
}

export async function setExtensionEnabled(
  request: SetExtensionEnabledRequest
): Promise<NdxResult<ExtensionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.setEnabled(request)
}

export async function removeExtension(request: ExtensionIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.remove(request)
}

export async function clearExtensionQuarantine(
  request: ExtensionIdRequest
): Promise<NdxResult<ExtensionRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.extensions.clearQuarantine(request)
}

export function onExtensionHealthEvent(
  listener: (event: ExtensionHealthEvent) => void
): () => void {
  return getNdxBridge()?.extensions.onHealthEvent(listener) ?? (() => undefined)
}
