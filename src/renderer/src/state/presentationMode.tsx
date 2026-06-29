import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TextScale } from '@shared/contracts'
import { useToast } from '../components/overlays/useToast'
import {
  getPresentationMode,
  setPresentationMode as persistPresentationMode
} from '../services/ipc/presentationModeClient'
import {
  PresentationModeContext,
  type PresentationModeContextValue
} from './presentationModeContext'
import { useDisplaySettings } from './useDisplaySettings'

const SUPPRESSED_CATEGORIES = ['information', 'background-task-complete'] as const

/**
 * Real Epic X14 Presentation Mode (supplemental spec §46.1). Reuses
 * three already-real mechanisms instead of inventing new ones: the
 * existing `DisplaySettings.textScale` for "Use large text," the
 * existing `ToastContext` mute/unmute for "Suppress sensitive
 * notifications" (only the two genuinely low-priority categories —
 * `error`/`approval-required`/`warning` stay visible, matching spec
 * §43 "Critical security events remain visible"), and the main
 * process's real `powerSaveBlocker` for "Keep screen awake" (applied
 * server-side in `registerPresentationModeHandlers.ts`). "Hide
 * private workspace names," "Disable clipboard previews," and
 * "Docked layout" are not implemented — see the ledger for why.
 */
export function PresentationModeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { muteCategory, unmuteCategory } = useToast()
  const { textScale, setTextScale } = useDisplaySettings()
  const [enabled, setEnabled] = useState(false)
  const [keepScreenAwake, setKeepScreenAwake] = useState(true)
  const previousTextScaleRef = useRef<TextScale>('normal')

  const applyEffects = useCallback(
    (active: boolean) => {
      if (active) {
        previousTextScaleRef.current = textScale
        setTextScale('large')
        for (const category of SUPPRESSED_CATEGORIES) muteCategory(category)
      } else {
        setTextScale(previousTextScaleRef.current)
        for (const category of SUPPRESSED_CATEGORIES) unmuteCategory(category)
      }
    },
    [textScale, setTextScale, muteCategory, unmuteCategory]
  )

  useEffect(() => {
    let active = true
    getPresentationMode().then((result) => {
      if (!active || !result.ok) return
      setEnabled(result.data.enabled)
      setKeepScreenAwake(result.data.keepScreenAwake)
      if (result.data.enabled) applyEffects(true)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only
  }, [])

  const setPresentationMode = useCallback(
    (nextEnabled: boolean, nextKeepScreenAwake: boolean) => {
      if (nextEnabled !== enabled) applyEffects(nextEnabled)
      setEnabled(nextEnabled)
      setKeepScreenAwake(nextKeepScreenAwake)
      void persistPresentationMode({ enabled: nextEnabled, keepScreenAwake: nextKeepScreenAwake })
    },
    [enabled, applyEffects]
  )

  const value = useMemo<PresentationModeContextValue>(
    () => ({ enabled, keepScreenAwake, setPresentationMode }),
    [enabled, keepScreenAwake, setPresentationMode]
  )

  return (
    <PresentationModeContext.Provider value={value}>{children}</PresentationModeContext.Provider>
  )
}
