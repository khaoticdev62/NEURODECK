import { describe, expect, it, vi } from 'vitest'
import { AuditLog } from '../AuditLog'

describe('AuditLog', () => {
  it('records an entry with a generated id and timestamp', () => {
    const log = new AuditLog()
    const entry = log.record({
      actionId: 'action-1',
      tool: 'demo-tool',
      capability: 'system.changeSettings',
      outcome: 'executed'
    })

    expect(entry.id).toMatch(/^audit-/)
    expect(typeof entry.timestamp).toBe('number')
    expect(log.list()).toHaveLength(1)
  })

  it('preserves insertion order across multiple entries', () => {
    const log = new AuditLog()
    log.record({
      actionId: 'a',
      tool: 't',
      capability: 'system.changeSettings',
      outcome: 'approved'
    })
    log.record({
      actionId: 'a',
      tool: 't',
      capability: 'system.changeSettings',
      outcome: 'executed'
    })

    expect(log.list().map((e) => e.outcome)).toEqual(['approved', 'executed'])
  })

  it('notifies listeners on every new entry', () => {
    const log = new AuditLog()
    const listener = vi.fn()
    log.onChange(listener)

    log.record({
      actionId: 'a',
      tool: 't',
      capability: 'system.changeSettings',
      outcome: 'executed'
    })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const log = new AuditLog()
    const listener = vi.fn()
    const unsubscribe = log.onChange(listener)
    unsubscribe()

    log.record({
      actionId: 'a',
      tool: 't',
      capability: 'system.changeSettings',
      outcome: 'executed'
    })

    expect(listener).not.toHaveBeenCalled()
  })
})
