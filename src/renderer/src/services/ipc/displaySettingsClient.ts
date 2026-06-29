import type { DisplaySettings, NdxResult, SetDisplaySettingsRequest } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getDisplaySettings(): Promise<NdxResult<DisplaySettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.displaySettings) return bridgeUnavailableError()
  return bridge.displaySettings.get()
}

export async function setDisplaySettings(
  request: SetDisplaySettingsRequest
): Promise<NdxResult<DisplaySettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.displaySettings) return bridgeUnavailableError()
  return bridge.displaySettings.set(request)
}
