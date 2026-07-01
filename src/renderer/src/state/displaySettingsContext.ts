import { createContext } from 'react'
import type {
  Accent,
  Density,
  DisplaySettings,
  FocusStyle,
  RadiusStyle,
  SurfaceStyle,
  TextScale
} from '@shared/contracts'

export interface DisplaySettingsContextValue extends DisplaySettings {
  setReduceMotion: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setTextScale: (value: TextScale) => void
  setAccent: (value: Accent) => void
  setRadiusStyle: (value: RadiusStyle) => void
  setDensity: (value: Density) => void
  setSurfaceStyle: (value: SurfaceStyle) => void
  setFocusStyle: (value: FocusStyle) => void
}

export const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null)
