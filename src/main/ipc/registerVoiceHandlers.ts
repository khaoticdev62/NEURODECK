import { ipcMain } from 'electron'
import {
  addVoiceNoteToKnowledgeRequestSchema,
  documentIntakeRequestSchema,
  IPC_CHANNELS,
  ndxError,
  saveVoiceNoteRequestSchema,
  setMicrophonePermissionRequestSchema,
  voiceNoteIdRequestSchema,
  type DocumentIntakeResult,
  type KnowledgeSource,
  type MicrophonePermissionStatus,
  type NdxResult,
  type VoiceNote
} from '@shared/contracts'
import { intakeDocument } from '../../core/voice/DocumentIntakeService'
import type { KnowledgeVaultService } from '../../core/knowledge/KnowledgeVaultService'
import type { MicrophonePermissionStore } from '../../core/voice/MicrophonePermissionStore'
import type { VoiceNoteStore } from '../../core/voice/VoiceNoteStore'

/** Real Epic X5 voice/speech IPC (supplemental spec §15/§16.4). */
export function registerVoiceHandlers(
  micStore: MicrophonePermissionStore,
  voiceNoteStore: VoiceNoteStore,
  knowledgeVaultService: KnowledgeVaultService
): void {
  ipcMain.handle(
    IPC_CHANNELS.microphoneGetStatus,
    async (): Promise<NdxResult<MicrophonePermissionStatus>> => {
      return { ok: true, data: await micStore.getStatus() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.microphoneSetGranted,
    async (_event, payload: unknown): Promise<NdxResult<MicrophonePermissionStatus>> => {
      const parsed = setMicrophonePermissionRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      await micStore.setGranted(parsed.data.granted)
      return { ok: true, data: await micStore.getStatus() }
    }
  )

  ipcMain.handle(IPC_CHANNELS.voiceNoteList, async (): Promise<NdxResult<VoiceNote[]>> => {
    return { ok: true, data: await voiceNoteStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.voiceNoteSave,
    async (_event, payload: unknown): Promise<NdxResult<VoiceNote>> => {
      const parsed = saveVoiceNoteRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That voice note is invalid.')
        }
      }
      return { ok: true, data: await voiceNoteStore.save(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.voiceNoteRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = voiceNoteIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That voice note id is invalid.')
        }
      }
      await voiceNoteStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.voiceNoteDeleteAudio,
    async (_event, payload: unknown): Promise<NdxResult<VoiceNote>> => {
      const parsed = voiceNoteIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That voice note id is invalid.')
        }
      }
      const updated = await voiceNoteStore.deleteAudio(parsed.data.id)
      if (!updated) {
        return {
          ok: false,
          error: ndxError('not-found', 'voice-note-not-found', 'That voice note no longer exists.')
        }
      }
      return { ok: true, data: updated }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.voiceNoteAddToKnowledge,
    async (_event, payload: unknown): Promise<NdxResult<KnowledgeSource>> => {
      const parsed = addVoiceNoteToKnowledgeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That voice note request is invalid.')
        }
      }
      const note = (await voiceNoteStore.list()).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!note) {
        return {
          ok: false,
          error: ndxError('not-found', 'voice-note-not-found', 'That voice note no longer exists.')
        }
      }
      if (!note.transcript?.trim()) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'voice-note-has-no-transcript',
            'That voice note has no transcript to add to the Knowledge Vault.'
          )
        }
      }
      const source = await knowledgeVaultService.addMarkdownNote({
        title: `Voice note ${new Date(note.createdAt).toLocaleString()}`,
        text: note.transcript,
        origin: `voice-note:${note.id}`,
        workspaceId: note.workspaceId,
        privacyLevel: parsed.data.privacyLevel
      })
      if (parsed.data.deleteAudioAfterIndex && source.ingestionStatus === 'indexed') {
        await voiceNoteStore.deleteAudio(note.id)
      }
      return { ok: true, data: source }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.documentIntake,
    async (_event, payload: unknown): Promise<NdxResult<DocumentIntakeResult>> => {
      const parsed = documentIntakeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      try {
        return { ok: true, data: await intakeDocument(parsed.data.path) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'document-intake-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )
}
