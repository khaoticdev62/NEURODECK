import { useContext } from 'react'
import {
  NotificationPolicyContext,
  type NotificationPolicyContextValue
} from './notificationPolicyContext'

export function useNotificationPolicy(): NotificationPolicyContextValue {
  const context = useContext(NotificationPolicyContext)
  if (!context) {
    throw new Error('useNotificationPolicy must be used within a NotificationPolicyProvider')
  }
  return context
}
