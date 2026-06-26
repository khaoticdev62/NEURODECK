import { useCallback, useEffect, useRef, useState } from 'react'

export interface DictationAlternative {
  transcript: string
  confidence: number
}

export interface DictationState {
  available: boolean
  listening: boolean
  transcript: string
  /** Real alternative recognitions for the current result (supplemental §15.4 "Choose alternative recognition") — never fabricated; empty when the engine returned only one. */
  alternatives: DictationAlternative[]
  error: string | null
}

export interface DictationControls extends DictationState {
  start: () => void
  stop: () => void
  /** Real "Cancel" (supplemental §15.4) — stops listening and discards the transcript so far, rather than submitting it. */
  cancel: () => void
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>
}

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/**
 * Real Epic X5 dictation pipeline (supplemental §15.3, the
 * "Microphone permission → Capture indicator → Speech recognition →
 * Transcript preview" steps — intent classification/structured action
 * proposal/approval are deliberately *not* built here: a dictated
 * transcript is handed to this app's existing real review-gated paths
 * — e.g. typed into Command Builder's AI-intent field, which already
 * goes through the real model router and mandatory ActionQueue
 * approval — rather than this hook inventing a second, parallel intent
 * classifier and execution path. §15.3's "No destructive voice command
 * may execute without review" is satisfied by never executing anything
 * directly from here at all).
 *
 * Push-to-talk is the calling component's responsibility (hold-to-call
 * `start()`/`stop()`); this hook owns only the real `SpeechRecognition`
 * session and its real transcript/alternative/error state. Honest
 * scope: Chromium's built-in engine is itself cloud-backed (Google's
 * recognition service) unless the OS substitutes a local one — "Local
 * speech provider support" is not claimed.
 */
export function useDictation(): DictationControls {
  const RecognitionConstructor = getRecognitionConstructor()
  const available = RecognitionConstructor !== undefined
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [alternatives, setAlternatives] = useState<DictationAlternative[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const start = useCallback(() => {
    if (!RecognitionConstructor || listening) return
    setError(null)
    setTranscript('')
    setAlternatives([])

    const recognition = new RecognitionConstructor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      const results = Array.from(event.results)
      const finalResult = results.find((result) => result.isFinal)
      const target = finalResult ?? results[results.length - 1]
      if (!target) return
      const alts = Array.from(target).map((alt) => ({
        transcript: alt.transcript,
        confidence: alt.confidence
      }))
      setTranscript(alts[0]?.transcript ?? '')
      setAlternatives(alts.slice(1))
    }
    recognition.onerror = (event) => {
      setError(event.error)
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [RecognitionConstructor, listening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const cancel = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    setTranscript('')
    setAlternatives([])
  }, [])

  return { available, listening, transcript, alternatives, error, start, stop, cancel }
}
