import { useContext } from 'react'
import { DisplayModeContext, type DisplayModeContextValue } from './displayModeContext'

export function useDisplayMode(): DisplayModeContextValue {
  const context = useContext(DisplayModeContext)
  if (!context) throw new Error('useDisplayMode must be used within a DisplayModeProvider')
  return context
}
