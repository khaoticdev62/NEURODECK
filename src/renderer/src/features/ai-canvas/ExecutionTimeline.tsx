import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { EmptyState } from '../../components/feedback/UXState'
import { useActionQueueRecords } from '../../ai-safety/useActionQueueRecords'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import type { PlanStatus } from '../../ai-safety/contracts/plan'

const STATUS_TONE: Record<PlanStatus, StatusTone> = {
  'pending-approval': 'approval',
  approved: 'info',
  denied: 'error',
  queued: 'neutral',
  running: 'info',
  passed: 'success',
  failed: 'error',
  cancelled: 'neutral',
  'rolled-back': 'warning'
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  'pending-approval': 'Waiting for approval',
  approved: 'Approved',
  denied: 'Denied',
  queued: 'Queued',
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  'rolled-back': 'Rolled back'
}

/**
 * ND-014 AI Execution Timeline. Real: tracks the lifecycle of actions
 * actually submitted through `ActionQueue`. Today's only registered tool
 * runs synchronously and near-instantly, so "Running" is visible only
 * briefly — that's an honest property of the one real tool that exists,
 * not a simplification of the screen itself.
 */
export function ExecutionTimeline(): React.JSX.Element {
  const records = useActionQueueRecords()
  const { queue } = useAiSafety()

  if (records.length === 0) {
    return (
      <EmptyState
        title="No actions submitted yet"
        description="Run a tool from the Command Palette to see its execution lifecycle here."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {records
        .slice()
        .reverse()
        .map((record) => (
          <li key={record.action.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-body font-semibold text-text-primary">{record.action.operation}</p>
              <StatusBadge tone={STATUS_TONE[record.status]} label={STATUS_LABEL[record.status]} />
            </div>
            <p className="mt-1 text-meta text-text-secondary">Tool: {record.action.tool}</p>
            {record.resultMessage && (
              <p className="text-meta text-text-secondary">{record.resultMessage}</p>
            )}
            {(record.status === 'pending-approval' || record.status === 'queued') && (
              <ControllerButton
                variant="ghost"
                className="mt-2"
                onClick={() => queue.cancel(record.action.id)}
              >
                Cancel
              </ControllerButton>
            )}
          </li>
        ))}
    </ul>
  )
}
