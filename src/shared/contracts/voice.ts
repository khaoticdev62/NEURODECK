import { z } from 'zod'

/**
 * Epic X5 Voice Assistant and Speech Services (supplemental spec §15).
 * Speech-to-text and text-to-speech run on the real browser Web Speech
 * API (Chromium, already proven real and working by `ScreenNarrator`'s
 * existing `SpeechSynthesis` use) — no new dependency, but an honest
 * one: `SpeechRecognition` in Chromium is itself cloud-backed (Google's
 * recognition service) unless the OS provides an on-device engine, so
 * "Local speech provider support" is not claimed here. Wake word
 * (§15.2) is explicitly deferred — it needs a continuously-running
 * local audio-classification engine, and no such dependency exists in
 * this codebase; faking "off by default, processed locally" wake-word
 * detection would be a fabricated capability.
 */
export const microphonePermissionStatusSchema = z.enum(['granted', 'denied', 'not-determined'])
export type MicrophonePermissionStatus = z.infer<typeof microphonePermissionStatusSchema>

export const setMicrophonePermissionRequestSchema = z.object({ granted: z.boolean() })
export type SetMicrophonePermissionRequest = z.infer<typeof setMicrophonePermissionRequestSchema>

export const voiceNoteSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().optional(),
  /** Real absolute path on disk to the recorded real audio file (webm/opus). */
  filePath: z.string().min(1),
  audioDeletedAt: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative(),
  /** Real transcript from the same `SpeechRecognition` session that was active during recording, when the user had dictation running — never a fabricated transcript for an untranscribed note. */
  transcript: z.string().optional(),
  createdAt: z.number().int().nonnegative()
})
export type VoiceNote = z.infer<typeof voiceNoteSchema>

export const saveVoiceNoteRequestSchema = z.object({
  /** Base64-encoded real recorded audio bytes — Electron IPC can't transfer a raw `Blob`, so the renderer encodes it before sending. */
  audioBase64: z.string().min(1),
  workspaceId: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
  transcript: z.string().optional()
})
export type SaveVoiceNoteRequest = z.infer<typeof saveVoiceNoteRequestSchema>

export const voiceNoteIdRequestSchema = z.object({ id: z.string().min(1) })
export type VoiceNoteIdRequest = z.infer<typeof voiceNoteIdRequestSchema>

export const addVoiceNoteToKnowledgeRequestSchema = z.object({
  id: z.string().min(1),
  privacyLevel: z.enum(['private', 'workspace', 'profile', 'shareable']).default('workspace'),
  deleteAudioAfterIndex: z.boolean().default(false)
})
export type AddVoiceNoteToKnowledgeRequest = z.infer<typeof addVoiceNoteToKnowledgeRequestSchema>

/**
 * Real Epic X5/X16 document intake (supplemental §16.4) — one-off
 * extraction for immediate conversational context, distinct from Epic
 * X4's persistent Knowledge Vault ingestion. Reuses the exact same real
 * parsers (`core/knowledge/parsers/textParsers.ts`) and the exact same
 * real `detectSecret()` redaction pass Scoped Memory uses — "extraction
 * confidence must be represented honestly" (§16.4) means this never
 * claims a confidence score it didn't actually compute; `redacted`
 * simply reports whether a real secret-shaped pattern was found and
 * stripped before the text was returned.
 */
export const documentIntakeRequestSchema = z.object({
  /** Real, already-resolved absolute path from a native file picker. */
  path: z.string().min(1)
})
export type DocumentIntakeRequest = z.infer<typeof documentIntakeRequestSchema>

export const documentIntakeResultSchema = z.object({
  path: z.string().min(1),
  text: z.string(),
  redacted: z.boolean(),
  redactionLabel: z.string().optional()
})
export type DocumentIntakeResult = z.infer<typeof documentIntakeResultSchema>
