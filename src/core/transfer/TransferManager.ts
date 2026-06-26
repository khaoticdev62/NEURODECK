import { randomUUID } from 'node:crypto'
import type { TransferEndpoint, TransferJob, TransferKind } from '@shared/contracts'

export interface CreateTransferJobOptions {
  kind: TransferKind
  source: TransferEndpoint
  destination: TransferEndpoint
  displayName: string
  totalBytes?: number
  resumable: boolean
}

/**
 * Real Epic X6 Download and Transfer Center primitive (supplemental
 * §18). Mirrors Epic X1's `TransactionManager` pattern (the one real
 * shared mechanism this codebase already uses for package transactions)
 * extended with the richer `TransferJob` fields §18.1 actually asks
 * for — byte progress, checksum, resumability. This pass's one real
 * consumer is LAN peer transfer (§19); model/package/extension/update
 * downloads already have their own real tracking elsewhere and are not
 * consolidated under this system in this pass — see the ledger.
 */
export class TransferManager {
  private readonly jobs = new Map<string, TransferJob>()
  private readonly cancelHandlers = new Map<string, () => void>()
  private readonly listeners = new Set<() => void>()

  list(): TransferJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): TransferJob | undefined {
    return this.jobs.get(id)
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  create(options: CreateTransferJobOptions, onCancel?: () => void): TransferJob {
    const now = Date.now()
    const job: TransferJob = {
      id: randomUUID(),
      kind: options.kind,
      source: options.source,
      destination: options.destination,
      displayName: options.displayName,
      totalBytes: options.totalBytes,
      transferredBytes: 0,
      status: 'queued',
      resumable: options.resumable,
      createdAt: now
    }
    this.jobs.set(job.id, job)
    if (onCancel) this.cancelHandlers.set(job.id, onCancel)
    this.notify()
    return job
  }

  start(id: string): void {
    this.update(id, { status: 'running', startedAt: Date.now() })
  }

  /** Real byte progress — never a fabricated percentage; callers report only bytes they actually transferred. */
  progress(id: string, transferredBytes: number): void {
    this.update(id, { transferredBytes })
  }

  pause(id: string): void {
    const job = this.jobs.get(id)
    if (!job || !job.resumable) return
    this.update(id, { status: 'paused' })
  }

  resume(id: string): void {
    const job = this.jobs.get(id)
    if (!job || job.status !== 'paused') return
    this.update(id, { status: 'running' })
  }

  succeed(id: string, checksum?: string): void {
    this.resolve(id, 'succeeded', { checksum })
  }

  fail(id: string, errorMessage: string): void {
    this.resolve(id, 'failed', { errorMessage })
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
      return false
    }
    this.cancelHandlers.get(id)?.()
    this.resolve(id, 'cancelled')
    return true
  }

  private resolve(
    id: string,
    status: TransferJob['status'],
    patch: Partial<TransferJob> = {}
  ): void {
    const job = this.jobs.get(id)
    if (!job) return
    this.jobs.set(id, {
      ...job,
      ...patch,
      status,
      transferredBytes:
        status === 'succeeded' ? (job.totalBytes ?? job.transferredBytes) : job.transferredBytes,
      completedAt: Date.now()
    })
    this.cancelHandlers.delete(id)
    this.notify()
  }

  private update(id: string, patch: Partial<TransferJob>): void {
    const job = this.jobs.get(id)
    if (!job) return
    this.jobs.set(id, { ...job, ...patch })
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
