import type { DiagnosticsInfo, NdxResult } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getDiagnosticsInfo(): Promise<NdxResult<DiagnosticsInfo>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.diagnostics.get()
}
