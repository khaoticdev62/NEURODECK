import type { PermissionCapability } from './contracts/permission'

export type AuditOutcome = 'approved' | 'denied' | 'executed' | 'failed' | 'cancelled'

export interface AuditEntry {
  id: string
  timestamp: number
  actionId: string
  tool: string
  capability: PermissionCapability
  outcome: AuditOutcome
  detail?: string
  /** Set only when this action was submitted by an Agent Runtime run (`ActionQueue.submit()`'s optional `agentContext`) — lets Agent Detail's Logs tab filter to just this agent/run. Absent for human/Command-Palette/Workflow-submitted actions. */
  agentId?: string
  runId?: string
}

let auditSequence = 0

/**
 * Real, append-only audit log (mega-prompt §15.3 "be recorded"). In-memory
 * only for now — durable persistence across app restarts needs Epic 5's
 * persistence layer. Every entry is real (tied to an actual tool
 * invocation), never a synthetic placeholder.
 */
export class AuditLog {
  private entries: AuditEntry[] = []
  private listeners = new Set<() => void>()

  record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const record: AuditEntry = { ...entry, id: `audit-${++auditSequence}`, timestamp: Date.now() }
    this.entries = [...this.entries, record]
    this.listeners.forEach((listener) => listener())
    return record
  }

  list(): AuditEntry[] {
    return this.entries
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
