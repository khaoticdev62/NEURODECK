import type { LanShareTransferJob } from '@shared/contracts'
import type {
  CreateLanShareTransferJobOptions,
  LanShareTransferStore
} from './LanShareTransferStore'

export interface LanShareTransferQueueOptions {
  globalConcurrency?: number
  perPeerConcurrency?: number
}

/** Real dispatch hook — called once a job is admitted past both concurrency limits. Resolving/rejecting decides the job's next real state (`waiting-for-approval` or `failed`); this class never assumes success. */
export type LanShareTransferDispatcher = (job: LanShareTransferJob) => Promise<void>

const DEFAULT_GLOBAL_CONCURRENCY = 3
const DEFAULT_PER_PEER_CONCURRENCY = 1

/**
 * Real bounded transfer queue (spec §20 "Bound concurrency globally
 * and per peer", Phase LAN-5). A newly enqueued job is real-persisted
 * via `LanShareTransferStore` through `draft` → `preflighting` →
 * `queued`, then admitted to `negotiating` only when both the global
 * and per-peer concurrency limits allow it — never all at once
 * regardless of queue depth. The real dispatcher (announcing a
 * transfer via `LanShareTransferClient`) decides the next state; this
 * queue does not assume an announced transfer succeeds.
 */
export class LanShareTransferQueue {
  private readonly globalConcurrency: number
  private readonly perPeerConcurrency: number
  private activeGlobal = 0
  private readonly activeByPeer = new Map<string, number>()
  private readonly pending: LanShareTransferJob[] = []

  constructor(
    private readonly transferStore: LanShareTransferStore,
    private readonly dispatch: LanShareTransferDispatcher,
    options: LanShareTransferQueueOptions = {}
  ) {
    this.globalConcurrency = options.globalConcurrency ?? DEFAULT_GLOBAL_CONCURRENCY
    this.perPeerConcurrency = options.perPeerConcurrency ?? DEFAULT_PER_PEER_CONCURRENCY
  }

  async enqueue(options: CreateLanShareTransferJobOptions): Promise<LanShareTransferJob> {
    const job = await this.transferStore.create(options)
    await this.transferStore.updateStatus(job.id, 'preflighting')
    const queued = await this.transferStore.updateStatus(job.id, 'queued')
    this.pending.push(queued ?? job)
    this.pump()
    return queued ?? job
  }

  getActiveCount(): number {
    return this.activeGlobal
  }

  getActiveCountForPeer(peerId: string): number {
    return this.activeByPeer.get(peerId) ?? 0
  }

  private pump(): void {
    for (let i = 0; i < this.pending.length; ) {
      const job = this.pending[i]
      if (!this.hasCapacity(job.peerId)) {
        i += 1
        continue
      }
      this.pending.splice(i, 1)
      void this.admit(job)
    }
  }

  private hasCapacity(peerId: string): boolean {
    if (this.activeGlobal >= this.globalConcurrency) return false
    if ((this.activeByPeer.get(peerId) ?? 0) >= this.perPeerConcurrency) return false
    return true
  }

  private async admit(job: LanShareTransferJob): Promise<void> {
    this.activeGlobal += 1
    this.activeByPeer.set(job.peerId, (this.activeByPeer.get(job.peerId) ?? 0) + 1)

    const negotiating = await this.transferStore.updateStatus(job.id, 'negotiating', {
      startedAt: Date.now()
    })

    try {
      await this.dispatch(negotiating ?? job)
      await this.transferStore.updateStatus(job.id, 'waiting-for-approval')
    } catch (error) {
      await this.transferStore.updateStatus(job.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: Date.now()
      })
    } finally {
      this.activeGlobal -= 1
      this.activeByPeer.set(job.peerId, (this.activeByPeer.get(job.peerId) ?? 1) - 1)
      this.pump()
    }
  }
}
