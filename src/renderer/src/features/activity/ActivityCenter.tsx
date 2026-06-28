import { useEffect, useState } from 'react'
import type { LanShareTransferJob } from '@shared/contracts'
import { EmptyState } from '../../components/feedback/UXState'
import {
  listLanShareTransferJobs,
  onLanShareTransferJobUpdate
} from '../../services/ipc/lanShareClient'

const CATEGORIES = [
  'Running',
  'Waiting for approval',
  'Completed',
  'Failed',
  'Paused',
  'Scheduled'
] as const

const TERMINAL_STATUSES = new Set(['completed', 'rejected', 'cancelled', 'failed', 'quarantined'])

function countActiveTransfers(jobs: LanShareTransferJob[]): number {
  return jobs.filter((job) => !TERMINAL_STATUSES.has(job.status)).length
}

/**
 * ND-011 Activity Center. LAN-8 wires the real LAN Share transfer job feed
 * into this existing platform surface. Other task sources stay honest until
 * their owning systems expose a shared activity model.
 */
export function ActivityCenter(): React.JSX.Element {
  const [lanShareJobs, setLanShareJobs] = useState<LanShareTransferJob[]>([])

  useEffect(() => {
    let active = true
    void listLanShareTransferJobs().then((result) => {
      if (active && result.ok) setLanShareJobs(result.data)
    })
    const unsubscribe = onLanShareTransferJobUpdate((jobs) => {
      if (active) setLanShareJobs(jobs)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const activeTransfers = countActiveTransfers(lanShareJobs)
  const completedTransfers = lanShareJobs.filter((job) => job.status === 'completed').length
  const failedTransfers = lanShareJobs.filter(
    (job) => job.status === 'failed' || job.status === 'quarantined'
  ).length
  const hasLanShareActivity = lanShareJobs.length > 0

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <span
            key={category}
            className="rounded-sm border border-border bg-surface-raised px-2 py-0.5 text-meta text-text-secondary"
          >
            {category} · 0
          </span>
        ))}
        <span className="rounded-sm border border-border bg-surface-raised px-2 py-0.5 text-meta text-text-secondary">
          LAN Share active · {activeTransfers}
        </span>
        <span className="rounded-sm border border-border bg-surface-raised px-2 py-0.5 text-meta text-text-secondary">
          LAN Share completed · {completedTransfers}
        </span>
      </div>

      {hasLanShareActivity ? (
        <section className="flex flex-col gap-2 rounded-sm border border-border bg-surface p-3">
          <p className="text-body font-semibold text-text-primary">LAN Share</p>
          <p className="text-meta text-text-secondary">
            {activeTransfers} active · {completedTransfers} completed · {failedTransfers} failed or
            quarantined
          </p>
          <ul className="flex flex-col gap-1">
            {lanShareJobs.slice(0, 5).map((job) => (
              <li key={job.id} className="text-meta text-text-secondary">
                {job.displayName} · {job.direction} · {job.status}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          className="flex-1"
          title="No activity yet"
          description="Running, paused, and completed tasks will appear here once agents, workflows, or LAN Share transfers exist."
        />
      )}
    </div>
  )
}
