import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanShareTransferStore } from '../LanShareTransferStore'

describe('LanShareTransferStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-transfers-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('creates a job in draft status', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const job = await store.create({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'photo.png',
      itemCount: 1,
      useCompression: false
    })
    expect(job.status).toBe('draft')
    expect(job.transferredBytes).toBe(0)
  })

  it('cancels a pending job and notifies listeners', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const listener = vi.fn()
    store.onChange(listener)
    const job = await store.create({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'photo.png',
      itemCount: 1,
      useCompression: false
    })
    const cancelled = await store.cancel(job.id)
    expect(cancelled).toBe(true)
    expect((await store.get(job.id))?.status).toBe('cancelled')
    expect(listener).toHaveBeenCalled()
  })

  it('refuses to cancel an already-completed job', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const job = await store.create({
      direction: 'receive',
      peerId: 'peer-1',
      displayName: 'doc.pdf',
      itemCount: 1,
      useCompression: false
    })
    await store.cancel(job.id)
    expect(await store.cancel(job.id)).toBe(false)
  })

  it('lists newest-first', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const first = await store.create({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'a.txt',
      itemCount: 1,
      useCompression: false
    })
    const second = await store.create({
      direction: 'send',
      peerId: 'peer-1',
      displayName: 'b.txt',
      itemCount: 1,
      useCompression: false
    })
    const jobs = await store.list()
    expect(jobs[0].id).toBe(second.id)
    expect(jobs[1].id).toBe(first.id)
  })

  it('never loses a job to a concurrent create() read-modify-write race', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const created = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        store.create({
          direction: 'send',
          peerId: 'peer-1',
          displayName: `file-${n}.txt`,
          itemCount: 1,
          useCompression: false
        })
      )
    )
    const jobs = await store.list()
    expect(jobs).toHaveLength(5)
    expect(new Set(jobs.map((job) => job.id))).toEqual(new Set(created.map((job) => job.id)))
  })

  it('never loses an update to a concurrent updateStatus() race on different jobs', async () => {
    const store = new LanShareTransferStore(join(dir, 'jobs.json'))
    const jobs = await Promise.all(
      [1, 2, 3].map((n) =>
        store.create({
          direction: 'send',
          peerId: 'peer-1',
          displayName: `file-${n}.txt`,
          itemCount: 1,
          useCompression: false
        })
      )
    )
    await Promise.all(jobs.map((job) => store.updateStatus(job.id, 'queued')))
    const all = await store.list()
    expect(all.every((job) => job.status === 'queued')).toBe(true)
  })
})
