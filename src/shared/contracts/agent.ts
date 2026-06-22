import { z } from 'zod'
import { routingProfileIdSchema } from './model'

export const agentStateSchema = z.enum([
  'idle',
  'planning',
  'waiting-for-approval',
  'queued',
  'running',
  'paused',
  'cancelling',
  'cancelled',
  'failed',
  'completed',
  'rolled-back'
])
export type AgentState = z.infer<typeof agentStateSchema>

export const agentResourceLimitsSchema = z.object({
  maxTokens: z.number().int().min(64).max(32768),
  timeoutMs: z.number().int().min(1000).max(300000),
  maxToolCalls: z.number().int().min(0).max(100)
})
export type AgentResourceLimits = z.infer<typeof agentResourceLimitsSchema>

export const agentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1),
  workspaceId: z.string().min(1),
  modelProfile: routingProfileIdSchema,
  toolAllowlist: z.array(z.string()),
  permissionCeiling: z.array(z.string()),
  resourceLimits: agentResourceLimitsSchema,
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type AgentDefinition = z.infer<typeof agentDefinitionSchema>

export const createAgentRequestSchema = agentDefinitionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>

export const agentTimelineEventSchema = z.object({
  id: z.string(),
  at: z.number(),
  state: agentStateSchema,
  message: z.string(),
  modelId: z.string().optional(),
  providerId: z.string().optional()
})
export type AgentTimelineEvent = z.infer<typeof agentTimelineEventSchema>

export const agentRunSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  workspaceId: z.string(),
  objective: z.string(),
  state: agentStateSchema,
  timeline: z.array(agentTimelineEventSchema),
  output: z.string().optional(),
  error: z.string().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type AgentRun = z.infer<typeof agentRunSchema>
