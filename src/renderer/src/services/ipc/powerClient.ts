import type { NdxResult } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function restartApp(): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.power.restartApp()
}

export async function quitApp(): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.power.quitApp()
}
