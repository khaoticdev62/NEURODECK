import { createContext } from 'react'
import type { KioskModeSettings } from '@shared/contracts'

export interface KioskModeContextValue extends KioskModeSettings {
  isRouteAllowed: (pathname: string) => boolean
  enableKiosk: (settings: Omit<KioskModeSettings, 'enabled'>) => Promise<void>
  /** Verifies the real, existing Lock PIN before disabling kiosk mode — there is no separate kiosk PIN. */
  requestExit: (pin: string) => Promise<boolean>
}

export const KioskModeContext = createContext<KioskModeContextValue | null>(null)
