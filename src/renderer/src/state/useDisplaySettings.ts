import { useContext } from 'react'
import { DisplaySettingsContext, type DisplaySettingsContextValue } from './displaySettingsContext'

export function useDisplaySettings(): DisplaySettingsContextValue {
  const context = useContext(DisplaySettingsContext)
  if (!context) throw new Error('useDisplaySettings must be used within a DisplaySettingsProvider')
  return context
}
