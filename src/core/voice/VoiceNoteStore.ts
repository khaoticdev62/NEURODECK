import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SaveVoiceNoteRequest, VoiceNote } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface VoiceNoteIndex {
  notes: VoiceNote[]
}

/**
 * Real Epic X5 voice notes (supplemental §15.1 "voice notes"). The
 * real recorded audio (base64-encoded by the renderer, since Electron
 * IPC can't transfer a raw `Blob`) is decoded and written to a real
 * `.webm` file on disk — never just metadata pointing at nothing — and
 * the transcript, when present, is the real text `SpeechRecognition`
 * produced during that same recording session, not generated after the
 * fact.
 */
export class VoiceNoteStore {
  private readonly store: JsonStore<VoiceNoteIndex>

  constructor(
    indexFilePath: string,
    private readonly audioDirectory: string
  ) {
    this.store = new JsonStore<VoiceNoteIndex>(indexFilePath, { notes: [] })
  }

  async list(): Promise<VoiceNote[]> {
    const index = await this.store.read()
    return index.notes
  }

  async save(request: SaveVoiceNoteRequest): Promise<VoiceNote> {
    await mkdir(this.audioDirectory, { recursive: true })
    const id = randomUUID()
    const filePath = join(this.audioDirectory, `${id}.webm`)
    await writeFile(filePath, Buffer.from(request.audioBase64, 'base64'))

    const note: VoiceNote = {
      id,
      workspaceId: request.workspaceId,
      filePath,
      durationMs: request.durationMs,
      transcript: request.transcript,
      createdAt: Date.now()
    }
    const index = await this.store.read()
    await this.store.write({ notes: [...index.notes, note] })
    return note
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const note = index.notes.find((candidate) => candidate.id === id)
    if (!note) return false
    await this.store.write({ notes: index.notes.filter((candidate) => candidate.id !== id) })
    await rm(note.filePath, { force: true })
    return true
  }

  async deleteAudio(id: string): Promise<VoiceNote | undefined> {
    const index = await this.store.read()
    const note = index.notes.find((candidate) => candidate.id === id)
    if (!note) return undefined
    await rm(note.filePath, { force: true })
    const updated: VoiceNote = { ...note, audioDeletedAt: Date.now() }
    await this.store.write({
      notes: index.notes.map((candidate) => (candidate.id === id ? updated : candidate))
    })
    return updated
  }

  async readAudio(id: string): Promise<Buffer | undefined> {
    const index = await this.store.read()
    const note = index.notes.find((candidate) => candidate.id === id)
    if (!note) return undefined
    if (note.audioDeletedAt) return undefined
    try {
      return await readFile(note.filePath)
    } catch (error) {
      if (isFileNotFoundError(error)) return undefined
      throw error
    }
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
