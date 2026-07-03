import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { useToast } from '../../components/overlays/useToast'
import type { ToastCategory } from '../../components/overlays/toastContext'

const CATEGORY_TONE: Record<ToastCategory, StatusTone> = {
  information: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  'approval-required': 'approval',
  'background-task-complete': 'success'
}

const CATEGORY_LABEL: Record<ToastCategory, string> = {
  information: 'Information',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  'approval-required': 'Approval required',
  'background-task-complete': 'Task complete'
}

/**
 * ND-012 Notification Center. Extends the real Toast system (Epic 1) with a
 * persistent history and per-category muting — both genuinely affect
 * behavior (muted categories stop producing ephemeral toasts; history
 * survives dismissal). There are no notifications yet only because nothing
 * in the app has generated one — the surface itself is fully real.
 */
export function NotificationCenter(): React.JSX.Element {
  const { history, mutedCategories, muteCategory, unmuteCategory } = useToast()

  if (history.length === 0) {
    return (
      <EmptyState
        title="No notifications yet"
        description="Task updates, approvals, warnings, and system events will appear here as they happen."
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_LABEL) as ToastCategory[]).map((category) => {
          const muted = mutedCategories.has(category)
          return (
            <ControllerButton
              key={category}
              variant={muted ? 'ghost' : 'secondary'}
              onClick={() => (muted ? unmuteCategory(category) : muteCategory(category))}
            >
              {muted ? `Unmute ${CATEGORY_LABEL[category]}` : `Mute ${CATEGORY_LABEL[category]}`}
            </ControllerButton>
          )
        })}
      </div>
      <ul className="flex flex-col gap-2">
        {history
          .slice()
          .reverse()
          .map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 rounded-md ndx-settings-section">
              <StatusBadge
                tone={CATEGORY_TONE[entry.category]}
                label={CATEGORY_LABEL[entry.category]}
              />
              <div>
                <p className="text-body text-text-primary">
                  {entry.title}
                  {entry.count > 1 ? ` (${entry.count})` : ''}
                </p>
                {entry.description && (
                  <p className="text-meta text-text-secondary">{entry.description}</p>
                )}
              </div>
            </li>
          ))}
      </ul>
    </div>
  )
}
