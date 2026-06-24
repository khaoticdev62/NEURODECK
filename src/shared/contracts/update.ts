import { z } from 'zod'

/**
 * Update status for ND-049. The full download/apply/rollback flow is deferred
 * until a signed release pipeline exists; this contract supports checking a
 * configured feed and reporting current component versions honestly.
 */

export const updateChannelSchema = z.enum(['stable', 'beta', 'nightly'])
export type UpdateChannel = z.infer<typeof updateChannelSchema>

export const updateStatusSchema = z.object({
  currentVersion: z.string(),
  latestVersion: z.string().nullable(),
  channel: updateChannelSchema,
  updateAvailable: z.boolean(),
  changelog: z.string().nullable(),
  compatibility: z.string().nullable(),
  checkEnabled: z.boolean(),
  reason: z.string().nullable()
})

export type UpdateStatus = z.infer<typeof updateStatusSchema>
