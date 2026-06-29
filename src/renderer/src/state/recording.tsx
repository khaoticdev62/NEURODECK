import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RecordingRecord } from '@shared/contracts'
import { RecordingIndicatorOverlay } from '../features/recording/RecordingIndicatorOverlay'
import {
  appendRecordingChunk,
  beginRecording,
  cancelRecording as cancelRecordingIpc,
  finishRecording
} from '../services/ipc/recordingClient'
import {
  RecordingContext,
  type RecordingContextValue,
  type StartRecordingOptions
} from './recordingContext'
import { blobToBase64, buildDesktopCaptureConstraints } from './recordingMedia'

const CHUNK_TIMESLICE_MS = 2000
/** A real, simple, low-collision-risk stop shortcut — matches the convention real screen recorders (e.g. OBS) already use for hotkeys. */
const STOP_SHORTCUT_KEY = 'F9'

/**
 * Real Epic X14 Recording (supplemental spec §42.2). Owns the real
 * `MediaStream`/`MediaRecorder` lifecycle — `chromeMediaSource:
 * 'desktop'` capture must run in the renderer (Electron's own
 * documented constraint; the main process can only enumerate sources
 * via `desktopCapturer`, never capture them). Each `MediaRecorder`
 * chunk is sent to the main process immediately as it's produced via
 * `RecordingService.appendChunk()`, never buffered whole in memory —
 * the same incremental-write principle `ScreenshotService`'s simpler
 * single-frame capture didn't need, but a multi-minute video does.
 */
export function RecordingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const recordingIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)

  const teardownStreams = useCallback(() => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) track.stop()
    }
    streamsRef.current = []
    recorderRef.current = null
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingRecord | undefined> => {
    const recorder = recorderRef.current
    const recordingId = recordingIdRef.current
    if (!recorder || !recordingId) return undefined

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
      recorder.stop()
    })
    teardownStreams()
    setIsRecording(false)
    recordingIdRef.current = null

    const result = await finishRecording({ recordingId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return undefined
    }
    return result.data
  }, [teardownStreams])

  const cancelRecording = useCallback(async (): Promise<void> => {
    const recorder = recorderRef.current
    const recordingId = recordingIdRef.current
    if (!recorder || !recordingId) return
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
      recorder.stop()
    })
    teardownStreams()
    setIsRecording(false)
    recordingIdRef.current = null
    await cancelRecordingIpc({ recordingId })
  }, [teardownStreams])

  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 500)
    return () => clearInterval(interval)
  }, [isRecording])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === STOP_SHORTCUT_KEY && recorderRef.current) {
        event.preventDefault()
        void stopRecording()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stopRecording])

  const startRecording = useCallback(async (options: StartRecordingOptions): Promise<void> => {
    setError(null)
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia(
        buildDesktopCaptureConstraints(options.sourceId, options.resolution, options.frameRate)
      )
      const streams = [videoStream]
      let combinedStream = videoStream
      if (options.includesMicrophone) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streams.push(micStream)
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...micStream.getAudioTracks()
        ])
      }
      streamsRef.current = streams

      const beginResult = await beginRecording({
        sourceId: options.sourceId,
        includesMicrophone: options.includesMicrophone,
        resolution: options.resolution,
        frameRate: options.frameRate
      })
      if (!beginResult.ok) {
        for (const stream of streams) for (const track of stream.getTracks()) track.stop()
        setError(beginResult.error.userMessage)
        return
      }
      const recordingId = beginResult.data.recordingId
      recordingIdRef.current = recordingId

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp8,opus' })
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size === 0) return
        void blobToBase64(event.data).then((chunkBase64) => {
          void appendRecordingChunk({ recordingId, chunkBase64 })
        })
      })
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      recorder.start(CHUNK_TIMESLICE_MS)
      setIsRecording(true)
    } catch (mediaError) {
      setError(
        mediaError instanceof Error ? mediaError.message : 'Failed to start screen recording.'
      )
    }
  }, [])

  const value = useMemo<RecordingContextValue>(
    () => ({ isRecording, elapsedMs, error, startRecording, stopRecording, cancelRecording }),
    [isRecording, elapsedMs, error, startRecording, stopRecording, cancelRecording]
  )

  return (
    <RecordingContext.Provider value={value}>
      {children}
      <RecordingIndicatorOverlay />
    </RecordingContext.Provider>
  )
}
