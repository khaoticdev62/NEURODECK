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
      className="flex flex-col border-l border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tool-bg)] p-3"
      style={{ width: 'var(--ndx-context-panel-width)', zIndex: 'var(--ndx-z-context-panel)' }}
    >
      {item ? (
        <div className="flex flex-col gap-3">
          <div className="border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] p-3">
            <p className="text-meta uppercase tracking-wide text-text-tertiary">Context</p>
            <h3 className="mt-1 truncate text-title font-semibold text-text-primary">
              {item.title}
            </h3>
            {item.status && <p className="mt-1 text-meta text-text-secondary">{item.status}</p>}
          </div>
          {item.description && <p className="text-body text-text-secondary">{item.description}</p>}
          {item.metadata && item.metadata.length > 0 && (
            <dl className="flex flex-col border border-[var(--ndx-workbench-border)]">
              {item.metadata.map((entry) => (
                <div
                  key={entry.label}
                  className="flex justify-between gap-3 border-b border-[var(--ndx-workbench-border)] px-3 py-2 text-meta last:border-b-0"
                >
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
