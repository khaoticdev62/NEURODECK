import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type ControllerButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export interface ControllerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ControllerButtonVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<ControllerButtonVariant, string> = {
  primary: 'bg-status-info text-canvas hover:brightness-110',
  secondary: 'bg-surface-raised text-text-primary border border-border hover:border-border-strong',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-raised',
  destructive: 'bg-status-error text-canvas hover:brightness-110'
}

/**
 * The baseline focusable action control (mega-prompt §8.2 `ControllerButton`).
 * Real spatial-focus registration (focus graph, neighbor edges, haptics) is wired
 * in Epic 2 — this component only guarantees the visual/sizing contract for now.
 */
export function ControllerButton({
  variant = 'secondary',
  className,
  children,
  ...rest
}: ControllerButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors',
        'min-h-[var(--ndx-target-min)] [height:var(--ndx-button-height)]',
        'focus-visible:shadow-focus-bloom focus-visible:ring-2 focus-visible:ring-border-focus',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
