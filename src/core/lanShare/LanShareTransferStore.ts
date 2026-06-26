import { randomUUID } from 'node:crypto'
import type { LanShareTransferDirection, LanShareTransferJob } from '@shared/contracts'
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

  constructor(filePath: string) {
    this.store = new JsonStore<LanShareTransferJob[]>(filePath, [])
  }

  async list(): Promise<LanShareTransferJob[]> {
    return this.store.read()
  }

  async get(id: string): Promise<LanShareTransferJob | undefined> {
    const jobs = await this.store.read()
    return jobs.find((job) => job.id === id)
  }

  async create(options: CreateLanShareTransferJobOptions): Promise<LanShareTransferJob> {
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
    await this.store.write([job, ...jobs])
    this.notify(await this.store.read())
    return job
  }

  async cancel(id: string): Promise<boolean> {
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
  }

  onChange(listener: (jobs: LanShareTransferJob[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(jobs: LanShareTransferJob[]): void {
    for (const listener of this.listeners) listener(jobs)
  }
}
