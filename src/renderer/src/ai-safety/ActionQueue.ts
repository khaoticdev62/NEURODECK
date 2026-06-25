import type { PermissionScope } from './contracts/permission'
import type {
  ActionPlan,
  ActionStep,
  HarnessAction,
  HarnessActionRecord,
  PlanStatus
} from './contracts/plan'
import type { AuditLog } from './AuditLog'
import type { PermissionBroker } from './PermissionBroker'
import type { ToolRegistry } from './ToolRegistry'

export type SubmitResult = { ok: true; record: HarnessActionRecord } | { ok: false; error: string }

let sequence = 0

/**
 * The action queue is the actual safety pipeline (mega-prompt §15.3): every
 * tool invocation is matched against the registry, evaluated against the
 * permission broker, recorded in the audit log, and only then executed.
 * There is no path from "intent" to a running tool that skips this.
 */
export class ActionQueue {
  private records = new Map<string, HarnessActionRecord>()
  private listeners = new Set<() => void>()
  private blocked = false

  constructor(
    private registry: ToolRegistry,
    private broker: PermissionBroker,
    private audit: AuditLog
  ) {}

  isBlocked(): boolean {
    return this.blocked
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private setRecord(record: HarnessActionRecord): void {
    this.records.set(record.action.id, record)
    this.notify()
  }

  list(): HarnessActionRecord[] {
    return [...this.records.values()].sort((a, b) => a.submittedAt - b.submittedAt)
  }

  /**
   * Submits a real tool invocation. Must match a registered tool (spec
   * §15.3) — there is no "run arbitrary string" path. `agentContext` is set
   * only by `AgentToolExecutionBridge.tsx` when an Agent Runtime run is the
   * submitter; it's threaded onto the stored `HarnessAction` (not just this
   * call's own audit entry) so every later lifecycle audit entry for this
   * action (approve/deny/cancel/execute) can read it back too.
   */
  submit(
    toolId: string,
    args: Record<string, unknown> = {},
    goal?: string,
    agentContext?: { agentId: string; runId: string }
  ): SubmitResult {
    if (this.blocked) {
      return { ok: false, error: 'Action queue is paused (emergency stop active).' }
    }

    const tool = this.registry.get(toolId)
    if (!tool) {
      return { ok: false, error: `No tool is registered with id "${toolId}".` }
    }

    const decision = this.broker.evaluate(tool.requiredCapability)
    const status: PlanStatus = decision === 'granted' ? 'approved' : 'pending-approval'

    const step: ActionStep = { id: `step-${++sequence}`, description: tool.description }
    const plan: ActionPlan = {
      id: `plan-${++sequence}`,
      goal: goal ?? tool.title,
      createdBy: agentContext ? 'agent' : 'user',
      steps: [step],
      requiredPermissions: [
        { capability: tool.requiredCapability, reason: tool.description, scope: 'once' }
      ],
      risk: tool.risk,
      networkRequired: false,
      estimatedImpact: { filesAffected: 0, networkRequired: false, reversible: tool.reversible },
      validationPlan: [],
      status
    }
    const action: HarnessAction = {
      id: `action-${++sequence}`,
      planId: plan.id,
      tool: tool.id,
      operation: tool.title,
      arguments: args,
      scope: { description: tool.description, resources: [] },
      risk: tool.risk,
      requiresConfirmation: decision === 'requires-approval',
      reversible: tool.reversible,
      cancellationSupported: true,
      agentId: agentContext?.agentId,
      runId: agentContext?.runId
    }

    const record: HarnessActionRecord = {
      action,
      plan,
      capability: tool.requiredCapability,
      status,
      submittedAt: Date.now()
    }
    this.setRecord(record)

    if (status === 'approved') {
      this.audit.record({
        actionId: action.id,
        tool: tool.id,
        capability: tool.requiredCapability,
        outcome: 'approved',
        agentId: action.agentId,
        runId: action.runId
      })
      void this.execute(record)
    }

    return { ok: true, record }
  }

  /** User reviews a pending action and approves it for the given scope (mega-prompt §16.1). */
  approve(actionId: string, scope: PermissionScope = 'once'): void {
    const record = this.records.get(actionId)
    if (!record || record.status !== 'pending-approval') return

    this.broker.grant(record.capability, scope)
    this.audit.record({
      actionId,
      tool: record.action.tool,
      capability: record.capability,
      outcome: 'approved',
      agentId: record.action.agentId,
      runId: record.action.runId
    })
    this.setRecord({ ...record, status: 'approved' })
    void this.execute(this.records.get(actionId)!)
  }

  deny(actionId: string): void {
    const record = this.records.get(actionId)
    if (!record || record.status !== 'pending-approval') return

    this.audit.record({
      actionId,
      tool: record.action.tool,
      capability: record.capability,
      outcome: 'denied',
      agentId: record.action.agentId,
      runId: record.action.runId
    })
    this.setRecord({ ...record, status: 'denied', resolvedAt: Date.now() })
  }

  /** Cancels a pending or queued action — running actions complete (our tools today run near-instantly; true mid-run cancellation needs Epic 8's cancellable task runtime). */
  cancel(actionId: string): void {
    const record = this.records.get(actionId)
    if (!record || (record.status !== 'pending-approval' && record.status !== 'queued')) return

    this.audit.record({
      actionId,
      tool: record.action.tool,
      capability: record.capability,
      outcome: 'cancelled',
      agentId: record.action.agentId,
      runId: record.action.runId
    })
    this.setRecord({ ...record, status: 'cancelled', resolvedAt: Date.now() })
  }

  /** Emergency Stop (wireframe ND-054): pauses all agent/tool execution, cancels everything not already running. */
  emergencyStop(): void {
    this.blocked = true
    for (const record of this.records.values()) {
      if (record.status === 'pending-approval' || record.status === 'queued') {
        this.audit.record({
          actionId: record.action.id,
          tool: record.action.tool,
          capability: record.capability,
          outcome: 'cancelled',
          detail: 'Emergency stop',
          agentId: record.action.agentId,
          runId: record.action.runId
        })
        this.records.set(record.action.id, {
          ...record,
          status: 'cancelled',
          resolvedAt: Date.now()
        })
      }
    }
    this.notify()
  }

  resume(): void {
    this.blocked = false
    this.notify()
  }

  private async execute(record: HarnessActionRecord): Promise<void> {
    const tool = this.registry.get(record.action.tool)
    if (!tool) return

    this.setRecord({ ...record, status: 'running' })

    try {
      const result = await tool.run(record.action.arguments)
      this.broker.consumeIfOnce(record.capability)
      this.audit.record({
        actionId: record.action.id,
        tool: record.action.tool,
        capability: record.capability,
        outcome: result.success ? 'executed' : 'failed',
        detail: result.message,
        agentId: record.action.agentId,
        runId: record.action.runId
      })
      this.setRecord({
        ...this.records.get(record.action.id)!,
        status: result.success ? 'passed' : 'failed',
        resultMessage: result.message,
        resolvedAt: Date.now()
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.audit.record({
        actionId: record.action.id,
        tool: record.action.tool,
        capability: record.capability,
        outcome: 'failed',
        detail: message,
        agentId: record.action.agentId,
        runId: record.action.runId
      })
      this.setRecord({
        ...this.records.get(record.action.id)!,
        status: 'failed',
        resultMessage: message,
        resolvedAt: Date.now()
      })
    }
  }
}
