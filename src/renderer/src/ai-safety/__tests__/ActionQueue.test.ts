import { describe, expect, it, vi } from 'vitest'
import { ActionQueue } from '../ActionQueue'
import { AuditLog } from '../AuditLog'
import { PermissionBroker } from '../PermissionBroker'
import { ToolRegistry } from '../ToolRegistry'
import type { ToolDefinition } from '../ToolRegistry'

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'demo-tool',
    title: 'Demo Tool',
    description: 'Does something low-risk',
    requiredCapability: 'system.changeSettings',
    risk: 'low',
    reversible: true,
    run: vi.fn().mockResolvedValue({ success: true, message: 'done' }),
    ...overrides
  }
}

function setup(tool = makeTool()): {
  queue: ActionQueue
  registry: ToolRegistry
  broker: PermissionBroker
  audit: AuditLog
} {
  const registry = new ToolRegistry()
  registry.register(tool)
  const broker = new PermissionBroker()
  const audit = new AuditLog()
  return { queue: new ActionQueue(registry, broker, audit), registry, broker, audit }
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('ActionQueue', () => {
  it('rejects submission of an unregistered tool id', () => {
    const { queue } = setup()
    const result = queue.submit('not-a-real-tool')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/No tool is registered/)
  })

  it('queues a submission as pending-approval when the capability has not been granted', () => {
    const { queue } = setup()
    const result = queue.submit('demo-tool')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.record.status).toBe('pending-approval')
  })

  it('auto-runs immediately when the capability is already granted', async () => {
    const tool = makeTool()
    const { queue, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')

    const result = queue.submit('demo-tool')
    await flush()

    expect(tool.run).toHaveBeenCalledTimes(1)
    if (result.ok) {
      expect(queue.list().find((r) => r.action.id === result.record.action.id)?.status).toBe(
        'passed'
      )
    }
  })

  it('approving a pending action runs the real tool and records the result', async () => {
    const tool = makeTool()
    const { queue } = setup(tool)
    const result = queue.submit('demo-tool')
    if (!result.ok) throw new Error('expected ok')

    queue.approve(result.record.action.id)
    await flush()

    expect(tool.run).toHaveBeenCalledTimes(1)
    expect(queue.list()[0].status).toBe('passed')
  })

  it('denying a pending action never calls the tool', () => {
    const tool = makeTool()
    const { queue } = setup(tool)
    const result = queue.submit('demo-tool')
    if (!result.ok) throw new Error('expected ok')

    queue.deny(result.record.action.id)

    expect(tool.run).not.toHaveBeenCalled()
    expect(queue.list()[0].status).toBe('denied')
  })

  it('records a failed run when the tool throws', async () => {
    const tool = makeTool({ run: vi.fn().mockRejectedValue(new Error('boom')) })
    const { queue, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')

    queue.submit('demo-tool')
    await flush()

    expect(queue.list()[0].status).toBe('failed')
    expect(queue.list()[0].resultMessage).toBe('boom')
  })

  it('records a failed run when the tool reports success: false', async () => {
    const tool = makeTool({
      run: vi.fn().mockResolvedValue({ success: false, message: 'precondition not met' })
    })
    const { queue, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')

    queue.submit('demo-tool')
    await flush()

    expect(queue.list()[0].status).toBe('failed')
    expect(queue.list()[0].resultMessage).toBe('precondition not met')
  })

  it('a "once" grant only auto-approves a single subsequent submission', async () => {
    const tool = makeTool()
    const { queue, broker } = setup(tool)
    const first = queue.submit('demo-tool')
    if (!first.ok) throw new Error('expected ok')
    queue.approve(first.record.action.id, 'once')
    await flush()

    const second = queue.submit('demo-tool')

    expect(second.ok && second.record.status).toBe('pending-approval')
    expect(broker.evaluate('system.changeSettings')).toBe('requires-approval')
  })

  it('emergency stop cancels pending actions and blocks new submissions', () => {
    const { queue } = setup()
    const result = queue.submit('demo-tool')
    if (!result.ok) throw new Error('expected ok')

    queue.emergencyStop()

    expect(queue.list().find((r) => r.action.id === result.record.action.id)?.status).toBe(
      'cancelled'
    )
    const blockedResult = queue.submit('demo-tool')
    expect(blockedResult.ok).toBe(false)
  })

  it('resume lifts the emergency-stop block', () => {
    const { queue } = setup()
    queue.emergencyStop()
    queue.resume()

    const result = queue.submit('demo-tool')
    expect(result.ok).toBe(true)
  })

  it('cancel only affects pending-approval/queued actions, not resolved ones', async () => {
    const tool = makeTool()
    const { queue, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')
    const result = queue.submit('demo-tool')
    await flush()
    if (!result.ok) throw new Error('expected ok')

    queue.cancel(result.record.action.id)

    expect(queue.list()[0].status).toBe('passed') // unchanged — already resolved
  })

  it('threads agentId/runId from submit onto every later audit entry for the action', async () => {
    const tool = makeTool()
    const { queue, audit } = setup(tool)

    const result = queue.submit('demo-tool', {}, 'Agent goal', {
      agentId: 'agent-1',
      runId: 'run-1'
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.record.action.agentId).toBe('agent-1')
    expect(result.record.action.runId).toBe('run-1')

    queue.approve(result.record.action.id)
    await flush()

    const entries = audit.list().filter((entry) => entry.actionId === result.record.action.id)
    expect(entries.length).toBeGreaterThanOrEqual(2) // approved + executed
    entries.forEach((entry) => {
      expect(entry.agentId).toBe('agent-1')
      expect(entry.runId).toBe('run-1')
    })
  })

  it('leaves agentId/runId undefined for a human-submitted action', async () => {
    const tool = makeTool()
    const { queue, audit, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')
    const result = queue.submit('demo-tool')
    if (!result.ok) throw new Error('expected ok')
    await flush()

    expect(result.record.action.agentId).toBeUndefined()
    const entry = audit.list().find((candidate) => candidate.actionId === result.record.action.id)
    expect(entry?.agentId).toBeUndefined()
    expect(entry?.runId).toBeUndefined()
  })

  it('notifies listeners on every state transition', async () => {
    const tool = makeTool()
    const { queue, broker } = setup(tool)
    broker.grant('system.changeSettings', 'session')
    const listener = vi.fn()
    queue.onChange(listener)

    queue.submit('demo-tool')
    await flush()

    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2) // at least: queued/approved -> running -> passed
  })
})
