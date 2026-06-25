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

export const agentChildPolicySchema = z.object({
  allowChildAgents: z.boolean(),
  maxChildrenPerRun: z.number().int().min(0).max(10),
  maxDepth: z.number().int().min(0).max(3)
})
export type AgentChildPolicy = z.infer<typeof agentChildPolicySchema>

export const defaultAgentChildPolicy: AgentChildPolicy = {
  allowChildAgents: false,
  maxChildrenPerRun: 0,
  maxDepth: 0
}

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
  childAgentPolicy: agentChildPolicySchema.default(defaultAgentChildPolicy),
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

/**
 * One real tool call an agent run submitted through `AgentRuntime.submitToolCall()`
 * (mega-prompt §17), persisted on the run itself so Agent Detail's Tools/Files/
 * Permissions tabs (ND-017) have durable per-run evidence to read — not just the
 * in-memory `pendingToolResults` map that's gone the instant `resolveToolResult()`
 * settles it. `requested` is the state while waiting on the real ActionQueue;
 * the rest mirror `AgentToolExecutionResult['status']`.
 */
export const agentToolExecutionRecordSchema = z.object({
  requestId: z.string().min(1),
  toolId: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['requested', 'pending-approval', 'passed', 'failed', 'denied', 'cancelled']),
  message: z.string().optional(),
  requestedAt: z.number(),
  resolvedAt: z.number().optional()
})
export type AgentToolExecutionRecord = z.infer<typeof agentToolExecutionRecordSchema>

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
  /** True if this run planned but never submitted any tool call to the real ActionQueue — see `startAgentRunRequestSchema`. */
  dryRun: z.boolean().default(false),
  /** Real per-call record of every tool this run submitted — see `agentToolExecutionRecordSchema`. Additive/defaulted so existing persisted runs deserialize unchanged. */
  toolExecutions: z.array(agentToolExecutionRecordSchema).default([]),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type AgentRun = z.infer<typeof agentRunSchema>

export const workspaceAgentRequestSchema = z.object({ workspaceId: z.string().min(1) })
export type WorkspaceAgentRequest = z.infer<typeof workspaceAgentRequestSchema>

export const agentIdRequestSchema = z.object({ agentId: z.string().min(1) })
export type AgentIdRequest = z.infer<typeof agentIdRequestSchema>

export const updateAgentRequestSchema = agentIdRequestSchema.extend({
  agent: createAgentRequestSchema
})
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>

export const setAgentEnabledRequestSchema = agentIdRequestSchema.extend({
  enabled: z.boolean()
})
export type SetAgentEnabledRequest = z.infer<typeof setAgentEnabledRequestSchema>

export const startAgentRunRequestSchema = agentIdRequestSchema.extend({
  objective: z.string().min(1),
  /** When true, the run plans normally (a real model completion) but never submits a tool call to the real ActionQueue — see `AgentRuntime.executeToolCalls()`. */
  dryRun: z.boolean().default(false)
})
export type StartAgentRunRequest = z.infer<typeof startAgentRunRequestSchema>

export const agentRunIdRequestSchema = z.object({ runId: z.string().min(1) })
export type AgentRunIdRequest = z.infer<typeof agentRunIdRequestSchema>

export const listAgentRunsRequestSchema = z.object({ agentId: z.string().min(1).optional() })
export type ListAgentRunsRequest = z.infer<typeof listAgentRunsRequestSchema>

export const agentToolCallSchema = z.object({
  toolId: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({})
})
export type AgentToolCall = z.infer<typeof agentToolCallSchema>

export const agentChildProposalSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1)
})
export type AgentChildProposal = z.infer<typeof agentChildProposalSchema>

export const agentToolPlanSchema = z.object({
  toolCalls: z.array(agentToolCallSchema).default([]),
  childAgents: z.array(agentChildProposalSchema).default([])
})
export type AgentToolPlan = z.infer<typeof agentToolPlanSchema>

export const agentToolExecutionRequestSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  agentId: z.string().min(1),
  workspaceId: z.string().min(1),
  objective: z.string().min(1),
  toolId: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({}),
  permissionCeiling: z.array(z.string()),
  goal: z.string().min(1)
})
export type AgentToolExecutionRequest = z.infer<typeof agentToolExecutionRequestSchema>

export const agentToolExecutionResultSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  toolId: z.string().min(1),
  actionId: z.string().optional(),
  status: z.enum(['pending-approval', 'passed', 'failed', 'denied', 'cancelled']),
  message: z.string()
})
export type AgentToolExecutionResult = z.infer<typeof agentToolExecutionResultSchema>
