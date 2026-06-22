import { describe, expect, it, vi } from 'vitest'
import type { WorkflowDefinition, WorkflowRun, WorkflowStep } from '@shared/contracts'
import { ActionQueue } from '../../ai-safety/ActionQueue'
import { AuditLog } from '../../ai-safety/AuditLog'
import { PermissionBroker } from '../../ai-safety/PermissionBroker'
import { ToolRegistry } from '../../ai-safety/ToolRegistry'
import type { ToolDefinition } from '../../ai-safety/ToolRegistry'
import { WorkflowEngine } from '../WorkflowEngine'

/**
 * Grants the tool's capability up front, simulating the real "permission
 * preflight" step mega-prompt §25 calls for ("permission requirements are
 * calculated before execution") — without this, `ActionQueue.submit()`
 * correctly parks the action as `pending-approval` and the real Approval
 * Queue UI (Epic 4) would have to approve it, exactly like any other
 * tool call. That's real, intentional behavior, not a bug to work around
 * blindly — tests that want auto-execution must grant first.
 */
function makeQueue(tool: ToolDefinition): ActionQueue {
  const registry = new ToolRegistry()
  registry.register(tool)
  const broker = new PermissionBroker()
  broker.grant(tool.requiredCapability, 'session')
  return new ActionQueue(registry, broker, new AuditLog())
}

function makeRun(workflowId: string): WorkflowRun {
  return {
    id: 'run-1',
    workflowId,
    workspaceId: 'w1',
    status: 'running',
    steps: [],
    context: {},
    startedAt: Date.now()
  }
}

function makeDefinition(steps: WorkflowStep[]): WorkflowDefinition {
  return {
    id: 'wf1',
    workspaceId: 'w1',
    name: 'Test workflow',
    description: '',
    steps,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

const realTool: ToolDefinition = {
  id: 'demo-tool',
  title: 'Demo Tool',
  description: 'A demo tool',
  requiredCapability: 'system.changeSettings',
  risk: 'low',
  reversible: true,
  run: async () => ({ success: true, message: 'done' })
}

describe('WorkflowEngine', () => {
  it('runs a real tool-action step end to end through the real ActionQueue and marks the run passed', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'tool-action', title: 'Run demo', toolId: 'demo-tool', args: {} }
    ])
    const onUpdate = vi.fn()

    const final = await engine.start(definition, makeRun(definition.id), queue, onUpdate)

    expect(final.status).toBe('passed')
    expect(final.steps[0]).toMatchObject({ stepId: 's1', status: 'passed', message: 'done' })
  })

  it('fails the run when a tool-action step fails', async () => {
    const failingTool: ToolDefinition = {
      ...realTool,
      id: 'failing-tool',
      run: async () => ({ success: false, message: 'broke' })
    }
    const queue = makeQueue(failingTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'tool-action', title: 'Run failing', toolId: 'failing-tool', args: {} }
    ])

    const final = await engine.start(definition, makeRun(definition.id), queue, vi.fn())

    expect(final.status).toBe('failed')
    expect(final.steps[0]).toMatchObject({ stepId: 's1', status: 'failed' })
  })

  it('fails the run when the referenced tool is not registered', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'tool-action', title: 'Missing', toolId: 'does-not-exist', args: {} }
    ])

    const final = await engine.start(definition, makeRun(definition.id), queue, vi.fn())

    expect(final.status).toBe('failed')
    expect(final.steps[0].message).toContain('No tool is registered')
  })

  it('stops the run cleanly when a condition is not met', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      {
        id: 's1',
        kind: 'condition',
        title: 'Gate',
        expression: { variable: 'branch', operator: 'equals', value: 'main' }
      },
      { id: 's2', kind: 'tool-action', title: 'Never runs', toolId: 'demo-tool', args: {} }
    ])
    const run = { ...makeRun(definition.id), context: { branch: 'feature' } }

    const final = await engine.start(definition, run, queue, vi.fn())

    expect(final.status).toBe('passed')
    expect(final.steps[0]).toMatchObject({ stepId: 's1', status: 'skipped' })
    expect(final.steps).toHaveLength(1)
  })

  it('fails the run when a validator does not pass', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      {
        id: 's1',
        kind: 'validator',
        title: 'Check',
        expression: { variable: 'count', operator: 'greater-than', value: '5' }
      }
    ])
    const run = { ...makeRun(definition.id), context: { count: '1' } }

    const final = await engine.start(definition, run, queue, vi.fn())

    expect(final.status).toBe('failed')
    expect(final.steps[0].message).toContain('Validation failed')
  })

  it('waits for a real user-approval before continuing, and resolveApproval unblocks it', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'user-approval', title: 'Confirm', prompt: 'Proceed?' },
      { id: 's2', kind: 'tool-action', title: 'Run demo', toolId: 'demo-tool', args: {} }
    ])
    const updates: string[] = []
    const onUpdate = vi.fn((run: WorkflowRun) => {
      const last = run.steps[run.steps.length - 1]
      if (last) updates.push(`${last.stepId}:${last.status}`)
    })

    const promise = engine.start(definition, makeRun(definition.id), queue, onUpdate)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(updates).toContain('s1:waiting-for-approval')

    engine.resolveApproval('run-1', true)
    const final = await promise

    expect(final.status).toBe('passed')
    expect(final.steps.map((step) => step.stepId)).toEqual(['s1', 's2'])
  })

  it('cancels the run when user-approval is rejected', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'user-approval', title: 'Confirm', prompt: 'Proceed?' }
    ])

    const promise = engine.start(definition, makeRun(definition.id), queue, vi.fn())
    await new Promise((resolve) => setTimeout(resolve, 10))
    engine.resolveApproval('run-1', false)

    const final = await promise
    expect(final.status).toBe('cancelled')
  })

  it('cancel() stops the run before the next step starts', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'delay', title: 'Wait', milliseconds: 5 },
      { id: 's2', kind: 'tool-action', title: 'Run demo', toolId: 'demo-tool', args: {} }
    ])

    const promise = engine.start(definition, makeRun(definition.id), queue, vi.fn())
    engine.cancel('run-1')
    const final = await promise

    expect(final.status).toBe('cancelled')
  })

  it('records an output step message from the run context', async () => {
    const queue = makeQueue(realTool)
    const engine = new WorkflowEngine()
    const definition = makeDefinition([
      { id: 's1', kind: 'output', title: 'Result', variable: 'summary' }
    ])
    const run = { ...makeRun(definition.id), context: { summary: 'all good' } }

    const final = await engine.start(definition, run, queue, vi.fn())

    expect(final.status).toBe('passed')
    expect(final.steps[0].message).toBe('all good')
  })
})
