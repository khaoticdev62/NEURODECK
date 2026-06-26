import type { CapabilityState, NdxResult } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listCapabilities(): Promise<NdxResult<CapabilityState[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.capabilities.list()
}

export async function refreshCapabilities(): Promise<NdxResult<CapabilityState[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.capabilities.refresh()
}
