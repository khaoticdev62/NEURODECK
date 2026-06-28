import type {
  ClearDataCategoryRequest,
  ClearDataCategoryResult,
  DataMapEntry,
  NdxResult
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getPrivacyDataMap(): Promise<NdxResult<DataMapEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.privacy) return bridgeUnavailableError()
  return bridge.privacy.getDataMap()
}

export async function clearPrivacyDataCategory(
  request: ClearDataCategoryRequest
): Promise<NdxResult<ClearDataCategoryResult>> {
  const bridge = getNdxBridge()
  if (!bridge?.privacy) return bridgeUnavailableError()
  return bridge.privacy.clearDataCategory(request)
}
