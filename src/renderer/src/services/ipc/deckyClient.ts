import type {
  DeckyBridgeStatus,
  DeckyNavigateEvent,
  DeckySettings,
  NdxResult,
  SetDeckySettingsRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getDeckySettings(): Promise<NdxResult<DeckySettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.decky.getSettings()
}

export async function setDeckySettings(
  request: SetDeckySettingsRequest
): Promise<NdxResult<DeckySettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.decky.setSettings(request)
}

export async function getDeckyStatus(): Promise<NdxResult<DeckyBridgeStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.decky.getStatus()
}

export function onDeckyNavigate(listener: (event: DeckyNavigateEvent) => void): () => void {
  return getNdxBridge()?.decky?.onNavigate?.(listener) ?? (() => undefined)
}
