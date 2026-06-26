import { useCallback, useMemo } from 'react'

export interface TextToSpeechControls {
  available: boolean
  speak: (text: string) => void
  cancel: () => void
}

/**
 * Real, general-purpose Epic X5 text-to-speech (supplemental §15.1) —
 * the browser's real `SpeechSynthesis` API, the same engine
 * `ScreenNarrator.tsx` already proved works for screen narration
 * specifically. This hook generalizes it for any consumer that wants
 * to read arbitrary text aloud (e.g. an AI response), rather than
 * duplicating the speak/cancel logic a second time.
 */
export function useTextToSpeech(): TextToSpeechControls {
  const available = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const speak = useCallback(
    (text: string) => {
      if (!available || !text.trim()) return
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
    },
    [available]
  )

  const cancel = useCallback(() => {
    if (available) window.speechSynthesis.cancel()
  }, [available])

  return useMemo(() => ({ available, speak, cancel }), [available, speak, cancel])
}
