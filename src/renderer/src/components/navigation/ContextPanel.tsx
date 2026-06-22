import type { ReactNode } from 'react'
import { EmptyState } from '../feedback/UXState'

export interface ContextPanelItem {
  title: string
  status?: string
  description?: string
  metadata?: Array<{ label: string; value: string }>
  actions?: ReactNode
}

export interface ContextPanelProps {
  hidden?: boolean
  item?: ContextPanelItem
}

/**
 * Context Panel (wireframe §6.5) — explains or extends the focused item,
 * never duplicates the main view. AI suggestions, permissions, related items,
 * and recent activity sections are added by the epics that own that data
 * (Epic 4 AI runtime, Epic 8 agents, Epic 5 workspaces) rather than stubbed
 * here with placeholder content.
 */
export function ContextPanel({
  hidden = false,
  item
}: ContextPanelProps): React.JSX.Element | null {
  if (hidden) return null

  return (
    <aside
      aria-label="Context"
      className="flex flex-col border-l border-border bg-surface p-4"
      style={{ width: 'var(--ndx-context-panel-width)', zIndex: 'var(--ndx-z-context-panel)' }}
    >
      {item ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-title font-semibold text-text-primary">{item.title}</h3>
          {item.status && <p className="text-meta text-text-secondary">{item.status}</p>}
          {item.description && <p className="text-body text-text-secondary">{item.description}</p>}
          {item.metadata && item.metadata.length > 0 && (
            <dl className="flex flex-col gap-1">
              {item.metadata.map((entry) => (
                <div key={entry.label} className="flex justify-between text-meta">
                  <dt className="text-text-tertiary">{entry.label}</dt>
                  <dd className="text-text-primary">{entry.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.actions}
        </div>
      ) : (
        <EmptyState title="Nothing focused" description="Focus an item to see details here." />
      )}
    </aside>
  )
}
