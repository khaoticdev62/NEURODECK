import { createContext } from 'react'
import type { DisplaySettings, TextScale } from '@shared/contracts'

export interface DisplaySettingsContextValue extends DisplaySettings {
  setReduceMotion: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setTextScale: (value: TextScale) => void
}

export const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null)
