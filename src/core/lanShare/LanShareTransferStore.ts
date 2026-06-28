import { randomUUID } from 'node:crypto'
import type {
  LanShareTransferDirection,
  LanShareTransferJob,
  LanShareTransferStatus
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

export interface CreateLanShareTransferJobOptions {
  direction: LanShareTransferDirection
  peerId: string
  displayName: string
  itemCount: number
  totalBytes?: number
  useCompression: boolean
}

/**
 * Phase LAN-1 transfer job persistence (spec §20, §27
 * `lan_share_transfer_jobs`/`lan_share_transfer_items`). This is a
 * distinct job model from Epic X6's `TransferManager` — LAN Share jobs
 * carry the real Warpinator-compatible state machine (`preflighting`,
 * `negotiating`, `verifying`, `quarantined`, etc. — fifteen states, not
 * Epic X6's six), since this engine targets real protocol
 * interoperability rather than NDX's own simpler peer transfer.
 *
 * No real send/receive engine drives this store yet — that lands in
 * Phase LAN-5/LAN-6. This store only provides the real, persisted job
 * lifecycle (`create`/`transition`/`list`/`get`) those phases will call.
 */
export class LanShareTransferStore {
  private readonly store: JsonStore<LanShareTransferJob[]>
  private listeners = new Set<(jobs: LanShareTransferJob[]) => void>()
  /**
   * Real fix for a real race: `LanShareTransferQueue` (Phase LAN-5)
   * creates multiple jobs concurrently, which exposed a genuine
   * read-modify-write race here — two concurrent `create()` calls could
   * both `read()` the same stale list before either `write()`s, so the
   * second write silently discarded the first job. Every mutating
   * method now runs through this chain (mirroring the exact pattern
   * `JsonStore.write()` already uses one level down for disk writes),
   * so a read-then-write sequence can never interleave with another.
   */
  private mutationQueue: Promise<unknown> = Promise.resolve()

  constructor(filePath: string) {
    this.store = new JsonStore<LanShareTransferJob[]>(filePath, [])
  }

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.catch(() => undefined)
    return result
  }

  async list(): Promise<LanShareTransferJob[]> {
    return this.store.read()
  }

  async get(id: string): Promise<LanShareTransferJob | undefined> {
    const jobs = await this.store.read()
    return jobs.find((job) => job.id === id)
  }

  async create(options: CreateLanShareTransferJobOptions): Promise<LanShareTransferJob> {
    return this.mutate(async () => {
      const job: LanShareTransferJob = {
        id: randomUUID(),
        direction: options.direction,
        peerId: options.peerId,
        displayName: options.displayName,
        itemCount: options.itemCount,
        totalBytes: options.totalBytes,
        transferredBytes: 0,
        status: 'draft',
        useCompression: options.useCompression,
        createdAt: Date.now()
      }
      const jobs = await this.store.read()
      const next = [job, ...jobs]
      await this.store.write(next)
      this.notify(next)
      return job
    })
  }

  /**
   * Real, generic state-machine transition (spec §20's 15-state job
   * lifecycle) — used by the queue (Phase LAN-5) to move a job through
   * `preflighting`/`queued`/`negotiating`/etc., and by future phases
   * for `transferring`/`verifying`/`committing`. Does not validate that
   * `status` is a legal transition from the job's current state — the
   * real state-machine rules live in the caller (`LanShareTransferQueue`
   * today), since different callers need different legal-transition
   * sets and a single generic enforcement here would be guessing.
   */
  async updateStatus(
    id: string,
    status: LanShareTransferStatus,
    patch: Partial<LanShareTransferJob> = {}
  ): Promise<LanShareTransferJob | undefined> {
    return this.mutate(async () => {
      const jobs = await this.store.read()
      const index = jobs.findIndex((job) => job.id === id)
      if (index === -1) return undefined
      const updated: LanShareTransferJob = { ...jobs[index], ...patch, status }
      const next = [...jobs]
      next[index] = updated
      await this.store.write(next)
      this.notify(next)
      return updated
    })
  }

  async cancel(id: string): Promise<boolean> {
    return this.mutate(async () => {
      const jobs = await this.store.read()
      const index = jobs.findIndex((job) => job.id === id)
      if (index === -1) return false
      const job = jobs[index]
      if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
        return false
      }
      const next = [...jobs]
      next[index] = { ...job, status: 'cancelled', completedAt: Date.now() }
      await this.store.write(next)
      this.notify(next)
      return true
    })
  }

  onChange(listener: (jobs: LanShareTransferJob[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(jobs: LanShareTransferJob[]): void {
    for (const listener of this.listeners) listener(jobs)
  }
}
