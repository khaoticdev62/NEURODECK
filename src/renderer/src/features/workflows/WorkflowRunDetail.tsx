import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { WorkflowRun, WorkflowStepRun } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxDenseRow, NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { listWorkflowRuns } from '../../services/ipc/workflowClient'
import { useWorkflowRunner } from '../../workflows/useWorkflowRunner'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

const STATUS_LABEL: Record<WorkflowStepRun['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  'waiting-for-approval': 'Waiting for approval',
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  cancelled: 'Cancelled'
}

/**
 * ND-034 Workflow Run Detail, scoped to Timeline + Approvals — the two
 * tabs with real data. Inputs/Outputs are folded into Timeline (each
 * step's real result message) rather than a separate tab, since this
 * slice's steps don't have rich structured inputs/outputs beyond what
 * the timeline already shows. Logs (needs structured per-step log
 * capture beyond a result message), Recovery (no workflow tool-action
 * in this slice performs a file write, so there is nothing to link to a
 * `RecoveryCheckpoint` yet), and Metrics (no performance instrumentation)
 * are deferred. Retry failed node/Skip optional node/Re-run from
 * checkpoint/Export report are deferred — they need per-step retry
 * semantics and a report format this slice doesn't define.
 */
export function WorkflowRunDetail(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const { runId } = useParams<{ runId: string }>()

  if (!runId) {
    return (
      <EmptyState
        title="Workflow run not found"
        description="Open a run from the Workflow Library."
      />
    )
  }

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="view workflow runs" />
  }

  return (
    <WorkflowRunDetailWorkspace
      key={`${activeWorkspace.id}:${runId}`}
      workspaceId={activeWorkspace.id}
      runId={runId}
    />
  )
}

function WorkflowRunDetailWorkspace({
  workspaceId,
  runId
}: {
  workspaceId: string
  runId: string
}): React.JSX.Element {
  const { liveRuns, resolveApproval, cancelRun } = useWorkflowRunner()
  const [persistedRun, setPersistedRun] = useState<WorkflowRun | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listWorkflowRuns({ workspaceId }).then((result) => {
      if (!active) return
      if (result.ok) {
        setPersistedRun(result.data.find((candidate) => candidate.id === runId) ?? null)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId, runId])

  const run = liveRuns[runId] ?? persistedRun

  const pendingApproval = run?.steps.find((step) => step.status === 'waiting-for-approval')
  const completedSteps = run?.steps.filter((step) => step.status === 'passed').length ?? 0
  const failedSteps = run?.steps.filter((step) => step.status === 'failed').length ?? 0

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    if (!run) return
    setPrimary('Run Summary', run.status, (
      <NdxToolWindow title="Run Summary" subtitle={run.status}>
        <p className="text-body font-semibold text-text-primary">Run {run.id.slice(0, 8)}</p>
        <p className="text-meta text-text-secondary">Status: {run.status}</p>
        <p className="text-meta text-text-secondary">Workflow {run.workflowId}</p>
        <p className="break-all text-meta text-text-tertiary">Workspace {workspaceId}</p>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Progress</p>
          <p className="text-meta text-text-tertiary">
            {completedSteps} passed, {failedSteps} failed, {run?.steps.length ?? 0} total.
          </p>
        </div>
      </NdxToolWindow>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [run, workspaceId, completedSteps, failedSteps, setPrimary])

  useEffect(() => {
    if (!run) return
    setSecondary(
      <NdxToolWindow
        title="Run Actions"
        subtitle={pendingApproval ? 'Approval pending' : 'No approval'}
        side="right"
      >
        {run.status === 'running' ? (
          <ControllerButton variant="ghost" onClick={() => cancelRun(run.id)}>
            Cancel
          </ControllerButton>
        ) : (
          <p className="text-meta text-text-tertiary">
            Cancel is available only while a run is active.
          </p>
        )}
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Real data scope</p>
          <p className="text-meta text-text-tertiary">
            Timeline and approvals come from live WorkflowRunner state first, then persisted
            workflow runs through typed IPC.
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Deferred tabs</p>
          <p className="text-meta text-text-tertiary">
            Rich logs, recovery checkpoints, metrics, retry, and export remain deferred until real
            backing data exists.
          </p>
        </div>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [run, pendingApproval, cancelRun, setSecondary])

  if (error) return <ErrorState title="Couldn't load this run" description={error} />
  if (!run) return <p className="p-4 text-meta text-text-secondary">Loading...</p>

  return (
    <div className="h-full flex-1">
      <NdxEditorShell title="Workflow Run Detail">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {pendingApproval && (
            <div className="flex items-center justify-between ndx-settings-section">
              <p className="text-meta text-text-primary">A step is waiting for your approval.</p>
              <div className="flex gap-2">
                <ControllerButton variant="primary" onClick={() => resolveApproval(run.id, true)}>
                  Approve
                </ControllerButton>
                <ControllerButton variant="ghost" onClick={() => resolveApproval(run.id, false)}>
                  Reject
                </ControllerButton>
              </div>
            </div>
          )}

          <section className="min-h-0 flex-1 overflow-auto">
            <p className="mb-1 text-meta font-semibold text-text-primary">Timeline</p>
            {run.steps.length === 0 ? (
              <EmptyState title="No steps have run yet" />
            ) : (
              <ol className="flex flex-col gap-2">
                {run.steps.map((step) => (
                  <li key={step.stepId}>
                    <NdxDenseRow>
                      <p className="text-meta text-text-primary">
                        {step.stepId} · {STATUS_LABEL[step.status]}
                      </p>
                      {step.message && (
                        <p className="text-meta text-text-tertiary">{step.message}</p>
                      )}
                    </NdxDenseRow>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </NdxEditorShell>
    </div>
  )
}
