import { useContext } from 'react'
import { RecordingContext, type RecordingContextValue } from './recordingContext'

export function useRecording(): RecordingContextValue {
  const context = useContext(RecordingContext)
  if (!context) throw new Error('useRecording must be used within a RecordingProvider')
  return context
}
