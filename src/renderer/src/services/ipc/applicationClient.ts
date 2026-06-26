import type {
  ApplicationIdRequest,
  ApplicationRecord,
  NdxResult,
  UpsertApplicationRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listApplications(): Promise<NdxResult<ApplicationRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.list()
}

export async function upsertApplication(
  request: UpsertApplicationRequest
): Promise<NdxResult<ApplicationRecord>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.upsert(request)
}

export async function removeApplication(request: ApplicationIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.remove(request)
}
