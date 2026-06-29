import { createContext } from 'react'
import type { RecordingRecord, RecordingResolution } from '@shared/contracts'

export interface StartRecordingOptions {
  sourceId: string
  includesMicrophone: boolean
  resolution: RecordingResolution
  frameRate: number
}

export interface RecordingContextValue {
  isRecording: boolean
  elapsedMs: number
  error: string | null
  startRecording: (options: StartRecordingOptions) => Promise<void>
  stopRecording: () => Promise<RecordingRecord | undefined>
  cancelRecording: () => Promise<void>
}

export const RecordingContext = createContext<RecordingContextValue | null>(null)
