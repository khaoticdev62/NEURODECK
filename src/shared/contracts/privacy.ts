import { z } from 'zod'

/**
 * Epic X12 Data Lifecycle and Privacy Map (supplemental spec §37.1).
 * Rows are the real data categories the spec itself names that have a
 * real, identifiable store behind them in this codebase today (Browser
 * data, Terminal history, Clipboard history, AI conversations, Memory,
 * Knowledge index, Audit logs, Backups), plus Vault secrets — privacy
 * critical and real (Epic X10), even though the spec's own §37 list
 * predates it. Sync, cloud processing, analytics, and crash reports are
 * deliberately not rows here: none of those subsystems exist yet in
 * this codebase, and a row describing a feature with no real data
 * behind it would be a fabricated entry.
 */
export const dataCategoryIdSchema = z.enum([
  'browser-data',
  'terminal-history',
  'clipboard-history',
  'ai-conversations',
  'memory',
  'knowledge-index',
  'audit-logs',
  'backups',
  'vault-secrets'
])
export type DataCategoryId = z.infer<typeof dataCategoryIdSchema>

export const deleteControlSchema = z.enum([
  'available-here',
  'available-elsewhere',
  'not-applicable'
])
export type DeleteControl = z.infer<typeof deleteControlSchema>

export const dataMapEntrySchema = z.object({
  id: dataCategoryIdSchema,
  label: z.string(),
  storageLocation: z.string(),
  encrypted: z.boolean(),
  retention: z.string(),
  syncStatus: z.string(),
  exportSupport: z.string(),
  deleteControl: deleteControlSchema,
  deleteControlDetail: z.string(),
  providerInvolvement: z.string(),
  /** Real, current count from the owning store — `null` only where nothing is ever persisted (e.g. terminal history) or the data lives in a process this service cannot reach (renderer-only audit log). */
  itemCount: z.number().nullable(),
  /** Set when a fuller delete/management UI already exists for this category, so the Data Map links there instead of duplicating it. */
  linkedRoute: z.string().optional()
})
export type DataMapEntry = z.infer<typeof dataMapEntrySchema>

export const clearDataCategoryRequestSchema = z.object({ id: dataCategoryIdSchema })
export type ClearDataCategoryRequest = z.infer<typeof clearDataCategoryRequestSchema>

/** Real spec §37.2 deletion verification — `verifiedEmpty` is a genuine re-read of the store after clearing, never assumed. */
export const clearDataCategoryResultSchema = z.object({
  id: dataCategoryIdSchema,
  clearedCount: z.number(),
  verifiedEmpty: z.boolean()
})
export type ClearDataCategoryResult = z.infer<typeof clearDataCategoryResultSchema>
