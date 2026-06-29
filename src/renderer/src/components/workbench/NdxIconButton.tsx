import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
}

export const NdxIconButton = forwardRef<HTMLButtonElement, NdxIconButtonProps>(
  function NdxIconButton({ label, icon, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-sm border border-transparent text-text-secondary',
          'hover:border-border hover:bg-surface-raised hover:text-text-primary',
          'focus-visible:border-border-focus focus-visible:text-text-primary',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        {...rest}
      >
        {icon}
      </button>
    )
  }
)
