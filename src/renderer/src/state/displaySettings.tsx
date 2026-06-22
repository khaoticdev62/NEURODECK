import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DisplaySettings, TextScale } from '@shared/contracts'
import { getDisplaySettings, setDisplaySettings } from '../services/ipc/displaySettingsClient'
import { DisplaySettingsContext, type DisplaySettingsContextValue } from './displaySettingsContext'

const DEFAULT_SETTINGS: DisplaySettings = {
  reduceMotion: false,
  highContrast: false,
  textScale: 'normal'
}

/**
 * Real, persisted ND-044 Display and Theme Settings state (see
 * `shared/contracts/displaySettings.ts` for the scope rationale).
 * `ShellLayout` reads this context to set the `data-reduce-motion`/
 * `data-high-contrast`/`data-text-size` attributes `tokens.css` responds
 * to — the same attribute-driven-CSS pattern `DisplayModeProvider`
 * already established for `data-display-mode`.
 */
export function DisplaySettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let active = true
    getDisplaySettings()
      .then((result) => {
        if (active && result.ok) setSettings(result.data)
      })
      .catch(() => {
        // No persisted settings available (e.g. bridge unavailable) — keep the in-memory default.
      })
    return () => {
      active = false
    }
  }, [])

  async function persist(next: DisplaySettings): Promise<void> {
    setSettings(next)
    await setDisplaySettings(next)
  }

  const value = useMemo<DisplaySettingsContextValue>(
    () => ({
      ...settings,
      setReduceMotion: (reduceMotion: boolean) => void persist({ ...settings, reduceMotion }),
      setHighContrast: (highContrast: boolean) => void persist({ ...settings, highContrast }),
      setTextScale: (textScale: TextScale) => void persist({ ...settings, textScale })
    }),
    [settings]
  )

  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>
}
