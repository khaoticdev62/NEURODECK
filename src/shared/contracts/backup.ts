import { z } from 'zod'

export const backupScopeSchema = z.literal('app-state')
export type BackupScope = z.infer<typeof backupScopeSchema>

export const createBackupRequestSchema = z.object({
  label: z.string().trim().min(1).max(80).optional()
})
export type CreateBackupRequest = z.infer<typeof createBackupRequestSchema>

export const backupIdRequestSchema = z.object({
  id: z.string().uuid()
})
export type BackupIdRequest = z.infer<typeof backupIdRequestSchema>

export const backupRecordSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal('1.0.0'),
  createdAt: z.number().int().nonnegative(),
  label: z.string().optional(),
  scope: backupScopeSchema,
  path: z.string(),
  fileCount: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  verified: z.boolean(),
  excludedSecretPaths: z.array(z.string())
})
export type BackupRecord = z.infer<typeof backupRecordSchema>

export const backupVerificationSchema = z.object({
  id: z.string().uuid(),
  checkedAt: z.number().int().nonnegative(),
  ok: z.boolean(),
  record: backupRecordSchema.optional(),
  failures: z.array(z.string())
})
export type BackupVerification = z.infer<typeof backupVerificationSchema>
