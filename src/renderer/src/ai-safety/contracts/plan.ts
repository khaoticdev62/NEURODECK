import type { PermissionCapability, PermissionRequest } from './permission'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type PlanStatus =
  | 'pending-approval'
  | 'approved'
  | 'denied'
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'cancelled'
  | 'rolled-back'

export interface ResourceScope {
  description: string
  /** e.g. file globs, host names — empty for tools with no resource scope (e.g. local settings). */
  resources: string[]
}

export interface ImpactSummary {
  filesAffected: number
  networkRequired: boolean
  reversible: boolean
}

export interface ValidationStep {
  description: string
}

export interface RollbackPlan {
  description: string
}

/** A single step inside an `ActionPlan` (mega-prompt §15.1). */
export interface ActionStep {
  id: string
  description: string
}

/** A typed, reviewable execution plan (mega-prompt §15.1). */
export interface ActionPlan {
  id: string
  goal: string
  createdBy: 'user' | 'agent' | 'workflow'
  steps: ActionStep[]
  requiredPermissions: PermissionRequest[]
  risk: RiskLevel
  networkRequired: boolean
  estimatedImpact: ImpactSummary
  validationPlan: ValidationStep[]
  rollbackPlan?: RollbackPlan
  status: PlanStatus
}

/** A typed tool invocation bound to a plan (mega-prompt §15.2). */
export interface HarnessAction {
  id: string
  planId: string
  tool: string
  operation: string
  arguments: Record<string, unknown>
  scope: ResourceScope
  risk: RiskLevel
  requiresConfirmation: boolean
  reversible: boolean
  cancellationSupported: boolean
}

/** Runtime record tracking a submitted action through the queue — not part of the spec schema itself, but what the UI renders. */
export interface HarnessActionRecord {
  action: HarnessAction
  plan: ActionPlan
  capability: PermissionCapability
  status: PlanStatus
  submittedAt: number
  resolvedAt?: number
  resultMessage?: string
}
