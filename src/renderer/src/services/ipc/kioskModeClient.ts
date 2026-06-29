import type { KioskModeSettings, NdxResult, SetKioskModeRequest } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getKioskMode(): Promise<NdxResult<KioskModeSettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.kioskMode) return bridgeUnavailableError()
  return bridge.kioskMode.get()
}

export async function setKioskMode(
  request: SetKioskModeRequest
): Promise<NdxResult<KioskModeSettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.kioskMode) return bridgeUnavailableError()
  return bridge.kioskMode.set(request)
}
