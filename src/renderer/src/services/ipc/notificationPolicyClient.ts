import type { NdxResult, NotificationPolicy, SetNotificationPolicyRequest } from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getNotificationPolicy(): Promise<NdxResult<NotificationPolicy>> {
  const bridge = getNdxBridge()
  if (!bridge?.notificationPolicy) return bridgeUnavailableError()
  return bridge.notificationPolicy.get()
}

export async function setNotificationPolicy(
  request: SetNotificationPolicyRequest
): Promise<NdxResult<NotificationPolicy>> {
  const bridge = getNdxBridge()
  if (!bridge?.notificationPolicy) return bridgeUnavailableError()
  return bridge.notificationPolicy.set(request)
}
