import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export type ControllerButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export interface ControllerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ControllerButtonVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<ControllerButtonVariant, string> = {
  primary:
    'ndx-inner-glow ndx-primary-glow border border-[var(--ndx-workbench-control-bg-active)] bg-[var(--ndx-workbench-control-bg-active)] text-[var(--ndx-workbench-control-text-active)] hover:brightness-110',
  secondary:
    'ndx-inner-glow border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-control-bg)] text-text-primary hover:border-[var(--ndx-workbench-border-active)] hover:bg-[var(--ndx-workbench-control-bg-hover)]',
  ghost:
    'border border-transparent bg-transparent text-text-primary hover:border-[var(--ndx-workbench-border-muted)] hover:bg-[var(--ndx-workbench-row-hover-bg)]',
  destructive: 'ndx-inner-glow border border-status-error bg-status-error text-canvas hover:brightness-110 hover:shadow-[0_0_24px_0_rgb(255_180_171_/_0.45)]'
}

/**
 * The baseline focusable action control (mega-prompt §8.2 `ControllerButton`).
 * Ref-forwarding so callers can register it with `useFocusable` (Epic 2's
 * Spatial Focus Engine) the same way a plain DOM element would be.
 */
export const ControllerButton = forwardRef<HTMLButtonElement, ControllerButtonProps>(
  function ControllerButton({ variant = 'secondary', className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-sm px-4 text-base font-medium transition-colors',
          'min-h-[var(--ndx-target-min)] [height:var(--ndx-button-height)]',
          'focus-visible:shadow-[var(--ndx-workbench-focus-ring)] focus-visible:outline-none',
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
)
