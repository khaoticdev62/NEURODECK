import type { NdxResult, UpdateStatus } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getUpdateStatus(): Promise<NdxResult<UpdateStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.update.getStatus()
}

export async function checkForUpdates(): Promise<NdxResult<UpdateStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.update.check()
}
