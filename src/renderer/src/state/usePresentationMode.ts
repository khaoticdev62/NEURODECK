import { useContext } from 'react'
import {
  PresentationModeContext,
  type PresentationModeContextValue
} from './presentationModeContext'

export function usePresentationMode(): PresentationModeContextValue {
  const context = useContext(PresentationModeContext)
  if (!context)
    throw new Error('usePresentationMode must be used within a PresentationModeProvider')
  return context
}
