import { EmptyState } from '../../components/feedback/UXState'

export interface EpicBoundaryPlaceholderProps {
  title: string
  screenId?: string
  owningEpic: string
}

/**
 * Honest placeholder for routes whose real screen hasn't been built yet.
 * Distinct from a "coming soon" feature shell: it states exactly which
 * screen ID and epic owns the real implementation, so it can never be
 * mistaken for completed work (mega-prompt §2.1, §2.5).
 */
export function EpicBoundaryPlaceholder({
  title,
  screenId,
  owningEpic
}: EpicBoundaryPlaceholderProps): React.JSX.Element {
  return (
    <EmptyState
      title={title}
      description={`${screenId ? `${screenId} — ` : ''}built in ${owningEpic}.`}
    />
  )
}
