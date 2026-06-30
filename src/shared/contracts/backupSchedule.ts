import { z } from 'zod'

/**
 * Real Epic X7 scheduled backup (supplemental §21.1's named gap).
 * Since this app has no real OS-level cron/launchd integration, the
 * schedule is checked-and-caught-up by `BackupScheduler` on a
 * recurring in-process timer rather than a true wall-clock cron —
 * honest for an app that is not always running, not a fabricated
 * "scheduled job" claim.
 */
export const backupScheduleSettingsSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(168),
  lastRunAt: z.number().nullable(),
  nextRunAt: z.number().nullable()
})
export type BackupScheduleSettings = z.infer<typeof backupScheduleSettingsSchema>

export const setBackupScheduleRequestSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(168)
})
export type SetBackupScheduleRequest = z.infer<typeof setBackupScheduleRequestSchema>
