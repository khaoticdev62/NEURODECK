import { useContext } from 'react'
import { KioskModeContext, type KioskModeContextValue } from './kioskModeContext'

export function useKioskMode(): KioskModeContextValue {
  const context = useContext(KioskModeContext)
  if (!context) throw new Error('useKioskMode must be used within a KioskModeProvider')
  return context
}
