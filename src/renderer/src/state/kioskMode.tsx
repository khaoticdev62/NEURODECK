import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { KioskModeSettings } from '@shared/contracts'
import { verifyLockPin } from '../services/ipc/lockClient'
import { getKioskMode, setKioskMode as persistKioskMode } from '../services/ipc/kioskModeClient'
import { KioskModeContext, type KioskModeContextValue } from './kioskModeContext'

const DEFAULT_SETTINGS: KioskModeSettings = {
  enabled: false,
  allowedRoutePaths: [],
  restrictSettings: true,
  startRoutePath: '/'
}

/**
 * Real Epic X14 Kiosk Mode (supplemental spec §46.2). "Restricted
 * exit" reuses the existing real Lock PIN (`verifyLockPin`) — there
 * is no separate kiosk PIN to manage or forget. `/kiosk` itself
 * counts as a settings route, so it is unreachable while kiosk mode
 * is active, matching "Restricted settings" — exiting is only ever
 * possible through `KioskExitOverlay`'s real PIN prompt.
 */
export function KioskModeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<KioskModeSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let active = true
    void getKioskMode().then((result) => {
      if (active && result.ok) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const isRouteAllowed = useCallback(
    (pathname: string): boolean => {
      if (!settings.enabled) return true
      if (settings.restrictSettings && pathname.startsWith('/settings')) return false
      if (pathname === '/kiosk') return false
      if (settings.allowedRoutePaths.length === 0) return true
      return settings.allowedRoutePaths.includes(pathname)
    },
    [settings]
  )

  const enableKiosk = useCallback(
    async (next: Omit<KioskModeSettings, 'enabled'>): Promise<void> => {
      const updated: KioskModeSettings = { ...next, enabled: true }
      setSettings(updated)
      await persistKioskMode(updated)
    },
    []
  )

  const requestExit = useCallback(
    async (pin: string): Promise<boolean> => {
      const result = await verifyLockPin({ pin })
      if (!result.ok || !result.data.valid) return false
      const updated: KioskModeSettings = { ...settings, enabled: false }
      setSettings(updated)
      await persistKioskMode(updated)
      return true
    },
    [settings]
  )

  const value = useMemo<KioskModeContextValue>(
    () => ({ ...settings, isRouteAllowed, enableKiosk, requestExit }),
    [settings, isRouteAllowed, enableKiosk, requestExit]
  )

  return <KioskModeContext.Provider value={value}>{children}</KioskModeContext.Provider>
}
