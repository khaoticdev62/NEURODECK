import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SaveVoiceNoteRequest } from '@shared/contracts'
import { VoiceNoteStore } from '../VoiceNoteStore'

let dir: string
let store: VoiceNoteStore

const sample: SaveVoiceNoteRequest = {
  audioBase64: Buffer.from('fake real audio bytes').toString('base64'),
  durationMs: 4200,
  transcript: 'This is a test note.'
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-voice-notes-'))
  store = new VoiceNoteStore(join(dir, 'voice-notes.json'), join(dir, 'audio'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('VoiceNoteStore', () => {
  it('starts with no notes', async () => {
    expect(await store.list()).toEqual([])
  })

  it('save() writes a real decoded audio file and persists real metadata', async () => {
    const note = await store.save(sample)

    expect(note.transcript).toBe(sample.transcript)
    expect(note.durationMs).toBe(4200)
    expect(await store.list()).toEqual([note])

    const audio = await store.readAudio(note.id)
    expect(audio?.toString('utf-8')).toBe('fake real audio bytes')
  })

  it('remove() deletes both the metadata and the real audio file', async () => {
    const note = await store.save(sample)

    expect(await store.remove(note.id)).toBe(true)
    expect(await store.list()).toEqual([])
    expect(await store.readAudio(note.id)).toBeUndefined()
  })

  it('remove() returns false for an unknown id', async () => {
    expect(await store.remove('missing')).toBe(false)
  })

  it('deleteAudio() removes only the audio file and keeps transcript metadata', async () => {
    const note = await store.save(sample)

    const updated = await store.deleteAudio(note.id)

    expect(updated?.audioDeletedAt).toBeGreaterThan(0)
    expect(updated?.transcript).toBe(sample.transcript)
    expect(await store.readAudio(note.id)).toBeUndefined()
    expect(await store.list()).toEqual([updated])
  })

  it('saves a note without a transcript when none was captured', async () => {
    const note = await store.save({ audioBase64: sample.audioBase64, durationMs: 1000 })
    expect(note.transcript).toBeUndefined()
  })
})
