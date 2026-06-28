import { useEffect, useRef } from 'react'
import type { LanShareTransferJob } from '@shared/contracts'
import { useToast } from '../../components/overlays/useToast'
import {
  listLanShareTransferJobs,
  onLanShareTransferJobUpdate
} from '../../services/ipc/lanShareClient'

const TERMINAL_STATUSES = new Set(['completed', 'rejected', 'cancelled', 'failed', 'quarantined'])

function describeJob(job: LanShareTransferJob): string {
  const direction = job.direction === 'receive' ? 'from' : 'to'
  return `${job.displayName} ${direction} ${job.peerId}`
}

/**
 * LAN-8 platform integration bridge. This reuses the existing toast and
 * Notification Center history instead of creating a LAN-specific notifier.
 * It only reacts to real transfer job updates pushed by the LAN Share IPC
 * layer; initial state is seeded silently so persisted history is not
 * replayed as fresh activity on app launch.
 */
export function LanSharePlatformBridge(): React.JSX.Element {
  const { push } = useToast()
  const seenStatusesRef = useRef<Map<string, string>>(new Map())
  const pushRef = useRef(push)

  useEffect(() => {
    pushRef.current = push
  }, [push])

  useEffect(() => {
    let active = true

    void listLanShareTransferJobs().then((result) => {
      if (!active || !result.ok) return
      seenStatusesRef.current = new Map(result.data.map((job) => [job.id, job.status]))
    })

    const unsubscribe = onLanShareTransferJobUpdate((jobs) => {
      if (!active) return

      const previous = seenStatusesRef.current
      const next = new Map<string, string>()

      for (const job of jobs) {
        next.set(job.id, job.status)
        const previousStatus = previous.get(job.id)
        if (previousStatus === job.status) continue

        if (job.status === 'waiting-for-approval') {
          pushRef.current({
            category: 'approval-required',
            title: 'Incoming LAN Share approval required',
            description: describeJob(job)
          })
        } else if (job.status === 'completed' && previousStatus !== undefined) {
          pushRef.current({
            category: 'background-task-complete',
            title: 'LAN Share transfer completed',
            description: describeJob(job),
            durationMs: 5000
          })
        } else if (job.status === 'failed') {
          pushRef.current({
            category: 'error',
            title: 'LAN Share transfer failed',
            description: job.errorMessage ?? describeJob(job)
          })
        } else if (job.status === 'quarantined') {
          pushRef.current({
            category: 'warning',
            title: 'LAN Share item quarantined',
            description: job.errorMessage ?? describeJob(job)
          })
        } else if (TERMINAL_STATUSES.has(job.status) && previousStatus !== undefined) {
          pushRef.current({
            category: 'information',
            title: `LAN Share transfer ${job.status}`,
            description: describeJob(job),
            durationMs: 5000
          })
        }
      }

      seenStatusesRef.current = next
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return <></>
}
