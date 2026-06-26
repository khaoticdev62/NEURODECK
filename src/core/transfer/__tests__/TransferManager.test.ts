import { describe, expect, it, vi } from 'vitest'
import { TransferManager, type CreateTransferJobOptions } from '../TransferManager'

function options(overrides: Partial<CreateTransferJobOptions> = {}): CreateTransferJobOptions {
  return {
    kind: 'lan-transfer' as const,
    source: { label: 'This device', reference: '/tmp/file.txt' },
    destination: { label: 'Peer device', reference: 'peer-1' },
    displayName: 'file.txt',
    resumable: true,
    ...overrides
  }
}

describe('TransferManager', () => {
  it('creates a job in queued state and notifies listeners', () => {
    const manager = new TransferManager()
    const listener = vi.fn()
    manager.onChange(listener)

    const job = manager.create(options())

    expect(job.status).toBe('queued')
    expect(job.transferredBytes).toBe(0)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('tracks real byte progress through running -> succeeded', () => {
    const manager = new TransferManager()
    const job = manager.create(options({ totalBytes: 1000 }))

    manager.start(job.id)
    expect(manager.get(job.id)?.status).toBe('running')

    manager.progress(job.id, 500)
    expect(manager.get(job.id)?.transferredBytes).toBe(500)

    manager.succeed(job.id, 'abc123')
    const resolved = manager.get(job.id)
    expect(resolved?.status).toBe('succeeded')
    expect(resolved?.transferredBytes).toBe(1000)
    expect(resolved?.checksum).toBe('abc123')
  })

  it('pause()/resume() only work on a real resumable job', () => {
    const manager = new TransferManager()
    const resumable = manager.create(options({ resumable: true }))
    const notResumable = manager.create(options({ resumable: false }))
    manager.start(resumable.id)
    manager.start(notResumable.id)

    manager.pause(resumable.id)
    expect(manager.get(resumable.id)?.status).toBe('paused')

    manager.pause(notResumable.id)
    expect(manager.get(notResumable.id)?.status).toBe('running')

    manager.resume(resumable.id)
    expect(manager.get(resumable.id)?.status).toBe('running')
  })

  it('cancel() invokes the real cancel hook and marks the job cancelled', () => {
    const manager = new TransferManager()
    const onCancel = vi.fn()
    const job = manager.create(options(), onCancel)

    expect(manager.cancel(job.id)).toBe(true)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(manager.get(job.id)?.status).toBe('cancelled')
  })

  it('cancel() refuses an already-resolved job', () => {
    const manager = new TransferManager()
    const job = manager.create(options())
    manager.succeed(job.id)

    expect(manager.cancel(job.id)).toBe(false)
  })

  it('fail() records a real error message', () => {
    const manager = new TransferManager()
    const job = manager.create(options())

    manager.fail(job.id, 'Connection reset by peer.')

    const resolved = manager.get(job.id)
    expect(resolved?.status).toBe('failed')
    expect(resolved?.errorMessage).toBe('Connection reset by peer.')
  })

  it('list() returns jobs newest-first', () => {
    vi.useFakeTimers()
    const manager = new TransferManager()
    const first = manager.create(options())
    vi.advanceTimersByTime(10)
    const second = manager.create(options())

    expect(manager.list().map((job) => job.id)).toEqual([second.id, first.id])
    vi.useRealTimers()
  })
})
