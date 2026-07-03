import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecordingRecord, RecordingResolution, RecordingSource } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  deleteRecording,
  listRecordingSources,
  listRecordings
} from '../../services/ipc/recordingClient'
import { estimatedBytesPerSecond } from '../../state/recordingMedia'
import { usePresentationMode } from '../../state/usePresentationMode'
import { useRecording } from '../../state/useRecording'

const RESOLUTIONS: RecordingResolution[] = ['720p', '1080p', 'native']
const FRAME_RATES = [15, 30, 60]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Epic X14 Recording Center (supplemental spec §42.2). See
 * `RecordingService`/`RecordingProvider`'s doc comments for why
 * system-audio capture and Activity-task integration are deliberately
 * not offered. "Privacy exclusion" reuses the already-real
 * Presentation Mode toggle rather than inventing a second redaction
 * system; "Storage estimate" is a real, clearly-labeled estimate
 * before/during recording, replaced by the real measured byte count
 * once a recording actually finishes.
 */
export function RecordingCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const {
    isRecording,
    elapsedMs,
    error: recordingError,
    startRecording,
    stopRecording,
    cancelRecording
  } = useRecording()
  const { enabled: presentationModeEnabled, setPresentationMode } = usePresentationMode()

  const [sources, setSources] = useState<RecordingSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [resolution, setResolution] = useState<RecordingResolution>('1080p')
  const [frameRate, setFrameRate] = useState(30)
  const [includeMicrophone, setIncludeMicrophone] = useState(false)
  const [excludePrivacyWhileRecording, setExcludePrivacyWhileRecording] = useState(true)
  const [wasPresentationModeEnabled, setWasPresentationModeEnabled] = useState(false)
  const [recordings, setRecordings] = useState<RecordingRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deleteReview, setDeleteReview] = useState<RecordingRecord | null>(null)
  const [lastResult, setLastResult] = useState<RecordingRecord | null>(null)

  async function refreshRecordings(): Promise<void> {
    const result = await listRecordings()
    if (result.ok) setRecordings(result.data)
  }

  useEffect(() => {
    let active = true
    void Promise.all([listRecordingSources(), listRecordings()]).then(
      ([sourcesResult, recordingsResult]) => {
        if (!active) return
        if (sourcesResult.ok) setSources(sourcesResult.data)
        else setError(sourcesResult.error.userMessage)
        if (recordingsResult.ok) setRecordings(recordingsResult.data)
      }
    )
    return () => {
      active = false
    }
  }, [])

  async function handleStart(): Promise<void> {
    if (!selectedSourceId) return
    setError(null)
    setLastResult(null)
    if (excludePrivacyWhileRecording && !presentationModeEnabled) {
      setWasPresentationModeEnabled(false)
      setPresentationMode(true, true)
    } else {
      setWasPresentationModeEnabled(presentationModeEnabled)
    }
    await startRecording({
      sourceId: selectedSourceId,
      includesMicrophone: includeMicrophone,
      resolution,
      frameRate
    })
  }

  async function handleStop(): Promise<void> {
    const record = await stopRecording()
    if (excludePrivacyWhileRecording && !wasPresentationModeEnabled) {
      setPresentationMode(false, true)
    }
    if (record) setLastResult(record)
    await refreshRecordings()
  }

  async function handleCancel(): Promise<void> {
    await cancelRecording()
    if (excludePrivacyWhileRecording && !wasPresentationModeEnabled) {
      setPresentationMode(false, true)
    }
  }

  async function handleDelete(record: RecordingRecord): Promise<void> {
    setDeleteReview(null)
    const result = await deleteRecording({ recordingId: record.id })
    if (result.ok) await refreshRecordings()
    else setError(result.error.userMessage)
  }

  function handleShare(record: RecordingRecord): void {
    navigate('/lan-share/send', { state: { sourcePaths: [record.path] } })
  }

  const estimatedBytesPerMinute = estimatedBytesPerSecond(resolution) * 60

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Recording Center</p>

      {(error || recordingError) && (
        <ErrorState title="Recording error" description={error ?? recordingError ?? ''} />
      )}
      {lastResult && (
        <p className="text-meta text-status-success">
          Saved {formatBytes(lastResult.bytes)} to {lastResult.path}.
        </p>
      )}

      {!isRecording ? (
        <section className="flex flex-col gap-3 ndx-settings-section">
          <p className="text-meta font-semibold text-text-primary">Choose a source</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <ControllerButton
                key={source.id}
                variant={selectedSourceId === source.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedSourceId(source.id)}
              >
                {source.name}
              </ControllerButton>
            ))}
          </div>

          <p className="text-meta font-semibold text-text-primary">Resolution</p>
          <div className="flex gap-2">
            {RESOLUTIONS.map((option) => (
              <ControllerButton
                key={option}
                variant={resolution === option ? 'primary' : 'secondary'}
                onClick={() => setResolution(option)}
              >
                {option}
              </ControllerButton>
            ))}
          </div>

          <p className="text-meta font-semibold text-text-primary">Frame rate</p>
          <div className="flex gap-2">
            {FRAME_RATES.map((option) => (
              <ControllerButton
                key={option}
                variant={frameRate === option ? 'primary' : 'secondary'}
                onClick={() => setFrameRate(option)}
              >
                {option} fps
              </ControllerButton>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-meta text-text-secondary">Include microphone</p>
            <ControllerButton
              variant={includeMicrophone ? 'primary' : 'secondary'}
              onClick={() => setIncludeMicrophone((current) => !current)}
            >
              {includeMicrophone ? 'On' : 'Off'}
            </ControllerButton>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-meta text-text-secondary">Hide secrets while recording</p>
            <ControllerButton
              variant={excludePrivacyWhileRecording ? 'primary' : 'secondary'}
              onClick={() => setExcludePrivacyWhileRecording((current) => !current)}
            >
              {excludePrivacyWhileRecording ? 'On' : 'Off'}
            </ControllerButton>
          </div>

          <p className="text-caption text-text-tertiary">
            Estimated size: ~{formatBytes(estimatedBytesPerMinute)} per minute (real measured size
            is shown after the recording finishes).
          </p>

          <ControllerButton
            variant="primary"
            disabled={!selectedSourceId}
            onClick={() => void handleStart()}
          >
            Start recording
          </ControllerButton>
        </section>
      ) : (
        <section className="flex flex-col gap-2 ndx-settings-section">
          <p className="text-meta font-semibold text-text-primary">
            Recording… {Math.floor(elapsedMs / 1000)}s elapsed (press F9 to stop)
          </p>
          <div className="flex gap-2">
            <ControllerButton variant="destructive" onClick={() => void handleStop()}>
              Stop
            </ControllerButton>
            <ControllerButton variant="ghost" onClick={() => void handleCancel()}>
              Cancel and discard
            </ControllerButton>
          </div>
        </section>
      )}

      <section className="grid gap-3">
        {recordings.length === 0 ? (
          <EmptyState title="No recordings yet" description="Start a recording to see it here." />
        ) : (
          recordings.map((record) => (
            <article key={record.id} className="ndx-settings-section">
              <p className="text-meta font-semibold text-text-primary">
                {new Date(record.startedAt).toLocaleString()}
              </p>
              <p className="text-caption text-text-tertiary">
                {formatBytes(record.bytes)} · {record.resolution} · {record.frameRate}fps
                {record.includesMicrophone ? ' · with microphone' : ''}
              </p>
              <p className="mt-1 break-all text-caption text-text-tertiary">{record.path}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ControllerButton onClick={() => handleShare(record)}>
                  Share via LAN Share
                </ControllerButton>
                <ControllerButton variant="destructive" onClick={() => setDeleteReview(record)}>
                  Delete
                </ControllerButton>
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmationDialog
        open={deleteReview !== null}
        title="Delete recording"
        action="Delete this recording"
        scope={deleteReview?.path}
        consequence="This permanently removes the recording file from disk."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteReview) void handleDelete(deleteReview)
        }}
        onCancel={() => setDeleteReview(null)}
      />
    </div>
  )
}
