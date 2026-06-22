import { createContext } from 'react'

export type BaseDisplayMode = 'standard' | 'focus' | 'split' | 'theater'

export interface DisplayModeState {
  baseMode: BaseDisplayMode
  overlayOpen: boolean
}

export interface DisplayModeContextValue extends DisplayModeState {
  setBaseMode: (mode: BaseDisplayMode) => void
  openOverlay: () => void
  closeOverlay: () => void
}

export const DisplayModeContext = createContext<DisplayModeContextValue | null>(null)
