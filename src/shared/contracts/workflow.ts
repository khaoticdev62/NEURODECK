import { z } from 'zod'

/**
 * Real workflow definitions (mega-prompt §25), scoped to a sequential
 * step model rather than an arbitrary node graph — building a full DAG
 * executor (parallel branches, merges, cycle detection, labeled jumps)
 * is disproportionate scope for this slice. A deliberate simplification,
 * the same kind Epic 2 made for focus-engine group transitions: steps run
 * in order; `condition`/`validator`/`ai-decision` are the only nodes that
 * affect control flow, and they can only stop the run early, never branch
 * or loop. `ai-decision` is real (Epic 9's model router unblocked it) —
 * see `workflows/aiDecision.ts` for the strict-JSON response contract.
 * Script, Parallel branch, Merge, and Rollback node types are still not
 * implemented — Script needs a new headless (non-interactive) execution
 * primitive `TerminalService` doesn't provide; Parallel/Merge/Rollback
 * need the full graph model this slice intentionally doesn't build.
 */
export const workflowStepKindSchema = z.enum([
  'tool-action',
  'condition',
  'ai-decision',
  'user-approval',
  'delay',
  'validator',
  'output'
])
export type WorkflowStepKind = z.infer<typeof workflowStepKindSchema>

const conditionOperatorSchema = z.enum([
  'equals',
  'not-equals',
  'contains',
  'greater-than',
  'less-than'
])
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>

export const conditionExpressionSchema = z.object({
  variable: z.string().min(1),
  operator: conditionOperatorSchema,
  value: z.string()
})
export type ConditionExpression = z.infer<typeof conditionExpressionSchema>

export const workflowStepSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    kind: z.literal('tool-action'),
    title: z.string(),
    toolId: z.string(),
    args: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    id: z.string(),
    kind: z.literal('condition'),
    title: z.string(),
    expression: conditionExpressionSchema
  }),
  z.object({
    id: z.string(),
    kind: z.literal('ai-decision'),
    title: z.string(),
    /** Sent to the routed model alongside the run's current context variables; the model must respond with strict JSON, never free-form prose. */
    prompt: z.string().min(1).max(2000)
  }),
  z.object({
    id: z.string(),
    kind: z.literal('user-approval'),
    title: z.string(),
    prompt: z.string()
  }),
  z.object({
    id: z.string(),
    kind: z.literal('delay'),
    title: z.string(),
    milliseconds: z
      .number()
      .int()
      .min(0)
      .max(5 * 60 * 1000)
  }),
  z.object({
    id: z.string(),
    kind: z.literal('validator'),
    title: z.string(),
    expression: conditionExpressionSchema
  }),
  z.object({
    id: z.string(),
    kind: z.literal('output'),
    title: z.string(),
    variable: z.string().min(1)
  })
])
export type WorkflowStep = z.infer<typeof workflowStepSchema>

export const workflowDefinitionSchema = z.object({
  id: z.string(),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  steps: z.array(workflowStepSchema),
  version: z.number().int().nonnegative(),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>

export const workflowNodeStatusSchema = z.enum([
  'pending',
  'running',
  'waiting-for-approval',
  'passed',
  'failed',
  'skipped',
  'cancelled'
])
export type WorkflowNodeStatus = z.infer<typeof workflowNodeStatusSchema>

export const workflowStepRunSchema = z.object({
  stepId: z.string(),
  status: workflowNodeStatusSchema,
  message: z.string().optional(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
  recoveryCheckpointId: z.string().optional()
})
export type WorkflowStepRun = z.infer<typeof workflowStepRunSchema>

export const workflowRunStatusSchema = z.enum([
  'running',
  'paused',
  'passed',
  'failed',
  'cancelled'
])
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>

export const workflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  workspaceId: z.string(),
  status: workflowRunStatusSchema,
  steps: z.array(workflowStepRunSchema),
  context: z.record(z.string(), z.string()),
  startedAt: z.number(),
  finishedAt: z.number().optional()
})
export type WorkflowRun = z.infer<typeof workflowRunSchema>

export const workspaceWorkflowRequestSchema = z.object({ workspaceId: z.string().min(1) })
export type WorkspaceWorkflowRequest = z.infer<typeof workspaceWorkflowRequestSchema>

export const saveWorkflowRequestSchema = z.object({
  workspaceId: z.string().min(1),
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string(),
  steps: z.array(workflowStepSchema)
})
export type SaveWorkflowRequest = z.infer<typeof saveWorkflowRequestSchema>

export const workflowIdRequestSchema = z.object({
  workspaceId: z.string().min(1),
  workflowId: z.string().min(1)
})
export type WorkflowIdRequest = z.infer<typeof workflowIdRequestSchema>

export const createWorkflowRunRequestSchema = z.object({
  workspaceId: z.string().min(1),
  workflowId: z.string().min(1)
})
export type CreateWorkflowRunRequest = z.infer<typeof createWorkflowRunRequestSchema>

export const updateWorkflowRunRequestSchema = z.object({
  workspaceId: z.string().min(1),
  run: workflowRunSchema
})
export type UpdateWorkflowRunRequest = z.infer<typeof updateWorkflowRunRequestSchema>

export const workflowRunIdRequestSchema = z.object({
  workspaceId: z.string().min(1),
  runId: z.string().min(1)
})
export type WorkflowRunIdRequest = z.infer<typeof workflowRunIdRequestSchema>
