import type { NetworkDiagnostics, NdxResult } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getNetworkDiagnostics(): Promise<NdxResult<NetworkDiagnostics>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.network.getDiagnostics()
}
