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

export const backupRestoreResultSchema = z.object({
  restoredBackupId: z.string().uuid(),
  restoredFileCount: z.number().int().nonnegative(),
  removedFileCount: z.number().int().nonnegative(),
  rollbackBackupId: z.string().uuid(),
  rollbackBackupPath: z.string()
})
export type BackupRestoreResult = z.infer<typeof backupRestoreResultSchema>

export const backupMigrationStatusSchema = z.enum(['current', 'migrated', 'invalid', 'blocked'])
export type BackupMigrationStatus = z.infer<typeof backupMigrationStatusSchema>

export const backupMigrationRecordSchema = z.object({
  path: z.string(),
  backupId: z.string().optional(),
  fromSchemaVersion: z.string().optional(),
  toSchemaVersion: z.literal('1.0.0').optional(),
  status: backupMigrationStatusSchema,
  message: z.string(),
  migratedAt: z.number().int().nonnegative().optional()
})
export type BackupMigrationRecord = z.infer<typeof backupMigrationRecordSchema>

export const backupMigrationReportSchema = z.object({
  checkedAt: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  current: z.number().int().nonnegative(),
  migrated: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  records: z.array(backupMigrationRecordSchema)
})
export type BackupMigrationReport = z.infer<typeof backupMigrationReportSchema>
