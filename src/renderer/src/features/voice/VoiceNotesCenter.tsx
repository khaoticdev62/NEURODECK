import { useEffect, useState } from 'react'
import type { VoiceNote } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  addVoiceNoteToKnowledge,
  deleteVoiceNoteAudio,
  listVoiceNotes,
  removeVoiceNote
} from '../../services/ipc/voiceClient'

/**
 * Epic X14 Voice Notes completion surface. Recording/storage already landed
 * in Epic X5; this screen closes the media-center requirements that were
 * still missing: add transcript to Knowledge Vault and delete audio after a
 * transcript exists.
 */
export function VoiceNotesCenter(): React.JSX.Element {
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [deleteNoteReview, setDeleteNoteReview] = useState<VoiceNote | null>(null)
  const [deleteAudioReview, setDeleteAudioReview] = useState<VoiceNote | null>(null)

  async function refresh(): Promise<void> {
    const result = await listVoiceNotes()
    if (result.ok) {
      setNotes(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void listVoiceNotes().then((result) => {
      if (!active) return
      if (result.ok) setNotes(result.data)
      else setError(result.error.userMessage)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleAddToKnowledge(
    note: VoiceNote,
    deleteAudioAfterIndex: boolean
  ): Promise<void> {
    setStatus(null)
    const result = await addVoiceNoteToKnowledge({
      id: note.id,
      privacyLevel: note.workspaceId ? 'workspace' : 'private',
      deleteAudioAfterIndex
    })
    if (result.ok) {
      setStatus(`Added transcript to Knowledge Vault as ${result.data.title}.`)
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleDeleteAudio(note: VoiceNote): Promise<void> {
    setDeleteAudioReview(null)
    const result = await deleteVoiceNoteAudio({ id: note.id })
    if (result.ok) {
      setStatus('Audio file deleted; transcript metadata remains.')
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleDeleteNote(note: VoiceNote): Promise<void> {
    setDeleteNoteReview(null)
    const result = await removeVoiceNote({ id: note.id })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  if (loading) return <p className="p-4 text-meta text-text-secondary">Loading voice notes...</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-title font-semibold text-text-primary">Voice Notes</p>
          <p className="text-meta text-text-tertiary">
            Manage recorded audio, transcripts, and Knowledge Vault handoff.
          </p>
        </div>
        <ControllerButton variant="secondary" onClick={() => void refresh()}>
          Refresh
        </ControllerButton>
      </div>

      {error && <ErrorState title="Voice notes error" description={error} />}
      {status && <p className="text-meta text-status-success">{status}</p>}

      {notes.length === 0 ? (
        <EmptyState
          title="No voice notes"
          description="Recorded notes will appear here after dictation or voice capture saves them."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {notes.map((note) => (
            <VoiceNoteCard
              key={note.id}
              note={note}
              onAddToKnowledge={(deleteAudioAfterIndex) =>
                void handleAddToKnowledge(note, deleteAudioAfterIndex)
              }
              onDeleteAudio={() => setDeleteAudioReview(note)}
              onDeleteNote={() => setDeleteNoteReview(note)}
            />
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(deleteAudioReview)}
        title="Delete audio file?"
        action="Remove the recorded audio file from disk."
        scope="This voice note only."
        consequence="The transcript metadata remains available for search and Knowledge Vault handoff."
        recovery="Re-record the note if the original audio is needed again."
        confirmLabel="Delete audio"
        onConfirm={() => deleteAudioReview && void handleDeleteAudio(deleteAudioReview)}
        onCancel={() => setDeleteAudioReview(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteNoteReview)}
        title="Delete voice note?"
        action="Remove the voice note metadata and audio file."
        scope="This voice note only."
        consequence="Knowledge Vault sources already created from the transcript are not removed."
        recovery="No automatic recovery is available from this screen."
        confirmLabel="Delete note"
        onConfirm={() => deleteNoteReview && void handleDeleteNote(deleteNoteReview)}
        onCancel={() => setDeleteNoteReview(null)}
      />
    </div>
  )
}

function VoiceNoteCard({
  note,
  onAddToKnowledge,
  onDeleteAudio,
  onDeleteNote
}: {
  note: VoiceNote
  onAddToKnowledge: (deleteAudioAfterIndex: boolean) => void
  onDeleteAudio: () => void
  onDeleteNote: () => void
}): React.JSX.Element {
  const [deleteAudioAfterIndex, setDeleteAudioAfterIndex] = useState(false)
  const hasTranscript = Boolean(note.transcript?.trim())
  const audioDeleted = Boolean(note.audioDeletedAt)

  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <div>
        <p className="text-body font-semibold text-text-primary">
          {new Date(note.createdAt).toLocaleString()}
        </p>
        <p className="text-caption text-text-tertiary">
          {formatDuration(note.durationMs)} - {audioDeleted ? 'audio deleted' : 'audio retained'}
        </p>
      </div>

      {hasTranscript ? (
        <p className="max-h-24 overflow-auto text-meta text-text-secondary">{note.transcript}</p>
      ) : (
        <p className="text-meta text-text-tertiary">No transcript captured for this note.</p>
      )}

      <label className="flex items-center gap-2 text-meta text-text-secondary">
        <input
          type="checkbox"
          checked={deleteAudioAfterIndex}
          disabled={!hasTranscript || audioDeleted}
          onChange={(event) => setDeleteAudioAfterIndex(event.currentTarget.checked)}
        />
        Delete audio after adding transcript
      </label>

      <div className="flex flex-wrap gap-2">
        <ControllerButton
          variant="primary"
          disabled={!hasTranscript}
          onClick={() => onAddToKnowledge(deleteAudioAfterIndex)}
        >
          Add to Knowledge Vault
        </ControllerButton>
        <ControllerButton
          variant="secondary"
          disabled={!hasTranscript || audioDeleted}
          onClick={onDeleteAudio}
        >
          Delete audio
        </ControllerButton>
        <ControllerButton variant="destructive" onClick={onDeleteNote}>
          Delete note
        </ControllerButton>
      </div>
    </section>
  )
}

function formatDuration(durationMs: number): string {
  const seconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}
