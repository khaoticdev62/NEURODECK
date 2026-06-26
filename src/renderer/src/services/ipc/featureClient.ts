import type { FeatureState, NdxResult } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listFeatures(): Promise<NdxResult<FeatureState[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.features.list()
}
