import { z } from 'zod'

/**
 * Epic X14 Recording (supplemental spec §42.2), scoped to real screen
 * recording with optional real microphone inclusion. System-audio
 * capture is deliberately not offered — Chromium/Electron's loopback
 * support for system audio is OS-dependent and unreliable on Linux
 * without assuming a specific PulseAudio/PipeWire monitor-source setup
 * this app cannot assume exists. "Activity task" integration is also
 * not offered — no real Activity Center backing model exists yet to
 * register a task against (confirmed during the Privacy and Data Map
 * pass: today's "Audit logs" are renderer-in-memory only).
 */
export const recordingSourceTypeSchema = z.enum(['screen', 'window'])
export type RecordingSourceType = z.infer<typeof recordingSourceTypeSchema>

export const recordingSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: recordingSourceTypeSchema,
  /** Real `NativeImage.toDataURL()` thumbnail — never a placeholder image. */
  thumbnailDataUrl: z.string()
})
export type RecordingSource = z.infer<typeof recordingSourceSchema>

export const listRecordingSourcesResultSchema = z.array(recordingSourceSchema)

export const recordingResolutionSchema = z.enum(['720p', '1080p', 'native'])
export type RecordingResolution = z.infer<typeof recordingResolutionSchema>

export const beginRecordingRequestSchema = z.object({
  sourceId: z.string().min(1),
  includesMicrophone: z.boolean(),
  resolution: recordingResolutionSchema,
  frameRate: z.number().int().min(1).max(60)
})
export type BeginRecordingRequest = z.infer<typeof beginRecordingRequestSchema>

export const beginRecordingResultSchema = z.object({ recordingId: z.string() })
export type BeginRecordingResult = z.infer<typeof beginRecordingResultSchema>

export const appendRecordingChunkRequestSchema = z.object({
  recordingId: z.string().min(1),
  /** Base64-encoded `MediaRecorder` `dataavailable` chunk — appended directly to the open file, never buffered whole in memory. */
  chunkBase64: z.string().min(1)
})
export type AppendRecordingChunkRequest = z.infer<typeof appendRecordingChunkRequestSchema>

export const recordingIdRequestSchema = z.object({ recordingId: z.string().min(1) })
export type RecordingIdRequest = z.infer<typeof recordingIdRequestSchema>

export const recordingRecordSchema = z.object({
  id: z.string(),
  path: z.string(),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  bytes: z.number(),
  includesMicrophone: z.boolean(),
  resolution: recordingResolutionSchema,
  frameRate: z.number()
})
export type RecordingRecord = z.infer<typeof recordingRecordSchema>
