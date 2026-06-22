import { cn } from './cn'

export type StatusTone = 'info' | 'success' | 'warning' | 'error' | 'approval' | 'neutral'

export interface StatusBadgeProps {
  tone: StatusTone
  label: string
  className?: string
}

const TONE_CLASSES: Record<StatusTone, string> = {
  info: 'bg-status-info/15 text-status-info border-status-info/40',
  success: 'bg-status-success/15 text-status-success border-status-success/40',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/40',
  error: 'bg-status-error/15 text-status-error border-status-error/40',
  approval: 'bg-status-approval/15 text-status-approval border-status-approval/40',
  neutral: 'bg-surface-raised text-text-secondary border-border'
}

/**
 * Status is always reinforced with text, never color alone (spec §8.3).
 * `label` must be the actual status word ("Offline", "Restricted"), not a color name.
 */
export function StatusBadge({ tone, label, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-meta font-medium',
        TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
