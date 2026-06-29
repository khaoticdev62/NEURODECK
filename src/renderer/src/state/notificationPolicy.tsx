import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MutableToastCategory, NotificationPolicy } from '@shared/contracts'
import type { ToastCategory } from '../components/overlays/toastContext'
import { useToast } from '../components/overlays/useToast'
import {
  getNotificationPolicy,
  setNotificationPolicy as persistNotificationPolicy
} from '../services/ipc/notificationPolicyClient'
import {
  NotificationPolicyContext,
  type NotificationPolicyContextValue
} from './notificationPolicyContext'
import { isWithinQuietHours } from './quietHours'

const DEFAULT_POLICY: NotificationPolicy = {
  mutedCategories: [],
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
}

/** The same real low-priority categories Presentation Mode already mutes — quiet hours reuses this exact set rather than inventing a second notion of "low priority." */
const QUIET_HOURS_CATEGORIES: ToastCategory[] = ['information', 'background-task-complete']

const CHECK_INTERVAL_MS = 30_000

/**
 * Real Epic X14 Notification Policy (supplemental spec §43). Reuses
 * the existing real `ToastContext.muteCategory()`/`unmuteCategory()`
 * mechanism for both user-configured per-category muting and a real
 * quiet-hours window (checked on a real interval, not faked) — never
 * a second, parallel notification-suppression system. `error` and
 * `approval-required` are never muted by this provider, matching
 * spec §43's "Critical security events remain visible."
 */
export function NotificationPolicyProvider({
  children
}: {
  children: ReactNode
}): React.JSX.Element {
  const { muteCategory, unmuteCategory } = useToast()
  const [policy, setPolicy] = useState<NotificationPolicy>(DEFAULT_POLICY)
  const [quietHoursActiveNow, setQuietHoursActiveNow] = useState(false)
  const appliedRef = useRef<Set<ToastCategory>>(new Set())

  const applyMuteSet = useCallback(
    (desired: Set<ToastCategory>) => {
      for (const category of desired) {
        if (!appliedRef.current.has(category)) muteCategory(category)
      }
      for (const category of appliedRef.current) {
        if (!desired.has(category)) unmuteCategory(category)
      }
      appliedRef.current = desired
    },
    [muteCategory, unmuteCategory]
  )

  useEffect(() => {
    let active = true
    getNotificationPolicy().then((result) => {
      if (active && result.ok) setPolicy(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function check(): void {
      setQuietHoursActiveNow(
        policy.quietHoursEnabled &&
          isWithinQuietHours(policy.quietHoursStart, policy.quietHoursEnd, new Date())
      )
    }
    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [policy.quietHoursEnabled, policy.quietHoursStart, policy.quietHoursEnd])

  useEffect(() => {
    const desired = new Set<ToastCategory>(policy.mutedCategories)
    if (quietHoursActiveNow) {
      for (const category of QUIET_HOURS_CATEGORIES) desired.add(category)
    }
    applyMuteSet(desired)
  }, [policy.mutedCategories, quietHoursActiveNow, applyMuteSet])

  const setMutedCategories = useCallback(
    (mutedCategories: MutableToastCategory[]) => {
      const next = { ...policy, mutedCategories }
      setPolicy(next)
      void persistNotificationPolicy(next)
    },
    [policy]
  )

  const setQuietHours = useCallback(
    (quietHoursEnabled: boolean, quietHoursStart: string, quietHoursEnd: string) => {
      const next = { ...policy, quietHoursEnabled, quietHoursStart, quietHoursEnd }
      setPolicy(next)
      void persistNotificationPolicy(next)
    },
    [policy]
  )

  const value = useMemo<NotificationPolicyContextValue>(
    () => ({ policy, quietHoursActiveNow, setMutedCategories, setQuietHours }),
    [policy, quietHoursActiveNow, setMutedCategories, setQuietHours]
  )

  return (
    <NotificationPolicyContext.Provider value={value}>
      {children}
    </NotificationPolicyContext.Provider>
  )
}
