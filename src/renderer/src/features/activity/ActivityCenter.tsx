import { EmptyState } from '../../components/feedback/UXState'

const CATEGORIES = [
  'Running',
  'Waiting for approval',
  'Completed',
  'Failed',
  'Paused',
  'Scheduled'
] as const

/**
 * ND-011 Activity Center. Every category is genuinely empty today — there is
 * no action queue, agent runtime, or workflow engine yet (Epic 4/8 own
 * that). Showing the real categories with an honest empty state, rather than
 * fabricated task cards, is what "no invented urgency" (ND-008 recommendation
 * rules) means applied to this screen too.
 */
export function ActivityCenter(): React.JSX.Element {
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
      </div>
      <EmptyState
        className="flex-1"
        title="No activity yet"
        description="Running, paused, and completed tasks will appear here once agents and workflows exist (Epic 4/8)."
      />
    </div>
  )
}
