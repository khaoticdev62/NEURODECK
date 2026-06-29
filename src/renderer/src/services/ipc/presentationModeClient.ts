import type {
  NdxResult,
  PresentationModeSettings,
  SetPresentationModeRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getPresentationMode(): Promise<NdxResult<PresentationModeSettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.presentationMode) return bridgeUnavailableError()
  return bridge.presentationMode.get()
}

export async function setPresentationMode(
  request: SetPresentationModeRequest
): Promise<NdxResult<PresentationModeSettings>> {
  const bridge = getNdxBridge()
  if (!bridge?.presentationMode) return bridgeUnavailableError()
  return bridge.presentationMode.set(request)
}
