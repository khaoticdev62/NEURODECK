import { describe, expect, it, vi } from 'vitest'
import { TransactionManager } from '../TransactionManager'

describe('TransactionManager', () => {
  it('creates a transaction in pending state and notifies listeners', () => {
    const manager = new TransactionManager()
    const listener = vi.fn()
    manager.onChange(listener)

    const record = manager.create({
      kind: 'package-install',
      label: 'Install demo',
      cancellable: true
    })

    expect(record.status).toBe('pending')
    expect(record.progressPercent).toBe(0)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(manager.list()).toEqual([record])
  })

  it('tracks the real lifecycle: pending -> running -> progress -> succeeded', () => {
    const manager = new TransactionManager()
    const record = manager.create({ kind: 'sync', label: 'Sync now', cancellable: false })

    manager.start(record.id)
    expect(manager.get(record.id)?.status).toBe('running')

    manager.progress(record.id, 42, 'Halfway there')
    expect(manager.get(record.id)?.progressPercent).toBe(42)
    expect(manager.get(record.id)?.message).toBe('Halfway there')

    manager.succeed(record.id, 'Done')
    const resolved = manager.get(record.id)
    expect(resolved?.status).toBe('succeeded')
    expect(resolved?.progressPercent).toBe(100)
    expect(resolved?.resolvedAt).toBeDefined()
  })

  it('clamps progress to [0, 100]', () => {
    const manager = new TransactionManager()
    const record = manager.create({ kind: 'backup', label: 'Backup', cancellable: false })

    manager.progress(record.id, 150)
    expect(manager.get(record.id)?.progressPercent).toBe(100)

    manager.progress(record.id, -10)
    expect(manager.get(record.id)?.progressPercent).toBe(0)
  })

  it('cancel() invokes the real cancel hook before marking cancelled, and only when cancellable', () => {
    const manager = new TransactionManager()
    const onCancel = vi.fn()
    const record = manager.create({ kind: 'sync', label: 'Sync', cancellable: true }, onCancel)

    expect(manager.cancel(record.id)).toBe(true)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(manager.get(record.id)?.status).toBe('cancelled')
  })

  it('cancel() refuses a non-cancellable transaction', () => {
    const manager = new TransactionManager()
    const onCancel = vi.fn()
    const record = manager.create({ kind: 'sync', label: 'Sync', cancellable: false }, onCancel)

    expect(manager.cancel(record.id)).toBe(false)
    expect(onCancel).not.toHaveBeenCalled()
    expect(manager.get(record.id)?.status).toBe('pending')
  })

  it('cancel() refuses an already-resolved transaction', () => {
    const manager = new TransactionManager()
    const record = manager.create({ kind: 'sync', label: 'Sync', cancellable: true })
    manager.succeed(record.id)

    expect(manager.cancel(record.id)).toBe(false)
  })

  it('fail() and rollBack() record real terminal states with a message', () => {
    const manager = new TransactionManager()
    const a = manager.create({ kind: 'package-install', label: 'A', cancellable: false })
    const b = manager.create({ kind: 'package-install', label: 'B', cancellable: false })

    manager.fail(a.id, 'Network error')
    manager.rollBack(b.id, 'Reverted partial install')

    expect(manager.get(a.id)?.status).toBe('failed')
    expect(manager.get(a.id)?.message).toBe('Network error')
    expect(manager.get(b.id)?.status).toBe('rolled-back')
  })

  it('list() returns transactions newest-first', () => {
    vi.useFakeTimers()
    const manager = new TransactionManager()
    const first = manager.create({ kind: 'sync', label: 'First', cancellable: false })
    vi.advanceTimersByTime(10)
    const second = manager.create({ kind: 'sync', label: 'Second', cancellable: false })

    expect(manager.list().map((record) => record.id)).toEqual([second.id, first.id])
    vi.useRealTimers()
  })
})
