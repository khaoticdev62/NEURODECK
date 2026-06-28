import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanShareTransferQueue } from '../LanShareTransferQueue'
import { LanShareTransferStore } from '../LanShareTransferStore'

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('LanShareTransferQueue', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-queue-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('moves an enqueued job through the real draft→preflighting→queued→negotiating states', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const queue = new LanShareTransferQueue(store, dispatch)

    const job = await queue.enqueue({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'photo.png',
      itemCount: 1,
      useCompression: false
    })
    expect(job.status).toBe('queued')

    await vi.waitFor(async () => {
      expect((await store.get(job.id))?.status).toBe('waiting-for-approval')
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('marks a job failed when the real dispatcher rejects', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const dispatch = vi.fn().mockRejectedValue(new Error('peer unreachable'))
    const queue = new LanShareTransferQueue(store, dispatch)

    const job = await queue.enqueue({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'photo.png',
      itemCount: 1,
      useCompression: false
    })

    await vi.waitFor(async () => {
      const updated = await store.get(job.id)
      expect(updated?.status).toBe('failed')
      expect(updated?.errorMessage).toBe('peer unreachable')
    })
  })

  it('never exceeds the real per-peer concurrency limit', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const gate = deferred<void>()
    let observedConcurrent = 0
    let maxObservedConcurrent = 0

    const dispatch = vi.fn().mockImplementation(async () => {
      observedConcurrent += 1
      maxObservedConcurrent = Math.max(maxObservedConcurrent, observedConcurrent)
      await gate.promise
      observedConcurrent -= 1
    })

    const queue = new LanShareTransferQueue(store, dispatch, {
      globalConcurrency: 5,
      perPeerConcurrency: 1
    })

    const jobs = await Promise.all(
      [1, 2, 3].map((n) =>
        queue.enqueue({
          direction: 'send',
          peerId: 'peer-1',
          displayName: `file-${n}.txt`,
          itemCount: 1,
          useCompression: false
        })
      )
    )

    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))
    expect(queue.getActiveCountForPeer('peer-1')).toBe(1)
    gate.resolve()

    await vi.waitFor(async () => {
      const all = await Promise.all(jobs.map((job) => store.get(job.id)))
      expect(all.every((job) => job?.status === 'waiting-for-approval')).toBe(true)
    })
    expect(maxObservedConcurrent).toBe(1)
  })
})
