import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  ShareSheetContext,
  type ShareSheetContextValue,
  type SharePayload
} from './shareSheetContext'

/**
 * Real Epic X6 Universal Share Sheet (supplemental §17.4). Mounted
 * once at the app root (`AppProviders`, outside the router) so any
 * screen can call `useShareSheet().openShareSheet(payload)` without
 * prop drilling. The actual `ShareSheetOverlay` is rendered separately
 * inside `ShellLayout` (which is inside the router) since it needs
 * `useNavigate()` — this provider itself stays router-independent,
 * matching `KioskModeProvider`'s split between state and overlay.
 */
export function ShareSheetProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [payload, setPayload] = useState<SharePayload | null>(null)

  const openShareSheet = useCallback((next: SharePayload) => {
    setPayload(next)
  }, [])

  const closeShareSheet = useCallback(() => {
    setPayload(null)
  }, [])

  const value = useMemo<ShareSheetContextValue>(
    () => ({ payload, openShareSheet, closeShareSheet }),
    [payload, openShareSheet, closeShareSheet]
  )

  return <ShareSheetContext.Provider value={value}>{children}</ShareSheetContext.Provider>
}
