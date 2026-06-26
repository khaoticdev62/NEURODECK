import { z } from 'zod'

/**
 * Epic X1 shared transaction framework (supplemental spec §7.5) — a
 * generic, reusable async-operation lifecycle (cancellation, progress,
 * atomic completion, audit) for any future long-running, possibly
 * destructive operation: package install/update/remove (Epic X2), sync
 * (Epic X7), backup/restore (Epic X7). No real consumer exists yet in
 * this slice — `TransactionManager` is built and tested standalone so
 * the epics that need it extend one real mechanism instead of each
 * inventing their own ad hoc progress/cancel state machine.
 */
export const transactionStatusSchema = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'rolled-back'
])
export type TransactionStatus = z.infer<typeof transactionStatusSchema>

export const transactionRecordSchema = z.object({
  id: z.string().min(1),
  /** Free-form domain tag set by the caller, e.g. `'package-install'`, `'sync'`, `'backup'` — not an enum, since the set of consumers isn't fixed yet. */
  kind: z.string().min(1),
  label: z.string().min(1),
  status: transactionStatusSchema,
  /** 0–100; a transaction that can't report granular progress stays at 0 until it resolves rather than fabricating intermediate values. */
  progressPercent: z.number().min(0).max(100),
  message: z.string().optional(),
  cancellable: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  resolvedAt: z.number().int().nonnegative().optional()
})
export type TransactionRecord = z.infer<typeof transactionRecordSchema>
