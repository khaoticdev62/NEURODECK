import { z } from 'zod'

/**
 * Epic X6 Clipboard Center (supplemental spec §17.1/§17.2). Every
 * entry is checked against the exact same real `detectSecret()` Scoped
 * Memory/Knowledge Vault already use before it's added to history —
 * "Secret fields never enter history" is enforced at write time, not
 * left as a UI convention. Persisted entries are encrypted at rest via
 * the real injected `SecretCipher` (the same OS-level `safeStorage`
 * boundary `ModelProviderStore`'s API keys already use), never
 * plaintext on disk.
 */
export const clipboardEntryKindSchema = z.enum(['text', 'image-reference', 'file-reference'])
export type ClipboardEntryKind = z.infer<typeof clipboardEntryKindSchema>

export const clipboardEntrySchema = z.object({
  id: z.string().min(1),
  kind: clipboardEntryKindSchema,
  content: z.string(),
  pinned: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative().optional()
})
export type ClipboardEntry = z.infer<typeof clipboardEntrySchema>

export const clipboardQueryRequestSchema = z.object({
  search: z.string().optional()
})
export type ClipboardQueryRequest = z.infer<typeof clipboardQueryRequestSchema>

export const clipboardEntryIdRequestSchema = z.object({ id: z.string().min(1) })
export type ClipboardEntryIdRequest = z.infer<typeof clipboardEntryIdRequestSchema>

export const setClipboardPinnedRequestSchema = z.object({
  id: z.string().min(1),
  pinned: z.boolean()
})
export type SetClipboardPinnedRequest = z.infer<typeof setClipboardPinnedRequestSchema>

export const setClipboardMonitoringRequestSchema = z.object({ enabled: z.boolean() })
export type SetClipboardMonitoringRequest = z.infer<typeof setClipboardMonitoringRequestSchema>

/**
 * Epic X6 Snippets (supplemental §17.3). Shell snippets carry a real
 * risk classification (mirroring the same regex-based privileged/
 * destructive detection `CommandBuilder`'s `classifyCommand` already
 * uses, reimplemented in `core/` since the renderer module isn't
 * importable from the main process) rather than treating every shell
 * snippet as equally safe to insert.
 */
export const snippetTypeSchema = z.enum([
  'text',
  'code',
  'shell',
  'prompt',
  'path',
  'url',
  'workflow-input',
  'structured-data'
])
export type SnippetType = z.infer<typeof snippetTypeSchema>

export const snippetRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])
export type SnippetRiskLevel = z.infer<typeof snippetRiskLevelSchema>

export const snippetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  type: snippetTypeSchema,
  content: z.string().min(1),
  /** Real `{{variable}}` placeholders detected in `content` at save time — not user-declared, so they can never drift from what the content actually references. */
  variables: z.array(z.string()).default([]),
  riskLevel: snippetRiskLevelSchema.optional(),
  riskReason: z.string().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type Snippet = z.infer<typeof snippetSchema>

export const upsertSnippetRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  type: snippetTypeSchema,
  content: z.string().min(1)
})
export type UpsertSnippetRequest = z.infer<typeof upsertSnippetRequestSchema>

export const snippetIdRequestSchema = z.object({ id: z.string().min(1) })
export type SnippetIdRequest = z.infer<typeof snippetIdRequestSchema>

export const renderSnippetRequestSchema = z.object({
  id: z.string().min(1),
  values: z.record(z.string(), z.string()).default({})
})
export type RenderSnippetRequest = z.infer<typeof renderSnippetRequestSchema>

export const renderedSnippetSchema = z.object({
  text: z.string(),
  missingVariables: z.array(z.string())
})
export type RenderedSnippet = z.infer<typeof renderedSnippetSchema>
