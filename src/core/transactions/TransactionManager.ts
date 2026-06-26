import { randomUUID } from 'node:crypto'
import type { TransactionRecord } from '@shared/contracts'

export interface CreateTransactionOptions {
  kind: string
  label: string
  cancellable: boolean
}

/**
 * Epic X1 shared transaction framework (supplemental spec §7.5) — a
 * generic, in-memory lifecycle for any long-running, possibly destructive
 * operation a future epic needs (package install/update/remove, sync,
 * backup/restore). No real consumer exists yet in this slice; this is
 * the one real mechanism those epics extend instead of each inventing
 * their own ad hoc progress/cancel state machine, mirroring how
 * `ActionQueue` is the one real mechanism every tool invocation already
 * goes through. `onChange` mirrors `AuditLog`/`ActionQueue`'s existing
 * subscribe pattern so a future renderer Activity view can list live
 * transactions the same way it already lists actions.
 */
export class TransactionManager {
  private readonly records = new Map<string, TransactionRecord>()
  private readonly cancelHandlers = new Map<string, () => void>()
  private readonly listeners = new Set<() => void>()

  list(): TransactionRecord[] {
    return Array.from(this.records.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): TransactionRecord | undefined {
    return this.records.get(id)
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  create(options: CreateTransactionOptions, onCancel?: () => void): TransactionRecord {
    const now = Date.now()
    const record: TransactionRecord = {
      id: randomUUID(),
      kind: options.kind,
      label: options.label,
      status: 'pending',
      progressPercent: 0,
      cancellable: options.cancellable,
      createdAt: now,
      updatedAt: now
    }
    this.records.set(record.id, record)
    if (onCancel) this.cancelHandlers.set(record.id, onCancel)
    this.notify()
    return record
  }

  start(id: string): void {
    this.update(id, { status: 'running' })
  }

  progress(id: string, progressPercent: number, message?: string): void {
    this.update(id, { progressPercent: Math.min(100, Math.max(0, progressPercent)), message })
  }

  succeed(id: string, message?: string): void {
    this.resolve(id, 'succeeded', message)
  }

  fail(id: string, message: string): void {
    this.resolve(id, 'failed', message)
  }

  rollBack(id: string, message?: string): void {
    this.resolve(id, 'rolled-back', message)
  }

  /** Real cancellation: invokes the caller's own cancel hook (if one was given) before recording the terminal state — never just relabels a still-running operation as cancelled. */
  cancel(id: string): boolean {
    const record = this.records.get(id)
    if (!record || !record.cancellable) return false
    if (
      record.status === 'succeeded' ||
      record.status === 'failed' ||
      record.status === 'cancelled'
    ) {
      return false
    }
    this.cancelHandlers.get(id)?.()
    this.resolve(id, 'cancelled')
    return true
  }

  private resolve(id: string, status: TransactionRecord['status'], message?: string): void {
    const record = this.records.get(id)
    if (!record) return
    const now = Date.now()
    this.records.set(id, {
      ...record,
      status,
      message: message ?? record.message,
      progressPercent: status === 'succeeded' ? 100 : record.progressPercent,
      updatedAt: now,
      resolvedAt: now
    })
    this.cancelHandlers.delete(id)
    this.notify()
  }

  private update(id: string, patch: Partial<TransactionRecord>): void {
    const record = this.records.get(id)
    if (!record) return
    this.records.set(id, { ...record, ...patch, updatedAt: Date.now() })
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
