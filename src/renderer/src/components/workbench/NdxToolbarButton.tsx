import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export const NdxToolbarButton = forwardRef<HTMLButtonElement, NdxToolbarButtonProps>(
  function NdxToolbarButton({ children, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-transparent px-2 text-meta text-text-secondary',
          'hover:border-border hover:bg-surface-raised hover:text-text-primary',
          'focus-visible:border-border-focus focus-visible:text-text-primary',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        {...rest}
      >
        {children}
      </button>
    )
  }
)
