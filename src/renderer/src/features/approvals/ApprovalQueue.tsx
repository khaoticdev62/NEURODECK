import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { EmptyState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useActionQueueRecords } from '../../ai-safety/useActionQueueRecords'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import type { RiskLevel } from '../../ai-safety/contracts/plan'

const RISK_TONE: Record<RiskLevel, StatusTone> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
}

/**
 * ND-015 Approval Queue. Real: every card here is a `HarnessActionRecord`
 * actually submitted through the `ActionQueue` (today, only by the user
 * invoking the one registered tool via the Command Palette — there is no
 * agent proposing actions yet, since no agent runtime exists until Epic 8).
 */
export function ApprovalQueue(): React.JSX.Element {
  const records = useActionQueueRecords()
  const { queue } = useAiSafety()
  const pending = records.filter((record) => record.status === 'pending-approval')

  if (pending.length === 0) {
    return (
      <EmptyState
        title="No approvals waiting"
        description="Actions that need your review before running will appear here."
      />
    )
  }

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[minmax(42rem,1fr)_20rem] gap-2 overflow-auto">
      <NdxEditorShell title="Approval Queue">
        <ul className="flex min-h-full min-w-0 flex-col gap-3 p-4">
          {pending.map((record) => (
            <li key={record.action.id} className="border border-border bg-surface p-4">
              <p className="text-body font-semibold text-text-primary">
                REQUEST: {record.action.operation}
              </p>
              <dl className="mt-2 flex flex-col gap-1 text-meta text-text-secondary">
                <Field
                  label="Requested by"
                  value={record.plan.createdBy === 'user' ? 'You' : record.plan.createdBy}
                />
                <Field label="Reason" value={record.plan.goal} />
                {typeof record.action.arguments.command === 'string' && (
                  <Field label="Exact command" value={record.action.arguments.command} />
                )}
                {typeof record.action.arguments.target === 'string' && (
                  <Field label="Target" value={record.action.arguments.target} />
                )}
                <Field label="Scope" value={record.action.scope.description} />
                <div className="flex items-center gap-2">
                  <dt className="text-text-tertiary">Risk</dt>
                  <dd>
                    <StatusBadge tone={RISK_TONE[record.action.risk]} label={record.action.risk} />
                  </dd>
                </div>
                <Field label="Reversible" value={record.action.reversible ? 'Yes' : 'No'} />
              </dl>
              <div className="mt-3 flex gap-2">
                <ControllerButton
                  variant="primary"
                  onClick={() => queue.approve(record.action.id, 'once')}
                >
                  Approve once
                </ControllerButton>
                <ControllerButton variant="ghost" onClick={() => queue.deny(record.action.id)}>
                  Deny
                </ControllerButton>
              </div>
            </li>
          ))}
        </ul>
      </NdxEditorShell>

      <NdxToolWindow title="Review Policy" subtitle={`${pending.length} pending`} side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Every item was submitted through the real ActionQueue.</p>
          <p>Approve once grants only this pending action; Deny leaves no execution path.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}
