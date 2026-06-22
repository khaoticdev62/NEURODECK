import { z } from 'zod'

/** Real recovery checkpoints (mega-prompt §29). Every checkpoint declares its reversibility honestly rather than assuming "fully reversible." */
export const reversibilitySchema = z.enum([
  'fully-reversible',
  'partially-reversible',
  'manually-recoverable',
  'irreversible-external-effect'
])
export type Reversibility = z.infer<typeof reversibilitySchema>

export const recoveryCheckpointKindSchema = z.enum(['file-write'])
export type RecoveryCheckpointKind = z.infer<typeof recoveryCheckpointKindSchema>

export const recoveryCheckpointSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  kind: recoveryCheckpointKindSchema,
  relativePath: z.string(),
  description: z.string(),
  reversibility: reversibilitySchema,
  hadPreviousContent: z.boolean(),
  createdAt: z.number()
})
export type RecoveryCheckpoint = z.infer<typeof recoveryCheckpointSchema>

export const workspaceRecoveryRequestSchema = z.object({
  workspaceId: z.string().min(1)
})
export type WorkspaceRecoveryRequest = z.infer<typeof workspaceRecoveryRequestSchema>

export const recoveryCheckpointRequestSchema = z.object({
  workspaceId: z.string().min(1),
  checkpointId: z.string().min(1)
})
export type RecoveryCheckpointRequest = z.infer<typeof recoveryCheckpointRequestSchema>

export const recoveryDiffResultSchema = z.object({
  diff: z.string(),
  hadPreviousContent: z.boolean()
})
export type RecoveryDiffResult = z.infer<typeof recoveryDiffResultSchema>

export const recoveryStorageSummarySchema = z.object({
  checkpointCount: z.number(),
  totalBytes: z.number()
})
export type RecoveryStorageSummary = z.infer<typeof recoveryStorageSummarySchema>

export const writeFileRequestSchema = z.object({
  workspaceId: z.string().min(1),
  relativePath: z.string().min(1),
  content: z.string(),
  description: z.string().min(1)
})
export type WriteFileRequest = z.infer<typeof writeFileRequestSchema>
