import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

interface UXStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

function UXStateBase({
  title,
  description,
  icon,
  action,
  className
}: UXStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 px-8 py-12 text-center',
        className
      )}
    >
      {icon}
      <p className="text-title font-semibold text-text-primary">{title}</p>
      {description && <p className="max-w-md text-meta text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}

/** Required whenever a view, list, or panel has nothing to show yet (spec: every surface needs an empty state). */
export function EmptyState(props: UXStateProps): React.JSX.Element {
  return <UXStateBase {...props} />
}

/** Required whenever a real operation fails — never silently swallow the error. */
export function ErrorState(props: UXStateProps): React.JSX.Element {
  return <UXStateBase {...props} className={cn('text-status-error', props.className)} />
}

/** Required whenever a feature depends on connectivity that is currently unavailable. */
export function OfflineState(props: UXStateProps): React.JSX.Element {
  return <UXStateBase {...props} />
}

/** Required whenever the current profile/permission set blocks a view (never silently hide — explain why). */
export function RestrictedState(props: UXStateProps): React.JSX.Element {
  return <UXStateBase {...props} />
}
