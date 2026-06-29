import { createContext } from 'react'

export interface PresentationModeContextValue {
  enabled: boolean
  keepScreenAwake: boolean
  setPresentationMode: (enabled: boolean, keepScreenAwake: boolean) => void
}

export const PresentationModeContext = createContext<PresentationModeContextValue | null>(null)
