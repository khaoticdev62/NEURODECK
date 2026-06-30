import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LanShareTransferJob } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  acceptLanShareTransfer,
  cancelLanShareTransferJob,
  listLanShareTransferJobs,
  onLanShareTransferJobUpdate,
  rejectLanShareTransfer
} from '../../services/ipc/lanShareClient'

const TERMINAL_STATUSES = new Set(['completed', 'rejected', 'cancelled', 'failed', 'quarantined'])

/**
 * ND-LAN-007 Active Transfers, folding in ND-LAN-006 Incoming Transfer
 * Approval (accept/reject act directly on real `waiting-for-approval`
 * jobs below — there is no separate modal, since the real state machine
 * already requires explicit confirmation before any byte moves) and
 * ND-LAN-009 Transfer History (terminal-status jobs stay listed rather
 * than disappearing). ND-LAN-023 Conflict Resolver has no user-facing
 * step here: the real receive engine already never silently replaces a
 * file (it picks a real conflict-safe name automatically), so there is
 * no decision left for the user to make.
 */
export function LanShareTransfers(): React.JSX.Element {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<LanShareTransferJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void listLanShareTransferJobs().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) setJobs(result.data)
      else setError(result.error.userMessage)
    })
    const unsubscribe = onLanShareTransferJobUpdate((next) => {
      if (active) setJobs(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const active = jobs.filter((job) => !TERMINAL_STATUSES.has(job.status))
  const history = jobs.filter((job) => TERMINAL_STATUSES.has(job.status))

  async function handleAccept(jobId: string): Promise<void> {
    const result = await acceptLanShareTransfer({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  async function handleReject(jobId: string): Promise<void> {
    const result = await rejectLanShareTransfer({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  async function handleCancel(jobId: string): Promise<void> {
    const result = await cancelLanShareTransferJob({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[20rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Transfer Queues" subtitle={`${active.length} active`}>
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Active, approval, and terminal jobs come from the real LAN Share transfer queue.</p>
          <p>{history.length} terminal-status transfers are retained as history.</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Transfer Monitor">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-title font-semibold text-text-primary">Transfers</p>
            <ControllerButton variant="primary" onClick={() => navigate('/lan-share/send')}>
              Send files
            </ControllerButton>
          </div>

          {error && <ErrorState title="Transfers error" description={error} />}

          {loading ? (
            <p className="text-meta text-text-secondary">Loading transfers…</p>
          ) : jobs.length === 0 ? (
            <EmptyState
              className="flex-1"
              title="No transfers yet"
              description="Sent and received files will appear here."
            />
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <p className="text-body font-semibold text-text-primary">Active</p>
                {active.length === 0 ? (
                  <p className="text-meta text-text-secondary">Nothing in progress.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {active.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onOpen={() => navigate(`/lan-share/transfers/${job.id}`)}
                        onAccept={() => void handleAccept(job.id)}
                        onReject={() => void handleReject(job.id)}
                        onCancel={() => void handleCancel(job.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-2 overflow-auto">
                <p className="text-body font-semibold text-text-primary">History</p>
                {history.length === 0 ? (
                  <p className="text-meta text-text-secondary">No completed transfers yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {history.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onOpen={() => navigate(`/lan-share/transfers/${job.id}`)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Approval Policy" subtitle="Explicit" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Incoming jobs require accept or reject while waiting for approval.</p>
          <p>Conflict-safe receive names are chosen by the real receive engine.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}

function JobCard({
  job,
  onOpen,
  onAccept,
  onReject,
  onCancel
}: {
  job: LanShareTransferJob
  onOpen: () => void
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `lan-share-transfer:${job.id}`,
    groupId: 'lan-share-transfers',
    onActivate: onOpen
  })

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`border p-3 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <p className="text-body font-semibold text-text-primary">{job.displayName}</p>
      <p className="text-meta text-text-secondary">
        {job.direction === 'send' ? 'Sending to' : 'Receiving from'} {job.peerId} · {job.status}
        {job.totalBytes ? ` · ${job.transferredBytes}/${job.totalBytes} bytes` : ''}
      </p>
      {job.errorMessage && <p className="text-meta text-status-error">{job.errorMessage}</p>}
      <div className="mt-2 flex gap-2">
        {job.status === 'waiting-for-approval' && onAccept && onReject && (
          <>
            <ControllerButton variant="primary" onClick={onAccept}>
              Accept
            </ControllerButton>
            <ControllerButton variant="destructive" onClick={onReject}>
              Reject
            </ControllerButton>
          </>
        )}
        {onCancel && job.status !== 'waiting-for-approval' && (
          <ControllerButton variant="ghost" onClick={onCancel}>
            Cancel
          </ControllerButton>
        )}
        <ControllerButton variant="secondary" onClick={onOpen}>
          Details
        </ControllerButton>
      </div>
    </li>
  )
}
