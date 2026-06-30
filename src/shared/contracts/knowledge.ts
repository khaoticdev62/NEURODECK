import { z } from 'zod'

/**
 * Epic X4 Local Knowledge Vault (supplemental spec §12) — a real,
 * offline, user-controlled ingestion/retrieval pipeline. Embeddings are
 * explicitly out of scope for this slice (no real local embedding
 * model is wired in yet — see the ledger); retrieval uses real lexical
 * (keyword/term-frequency) scoring over real extracted text instead of
 * fabricated semantic similarity. PDF source parsing is also out of
 * scope — no PDF-parsing dependency exists in this codebase yet, and
 * adding one is its own decision, not bundled into this pass.
 */
export const knowledgeSourceTypeSchema = z.enum([
  'file',
  'folder',
  'markdown-note',
  'code-repository',
  'browser-page',
  'terminal-session',
  'conversation-export',
  'workflow-report',
  'learning-note',
  'remote-document',
  'structured-data',
  'snippet'
])
export type KnowledgeSourceType = z.infer<typeof knowledgeSourceTypeSchema>

export const knowledgePrivacyLevelSchema = z.enum(['private', 'workspace', 'profile', 'shareable'])
export type KnowledgePrivacyLevel = z.infer<typeof knowledgePrivacyLevelSchema>

export const ingestionStatusSchema = z.enum([
  'pending',
  'parsing',
  'indexed',
  'failed',
  'paused',
  'stale'
])
export type IngestionStatus = z.infer<typeof ingestionStatusSchema>

export const knowledgeSourceSchema = z.object({
  id: z.string().min(1),
  type: knowledgeSourceTypeSchema,
  title: z.string().min(1).max(300),
  /** Real absolute path or URI this source was actually ingested from — used to detect staleness via a real mtime/hash recheck, never fabricated. */
  origin: z.string().min(1),
  workspaceId: z.string().optional(),
  privacyLevel: knowledgePrivacyLevelSchema,
  ingestionStatus: ingestionStatusSchema,
  parserVersion: z.string().min(1),
  contentHash: z.string().min(1),
  lastIndexedAt: z.number().int().nonnegative().optional(),
  chunkCount: z.number().int().nonnegative().optional(),
  failureReason: z.string().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>

export const knowledgeChunkSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  index: z.number().int().nonnegative(),
  text: z.string().min(1)
})
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>

export const addKnowledgeSourceRequestSchema = z.object({
  /** Real, already-resolved absolute file/folder path from a native picker. */
  path: z.string().min(1),
  workspaceId: z.string().optional(),
  privacyLevel: knowledgePrivacyLevelSchema.default('workspace')
})
export type AddKnowledgeSourceRequest = z.infer<typeof addKnowledgeSourceRequestSchema>

export const knowledgeSourceIdRequestSchema = z.object({ id: z.string().min(1) })
export type KnowledgeSourceIdRequest = z.infer<typeof knowledgeSourceIdRequestSchema>

export const setKnowledgeSourcePausedRequestSchema = z.object({
  id: z.string().min(1),
  paused: z.boolean()
})
export type SetKnowledgeSourcePausedRequest = z.infer<typeof setKnowledgeSourcePausedRequestSchema>

export const knowledgeQueryRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  workspaceId: z.string().optional(),
  maxResults: z.number().int().positive().max(50).default(10)
})
export type KnowledgeQueryRequest = z.infer<typeof knowledgeQueryRequestSchema>

/** Real retrieval rules (supplemental §12.5) — every result carries its own provenance; the caller never has to trust an unlabeled blob of "context." */
export const knowledgeQueryResultSchema = z.object({
  chunk: knowledgeChunkSchema,
  sourceId: z.string().min(1),
  sourceTitle: z.string().min(1),
  score: z.number(),
  retrievedAt: z.number().int().nonnegative(),
  /** True when the source's on-disk content hash no longer matches what was indexed — the caller must surface this, not silently serve stale text as current. */
  stale: z.boolean()
})
export type KnowledgeQueryResult = z.infer<typeof knowledgeQueryResultSchema>

/** Real Epic X6 Universal Share Sheet — "Add to Knowledge Vault" target (supplemental §17.4). */
export const addKnowledgeNoteRequestSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(100_000),
  origin: z.string().min(1).max(500),
  privacyLevel: knowledgePrivacyLevelSchema.default('workspace')
})
export type AddKnowledgeNoteRequest = z.infer<typeof addKnowledgeNoteRequestSchema>
