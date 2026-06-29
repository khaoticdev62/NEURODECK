import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, VoiceNote } from '@shared/contracts'
import { VoiceNotesCenter } from '../VoiceNotesCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleNote: VoiceNote = {
  id: 'note-1',
  workspaceId: 'workspace-1',
  filePath: '/tmp/note-1.webm',
  durationMs: 62_000,
  transcript: 'Recovery checkpoints protect edited files.',
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

describe('VoiceNotesCenter', () => {
  it('shows an empty state when no voice notes exist', async () => {
    stubBridge({
      voice: { listVoiceNotes: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    render(<VoiceNotesCenter />)

    expect(await screen.findByText('No voice notes')).toBeInTheDocument()
  })

  it('lists real note metadata and transcript text', async () => {
    stubBridge({
      voice: {
        listVoiceNotes: vi.fn().mockResolvedValue({ ok: true, data: [sampleNote] })
      } as never
    })

    render(<VoiceNotesCenter />)

    expect(await screen.findByText(sampleNote.transcript as string)).toBeInTheDocument()
    expect(screen.getByText(/1:02/)).toBeInTheDocument()
  })

  it('adds a transcript to the Knowledge Vault', async () => {
    const addVoiceNoteToKnowledge = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'source-1',
        type: 'markdown-note',
        title: 'Voice note transcript',
        origin: 'voice-note:note-1',
        privacyLevel: 'workspace',
        ingestionStatus: 'indexed',
        parserVersion: 'text-v1',
        contentHash: 'a'.repeat(64),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    })
    stubBridge({
      voice: {
        listVoiceNotes: vi.fn().mockResolvedValue({ ok: true, data: [sampleNote] }),
        addVoiceNoteToKnowledge
      } as never
    })
    const user = userEvent.setup()

    render(<VoiceNotesCenter />)
    await screen.findByText(sampleNote.transcript as string)

    await user.click(screen.getByRole('button', { name: 'Add to Knowledge Vault' }))

    expect(addVoiceNoteToKnowledge).toHaveBeenCalledWith({
      id: 'note-1',
      privacyLevel: 'workspace',
      deleteAudioAfterIndex: false
    })
    expect(await screen.findByText(/Added transcript to Knowledge Vault/)).toBeInTheDocument()
  })

  it('can request audio deletion after indexing', async () => {
    const addVoiceNoteToKnowledge = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'source-1',
        type: 'markdown-note',
        title: 'Voice note transcript',
        origin: 'voice-note:note-1',
        privacyLevel: 'workspace',
        ingestionStatus: 'indexed',
        parserVersion: 'text-v1',
        contentHash: 'a'.repeat(64),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    })
    stubBridge({
      voice: {
        listVoiceNotes: vi.fn().mockResolvedValue({ ok: true, data: [sampleNote] }),
        addVoiceNoteToKnowledge
      } as never
    })
    const user = userEvent.setup()

    render(<VoiceNotesCenter />)
    await screen.findByText(sampleNote.transcript as string)

    await user.click(screen.getByRole('checkbox', { name: 'Delete audio after adding transcript' }))
    await user.click(screen.getByRole('button', { name: 'Add to Knowledge Vault' }))

    expect(addVoiceNoteToKnowledge).toHaveBeenCalledWith({
      id: 'note-1',
      privacyLevel: 'workspace',
      deleteAudioAfterIndex: true
    })
  })

  it('deletes audio only after confirmation', async () => {
    const deleteVoiceNoteAudio = vi.fn().mockResolvedValue({
      ok: true,
      data: { ...sampleNote, audioDeletedAt: Date.now() }
    })
    stubBridge({
      voice: {
        listVoiceNotes: vi.fn().mockResolvedValue({ ok: true, data: [sampleNote] }),
        deleteVoiceNoteAudio
      } as never
    })
    const user = userEvent.setup()

    render(<VoiceNotesCenter />)
    await screen.findByText(sampleNote.transcript as string)

    await user.click(screen.getByRole('button', { name: 'Delete audio' }))
    expect(deleteVoiceNoteAudio).not.toHaveBeenCalled()

    const buttons = screen.getAllByRole('button', { name: 'Delete audio' })
    await user.click(buttons[buttons.length - 1])

    expect(deleteVoiceNoteAudio).toHaveBeenCalledWith({ id: 'note-1' })
  })
})
