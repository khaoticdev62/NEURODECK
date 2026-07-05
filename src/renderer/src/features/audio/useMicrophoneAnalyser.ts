import { useCallback, useEffect, useRef, useState } from 'react'

export interface MicrophoneAnalyserControls {
  active: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
  /** Real frequency-domain data from the live `AnalyserNode` — `null` until `start()` succeeds. */
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null
}

const FFT_SIZE = 2048

/**
 * Real microphone capture + frequency-domain analysis. `getUserMedia` and
 * `AudioContext`/`AnalyserNode` are browser APIs that only exist in the
 * renderer (matching the existing precedent in `state/recording.tsx`, which
 * already calls `getUserMedia({ audio: true })` for mic-inclusive screen
 * recording) — no main-process capability is needed here. The real
 * `MicrophonePermissionStore` gate (consulted by
 * `session.setPermissionRequestHandler` in the main process) is what
 * actually allows or denies the underlying `getUserMedia` call; this hook
 * doesn't duplicate that check, it just surfaces whatever real error comes
 * back if permission was never granted.
 */
export function useMicrophoneAnalyser(): MicrophoneAnalyserControls {
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  const stop = useCallback((): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const audioContext = audioContextRef.current
    audioContextRef.current = null
    analyserRef.current = null
    dataRef.current = null
    setActive(false)
    if (audioContext && audioContext.state !== 'closed') void audioContext.close()
  }, [])

  const start = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      source.connect(analyser)
      analyserRef.current = analyser
      dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      setActive(true)
    } catch (mediaError) {
      setError(
        mediaError instanceof Error ? mediaError.message : 'Could not access the microphone.'
      )
      stop()
    }
  }, [stop])

  const getFrequencyData = useCallback((): Uint8Array<ArrayBuffer> | null => {
    const analyser = analyserRef.current
    const data = dataRef.current
    if (!analyser || !data) return null
    analyser.getByteFrequencyData(data)
    return data
  }, [])

  // Real teardown on unmount — never leave a live mic stream/AudioContext
  // running behind a screen the user has navigated away from.
  useEffect(() => stop, [stop])

  return { active, error, start, stop, getFrequencyData }
}
