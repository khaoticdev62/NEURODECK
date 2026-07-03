import type { ReactNode } from 'react'

export interface NdxTvShelfProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
}

/**
 * Horizontal, tvOS-style browsing row: a header with an optional
 * right-aligned action, then a horizontally scrolling track of cards.
 * Purely a layout primitive — it doesn't register focus itself, so any
 * `NdxTvCard` (or other focusable) placed inside keeps navigating through
 * the ordinary spatial focus engine. Scrolling the focused card into view
 * relies on the browser's native `scrollIntoView`-on-focus behavior, not a
 * custom scroll handler.
 */
export function NdxTvShelf({
  title,
  subtitle,
  icon,
  action,
  children
}: NdxTvShelfProps): React.JSX.Element {
  return (
    <section className="ndx-tv-backdrop flex min-w-0 flex-col gap-2 p-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="ndx-tv-card-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-text-primary">{title}</p>
            {subtitle && <p className="truncate text-meta text-text-tertiary">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="ndx-tv-shelf-track">{children}</div>
    </section>
  )
}
