import type {
  ApplicationPolicy,
  ApplicationPolicyIdRequest,
  NdxResult,
  SetApplicationPolicyRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getApplicationPolicy(
  request: ApplicationPolicyIdRequest
): Promise<NdxResult<ApplicationPolicy | null>> {
  const bridge = getNdxBridge()
  if (!bridge?.applicationPolicy) return bridgeUnavailableError()
  return bridge.applicationPolicy.get(request)
}

export async function setApplicationPolicy(
  request: SetApplicationPolicyRequest
): Promise<NdxResult<ApplicationPolicy>> {
  const bridge = getNdxBridge()
  if (!bridge?.applicationPolicy) return bridgeUnavailableError()
  return bridge.applicationPolicy.set(request)
}
