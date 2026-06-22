import type { ActionQueue } from '../ai-safety/ActionQueue'
import type { HarnessActionRecord } from '../ai-safety/contracts/plan'
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowStep,
  WorkflowStepRun
} from '@shared/contracts'
import { evaluateCondition } from './evaluateCondition'

const TERMINAL_ACTION_STATUSES = new Set(['passed', 'failed', 'denied', 'cancelled', 'rolled-back'])

interface RunControl {
  cancelled: boolean
  approvalResolver: ((approved: boolean) => void) | null
}

/**
 * Real workflow execution (mega-prompt §25), sequential by design — see
 * the scope note in `shared/contracts/workflow.ts`. `tool-action` steps
 * submit through the real `ActionQueue` built in Epic 4: a workflow tool
 * call goes through the exact same registry → permission → approval →
 * execution → audit pipeline as a user-initiated Command Palette action.
 * There is no separate, weaker execution path for workflows.
 */
export class WorkflowEngine {
  private controls = new Map<string, RunControl>()

  async start(
    definition: WorkflowDefinition,
    initialRun: WorkflowRun,
    queue: ActionQueue,
    onUpdate: (run: WorkflowRun) => void
  ): Promise<WorkflowRun> {
    const control: RunControl = { cancelled: false, approvalResolver: null }
    this.controls.set(initialRun.id, control)
    let run = initialRun

    try {
      for (const step of definition.steps) {
        if (control.cancelled) {
          run = { ...run, status: 'cancelled', finishedAt: Date.now() }
          onUpdate(run)
          return run
        }

        run = {
          ...run,
          steps: [...run.steps, { stepId: step.id, status: 'running', startedAt: Date.now() }]
        }
        onUpdate(run)

        const stepRun = await this.runStep(step, run, queue, control, (waitingRun) => {
          run = waitingRun
          onUpdate(run)
        })
        run = { ...run, steps: replaceStep(run.steps, stepRun) }
        onUpdate(run)

        if (stepRun.status === 'failed') {
          run = { ...run, status: 'failed', finishedAt: Date.now() }
          onUpdate(run)
          return run
        }
        if (stepRun.status === 'cancelled') {
          run = { ...run, status: 'cancelled', finishedAt: Date.now() }
          onUpdate(run)
          return run
        }
        if (step.kind === 'condition' && stepRun.status === 'skipped') {
          run = { ...run, status: 'passed', finishedAt: Date.now() }
          onUpdate(run)
          return run
        }
      }

      run = { ...run, status: 'passed', finishedAt: Date.now() }
      onUpdate(run)
      return run
    } finally {
      this.controls.delete(initialRun.id)
    }
  }

  /** Resolves a pending `user-approval` step. No-op if the run isn't currently waiting on one. */
  resolveApproval(runId: string, approved: boolean): void {
    this.controls.get(runId)?.approvalResolver?.(approved)
  }

  /** Cancels between steps — our tool actions run near-instantly today, so true mid-step cancellation isn't needed yet (same limitation `ActionQueue.cancel()` documents). */
  cancel(runId: string): void {
    const control = this.controls.get(runId)
    if (control) control.cancelled = true
  }

  private async runStep(
    step: WorkflowStep,
    run: WorkflowRun,
    queue: ActionQueue,
    control: RunControl,
    onWaiting: (run: WorkflowRun) => void
  ): Promise<WorkflowStepRun> {
    const startedAt = Date.now()

    switch (step.kind) {
      case 'tool-action': {
        const submission = queue.submit(step.toolId, step.args, step.title)
        if (!submission.ok) {
          return {
            stepId: step.id,
            status: 'failed',
            message: submission.error,
            startedAt,
            finishedAt: Date.now()
          }
        }
        const final = await awaitActionCompletion(queue, submission.record.action.id)
        const status =
          final.status === 'passed' ? 'passed' : final.status === 'denied' ? 'cancelled' : 'failed'
        return {
          stepId: step.id,
          status,
          message: final.resultMessage,
          startedAt,
          finishedAt: Date.now()
        }
      }

      case 'condition': {
        const met = evaluateCondition(step.expression, run.context)
        return {
          stepId: step.id,
          status: met ? 'passed' : 'skipped',
          startedAt,
          finishedAt: Date.now()
        }
      }

      case 'validator': {
        const met = evaluateCondition(step.expression, run.context)
        return {
          stepId: step.id,
          status: met ? 'passed' : 'failed',
          message: met
            ? undefined
            : `Validation failed: ${step.expression.variable} ${step.expression.operator} ${step.expression.value}`,
          startedAt,
          finishedAt: Date.now()
        }
      }

      case 'user-approval': {
        const waitingStep: WorkflowStepRun = {
          stepId: step.id,
          status: 'waiting-for-approval',
          startedAt
        }
        onWaiting({ ...run, steps: replaceStep(run.steps, waitingStep) })
        const approved = await new Promise<boolean>((resolve) => {
          control.approvalResolver = resolve
        })
        control.approvalResolver = null
        return {
          stepId: step.id,
          status: approved ? 'passed' : 'cancelled',
          startedAt,
          finishedAt: Date.now()
        }
      }

      case 'delay': {
        await sleep(step.milliseconds)
        return { stepId: step.id, status: 'passed', startedAt, finishedAt: Date.now() }
      }

      case 'output': {
        return {
          stepId: step.id,
          status: 'passed',
          message: run.context[step.variable],
          startedAt,
          finishedAt: Date.now()
        }
      }
    }
  }
}

function replaceStep(steps: WorkflowStepRun[], next: WorkflowStepRun): WorkflowStepRun[] {
  return steps.map((step) => (step.stepId === next.stepId ? next : step))
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function awaitActionCompletion(queue: ActionQueue, actionId: string): Promise<HarnessActionRecord> {
  return new Promise((resolve) => {
    const tryResolve = (): boolean => {
      const record = queue.list().find((candidate) => candidate.action.id === actionId)
      if (!record || !TERMINAL_ACTION_STATUSES.has(record.status)) return false
      resolve(record)
      return true
    }
    if (tryResolve()) return
    const unsubscribe = queue.onChange(() => {
      if (tryResolve()) unsubscribe()
    })
  })
}
