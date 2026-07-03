import { z } from 'zod'
import { routingProfileIdSchema } from './model'

/**
 * Phase 3 AI Chat: a persistent, multi-turn conversation, distinct from
 * `AgentRun` (which is a single-turn plan-then-execute lifecycle with tool
 * calls). A conversation never proposes or executes tools — it's real
 * multi-turn model dialogue only. The existing intent -> plan -> approve ->
 * execute pipeline (`AgentRuntime`) remains the only path to actual tool
 * execution, per the non-negotiable "no unreviewed destructive AI
 * execution" rule.
 */
export const conversationMessageRoleSchema = z.enum(['user', 'assistant'])
export type ConversationMessageRole = z.infer<typeof conversationMessageRoleSchema>

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: conversationMessageRoleSchema,
  content: z.string(),
  createdAt: z.number(),
  // Real per-turn provenance from the actual ModelCompletionResult — never
  // fabricated — present only on assistant messages that completed.
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  // Present only when this turn's real model call failed, so the
  // transcript can show a real error instead of silently dropping it.
  error: z.string().optional()
})
export type ConversationMessage = z.infer<typeof conversationMessageSchema>

export const conversationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  profileId: routingProfileIdSchema,
  messages: z.array(conversationMessageSchema),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type Conversation = z.infer<typeof conversationSchema>

export const listConversationsRequestSchema = z.object({
  workspaceId: z.string().min(1)
})
export type ListConversationsRequest = z.infer<typeof listConversationsRequestSchema>

export const createConversationRequestSchema = z.object({
  workspaceId: z.string().min(1),
  profileId: routingProfileIdSchema.default('balanced')
})
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>

export const conversationIdRequestSchema = z.object({
  workspaceId: z.string().min(1),
  conversationId: z.string().min(1)
})
export type ConversationIdRequest = z.infer<typeof conversationIdRequestSchema>

export const sendConversationMessageRequestSchema = z.object({
  workspaceId: z.string().min(1),
  conversationId: z.string().min(1),
  content: z.string().min(1)
})
export type SendConversationMessageRequest = z.infer<typeof sendConversationMessageRequestSchema>
