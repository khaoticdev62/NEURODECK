import { z } from 'zod'

/**
 * Epic X6 Download and Transfer Center (supplemental §18). This is the
 * real shared `TransferJob` primitive the spec's own §18 calls for —
 * built and tested standalone, the same way Epic X1's
 * `TransactionManager` was. Honest scope: this pass's one real
 * consumer is LAN peer transfer (§19); model downloads
 * (`ModelProviderService`), package transactions (Epic X2's
 * `TransactionManager`/`PackageLifecycleService`), and update checks
 * (`UpdateService`) already have their own real tracking elsewhere —
 * consolidating every download type under this one system is a
 * separate, not-yet-done integration, not fabricated coverage claimed
 * here.
 */
export const transferKindSchema = z.enum([
  'browser-download',
  'model-download',
  'package-download',
  'extension-download',
  'update-download',
  'knowledge-import',
  'lan-transfer',
  'remote-file-transfer',
  'export-generation'
])
export type TransferKind = z.infer<typeof transferKindSchema>

export const transferEndpointSchema = z.object({
  label: z.string().min(1),
  /** Real path/URL/peer-id this endpoint actually refers to — never a placeholder string. */
  reference: z.string().min(1)
})
export type TransferEndpoint = z.infer<typeof transferEndpointSchema>

export const transferStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'succeeded',
  'failed',
  'cancelled'
])
export type TransferStatus = z.infer<typeof transferStatusSchema>

export const transferJobSchema = z.object({
  id: z.string().min(1),
  kind: transferKindSchema,
  source: transferEndpointSchema,
  destination: transferEndpointSchema,
  displayName: z.string().min(1),
  totalBytes: z.number().int().nonnegative().optional(),
  transferredBytes: z.number().int().nonnegative(),
  status: transferStatusSchema,
  /** Real SHA-256 of the transferred bytes once available — never reported before the transfer actually completes and the hash was actually computed. */
  checksum: z.string().optional(),
  resumable: z.boolean(),
  errorMessage: z.string().optional(),
  startedAt: z.number().int().nonnegative().optional(),
  completedAt: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().nonnegative()
})
export type TransferJob = z.infer<typeof transferJobSchema>

export const transferJobIdRequestSchema = z.object({ id: z.string().min(1) })
export type TransferJobIdRequest = z.infer<typeof transferJobIdRequestSchema>
