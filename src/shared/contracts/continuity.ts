import { z } from 'zod'

export const continuityQueueEntrySchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['queued', 'blocked-offline', 'retrying', 'failed']),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  lastError: z.string().optional()
})
export type ContinuityQueueEntry = z.infer<typeof continuityQueueEntrySchema>

export const continuityPowerEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['suspend', 'resume', 'shutdown', 'lock-screen']),
  occurredAt: z.number().int().nonnegative()
})
export type ContinuityPowerEvent = z.infer<typeof continuityPowerEventSchema>

export const continuitySessionSnapshotSchema = z.object({
  route: z.string().min(1),
  capturedAt: z.number().int().nonnegative()
})
export type ContinuitySessionSnapshot = z.infer<typeof continuitySessionSnapshotSchema>

export const continuityStateSchema = z.object({
  safeModeActive: z.boolean(),
  offlineQueue: z.array(continuityQueueEntrySchema),
  powerEvents: z.array(continuityPowerEventSchema),
  sessionSnapshot: continuitySessionSnapshotSchema.nullable()
})
export type ContinuityState = z.infer<typeof continuityStateSchema>

export const setSafeModeRequestSchema = z.object({ active: z.boolean() })
export type SetSafeModeRequest = z.infer<typeof setSafeModeRequestSchema>

export const recordPowerEventRequestSchema = continuityPowerEventSchema.pick({ kind: true })
export type RecordPowerEventRequest = z.infer<typeof recordPowerEventRequestSchema>

export const saveSessionSnapshotRequestSchema = continuitySessionSnapshotSchema.pick({
  route: true
})
export type SaveSessionSnapshotRequest = z.infer<typeof saveSessionSnapshotRequestSchema>
