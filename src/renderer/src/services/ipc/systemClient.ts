import type { NdxResult, SystemMetricsSnapshot } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function collectSystemMetrics(): Promise<NdxResult<SystemMetricsSnapshot>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.system.collectMetrics()
}
