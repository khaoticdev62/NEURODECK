import type { ControllerSettings, NdxResult, SetControllerSettingsRequest } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getControllerSettings(): Promise<NdxResult<ControllerSettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.controllerSettings.get()
}

export async function setControllerSettings(
  request: SetControllerSettingsRequest
): Promise<NdxResult<ControllerSettings>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.controllerSettings.set(request)
}
