import type {
  ApplicationIdRequest,
  ApplicationRecord,
  DiscoverApplicationsRequest,
  LaunchApplicationRequest,
  LaunchResult,
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

export async function discoverApplications(
  request?: DiscoverApplicationsRequest
): Promise<NdxResult<ApplicationRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.discover(request)
}

export async function launchApplication(
  request: LaunchApplicationRequest
): Promise<NdxResult<LaunchResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.launch(request)
}

export async function registerAppImage(): Promise<NdxResult<ApplicationRecord | null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.applications.registerAppImage()
}
