import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

export type NdxNotificationTone = 'info' | 'success' | 'warning' | 'error' | 'approval'

const TONE_CLASS: Record<NdxNotificationTone, string> = {
  info: 'border-status-info',
  success: 'border-status-success',
  warning: 'border-status-warning',
  error: 'border-status-error',
  approval: 'border-status-approval'
}

export function NdxNotification({
  tone = 'info',
  title,
  children
}: {
  tone?: NdxNotificationTone
  title: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'border-l-2 bg-surface-raised px-3 py-2 text-meta shadow-elevated',
        TONE_CLASS[tone]
      )}
    >
      <p className="font-semibold text-text-primary">{title}</p>
      {children && <div className="mt-1 text-text-secondary">{children}</div>}
    </section>
  )
}
