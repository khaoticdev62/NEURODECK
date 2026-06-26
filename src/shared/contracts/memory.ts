import { z } from 'zod'

/**
 * Epic X4 Scoped AI Memory (supplemental spec §13) — distinct from the
 * Knowledge Vault: this is small, structured, attributable facts about
 * how to work with the user/workspace, not ingested documents.
 * §13.4's "do not store secrets" rule is enforced for real in
 * `core/memory/secretDetector.ts`, not left as a policy comment — a
 * write whose content matches a real secret-shaped pattern is rejected
 * before it ever reaches disk.
 */
export const memoryScopeSchema = z.enum([
  'turn',
  'conversation',
  'task',
  'workspace',
  'profile',
  'global'
])
export type MemoryScope = z.infer<typeof memoryScopeSchema>

export const memoryTypeSchema = z.enum([
  'user-preference',
  'workspace-convention',
  'tool-preference',
  'reusable-correction',
  'recent-task-state',
  'pinned-fact',
  'avoidance-rule'
])
export type MemoryType = z.infer<typeof memoryTypeSchema>

export const memoryItemSchema = z.object({
  id: z.string().min(1),
  scope: memoryScopeSchema,
  type: memoryTypeSchema,
  content: z.string().min(1).max(2000),
  /** Real attribution (supplemental §13.4 "Memory writes must be attributable and inspectable") — never anonymous. */
  attributedTo: z.enum(['user', 'agent', 'workflow', 'system']),
  workspaceId: z.string().optional(),
  pinned: z.boolean().default(false),
  expiresAt: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type MemoryItem = z.infer<typeof memoryItemSchema>

export const writeMemoryRequestSchema = z.object({
  scope: memoryScopeSchema,
  type: memoryTypeSchema,
  content: z.string().min(1).max(2000),
  attributedTo: z.enum(['user', 'agent', 'workflow', 'system']),
  workspaceId: z.string().optional(),
  pinned: z.boolean().default(false),
  expiresAt: z.number().int().nonnegative().optional()
})
export type WriteMemoryRequest = z.infer<typeof writeMemoryRequestSchema>

export const memoryIdRequestSchema = z.object({ id: z.string().min(1) })
export type MemoryIdRequest = z.infer<typeof memoryIdRequestSchema>

export const memoryQueryRequestSchema = z.object({
  scope: memoryScopeSchema.optional(),
  workspaceId: z.string().optional(),
  search: z.string().optional()
})
export type MemoryQueryRequest = z.infer<typeof memoryQueryRequestSchema>

export const setMemoryDisabledRequestSchema = z.object({
  /** `undefined` category means "disable all" (supplemental §13.3). */
  type: memoryTypeSchema.optional(),
  disabled: z.boolean()
})
export type SetMemoryDisabledRequest = z.infer<typeof setMemoryDisabledRequestSchema>

export const updateMemoryRequestSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(2000).optional(),
  scope: memoryScopeSchema.optional(),
  pinned: z.boolean().optional(),
  expiresAt: z.number().int().nonnegative().optional()
})
export type UpdateMemoryRequest = z.infer<typeof updateMemoryRequestSchema>

export const clearMemoryScopeRequestSchema = z.object({
  scope: memoryScopeSchema,
  workspaceId: z.string().optional()
})
export type ClearMemoryScopeRequest = z.infer<typeof clearMemoryScopeRequestSchema>
