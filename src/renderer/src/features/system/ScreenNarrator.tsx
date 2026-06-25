import { useEffect } from 'react'
import { useToast } from '../../components/overlays/useToast'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'

function currentScreenText(): string {
  const main = document.querySelector('main')
  const heading = main?.querySelector('h1')?.textContent?.trim()
  const alert = main?.querySelector('[role="alert"]')?.textContent?.trim()
  const parts = [heading, alert].filter((part): part is string => !!part)
  return parts.length > 0 ? parts.join('. ') : document.title.trim() || 'No screen content found.'
}

/**
 * Real "Screen narration hooks" / "Read-current-screen command" (mega-prompt
 * §32), reachable via the real `narrate.screen` action (Menu+X / N key).
 * Uses the browser's real `SpeechSynthesis` API — built into Chromium, no
 * new dependency — to read whatever the live DOM's current `<main>` heading
 * and any active `role="alert"` text actually say, rather than maintaining
 * a separate per-screen narration script that could drift from what's
 * really on screen. A second trigger while speaking cancels and re-reads,
 * rather than queuing duplicate utterances.
 */
export function ScreenNarrator(): null {
  const { subscribe } = useFocusEngine()
  const { push } = useToast()

  useEffect(
    () =>
      subscribe('narrate.screen', () => {
        if (typeof window.speechSynthesis === 'undefined') {
          push({
            category: 'warning',
            title: 'Screen narration unavailable',
            description: 'This build has no speech synthesis engine.',
            durationMs: 4000
          })
          return
        }
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentScreenText()))
      }),
    [subscribe, push]
  )

  return null
}
