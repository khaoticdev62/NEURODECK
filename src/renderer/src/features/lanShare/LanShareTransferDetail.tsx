import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LanShareTransferJob } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  acceptLanShareTransfer,
  cancelLanShareTransferJob,
  listLanShareTransferJobs,
  onLanShareTransferJobUpdate,
  rejectLanShareTransfer
} from '../../services/ipc/lanShareClient'

/** ND-LAN-008 Transfer Detail — real, live job state via the same push channel the list screen uses. */
export function LanShareTransferDetail(): React.JSX.Element {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<LanShareTransferJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void listLanShareTransferJobs().then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      setJob(result.data.find((candidate) => candidate.id === jobId) ?? null)
    })
    const unsubscribe = onLanShareTransferJobUpdate((jobs) => {
      if (!active) return
      const updated = jobs.find((candidate) => candidate.id === jobId)
      if (updated) setJob(updated)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [jobId])

  async function handleAccept(): Promise<void> {
    if (!jobId) return
    const result = await acceptLanShareTransfer({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  async function handleReject(): Promise<void> {
    if (!jobId) return
    const result = await rejectLanShareTransfer({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  async function handleCancel(): Promise<void> {
    if (!jobId) return
    const result = await cancelLanShareTransferJob({ id: jobId })
    if (!result.ok) setError(result.error.userMessage)
  }

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading transfer…</p>
  }
  if (!job) {
    return (
      <ErrorState
        title="Transfer not found"
        description="This transfer no longer exists."
        action={
          <ControllerButton variant="secondary" onClick={() => navigate('/lan-share/transfers')}>
            Back to Transfers
          </ControllerButton>
        }
      />
    )
  }

  const progressPercent = job.totalBytes
    ? Math.min(100, Math.round((job.transferredBytes / job.totalBytes) * 100))
    : null

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[20rem_minmax(40rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Transfer State" subtitle={job.status}>
        <div className="space-y-3 text-meta text-text-secondary">
          <p>
            {job.direction === 'send' ? 'Sending to' : 'Receiving from'} {job.peerId}
          </p>
          <p>
            {job.itemCount} item{job.itemCount === 1 ? '' : 's'} in this transfer.
          </p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Transfer Detail">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">{job.displayName}</p>
          {error && <ErrorState title="Transfer error" description={error} />}

          <section className="flex flex-col gap-1 border border-border bg-surface p-3">
            <p className="text-meta text-text-secondary">
              {job.direction === 'send' ? 'Sending to' : 'Receiving from'} {job.peerId}
            </p>
            <p className="text-meta text-text-secondary">
              Status: {job.status} · {job.itemCount} item{job.itemCount === 1 ? '' : 's'}
              {job.useCompression ? ' · compressed' : ''}
            </p>
            {progressPercent !== null && (
              <p className="text-meta text-text-secondary">
                {job.transferredBytes} / {job.totalBytes} bytes ({progressPercent}%)
              </p>
            )}
            {job.errorMessage && <p className="text-meta text-status-error">{job.errorMessage}</p>}
            <p className="text-meta text-text-tertiary">
              Created {new Date(job.createdAt).toLocaleString()}
              {job.startedAt ? ` · started ${new Date(job.startedAt).toLocaleString()}` : ''}
              {job.completedAt ? ` · finished ${new Date(job.completedAt).toLocaleString()}` : ''}
            </p>
          </section>

          <div className="flex gap-2">
            {job.status === 'waiting-for-approval' && (
              <>
                <ControllerButton variant="primary" onClick={() => void handleAccept()}>
                  Accept
                </ControllerButton>
                <ControllerButton variant="destructive" onClick={() => void handleReject()}>
                  Reject
                </ControllerButton>
              </>
            )}
            {job.status !== 'waiting-for-approval' &&
              job.status !== 'completed' &&
              job.status !== 'failed' &&
              job.status !== 'cancelled' &&
              job.status !== 'rejected' && (
                <ControllerButton variant="ghost" onClick={() => void handleCancel()}>
                  Cancel transfer
                </ControllerButton>
              )}
            <ControllerButton variant="secondary" onClick={() => navigate('/lan-share/transfers')}>
              Back to Transfers
            </ControllerButton>
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Action Policy" subtitle="Queue controlled" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Accept, reject, and cancel actions use the live transfer job state.</p>
          <p>The list route receives the same push-channel updates as this detail view.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
