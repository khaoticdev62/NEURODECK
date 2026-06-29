import { createContext } from 'react'
import type { MutableToastCategory, NotificationPolicy } from '@shared/contracts'

export interface NotificationPolicyContextValue {
  policy: NotificationPolicy
  quietHoursActiveNow: boolean
  setMutedCategories: (categories: MutableToastCategory[]) => void
  setQuietHours: (enabled: boolean, start: string, end: string) => void
}

export const NotificationPolicyContext = createContext<NotificationPolicyContextValue | null>(null)
