import { useMemo, useState, type ReactNode } from 'react'
import {
  DisplayModeContext,
  type BaseDisplayMode,
  type DisplayModeContextValue
} from './displayModeContext'

/**
 * Shell display mode state (wireframe §3.3). Overlay is modeled separately
 * from the four base modes because it layers on top "without destroying
 * underlying state" rather than replacing the current layout.
 */
export function DisplayModeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [baseMode, setBaseMode] = useState<BaseDisplayMode>('standard')
  const [overlayOpen, setOverlayOpen] = useState(false)

  const value = useMemo<DisplayModeContextValue>(
    () => ({
      baseMode,
      overlayOpen,
      setBaseMode,
      openOverlay: () => setOverlayOpen(true),
      closeOverlay: () => setOverlayOpen(false)
    }),
    [baseMode, overlayOpen]
  )

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>
}
