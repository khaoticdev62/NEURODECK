import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxEditorTabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean
  dirty?: boolean
  children: ReactNode
}

export const NdxEditorTab = forwardRef<HTMLButtonElement, NdxEditorTabProps>(function NdxEditorTab(
  { active, dirty = false, children, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-[var(--ndx-workbench-tabbar-height)] min-w-28 items-center gap-1 border-r border-[var(--ndx-workbench-border)] px-3 text-meta',
        active
          ? 'bg-[var(--ndx-workbench-tab-active-bg)] text-text-primary'
          : 'bg-[var(--ndx-workbench-tab-inactive-bg)] text-text-secondary hover:bg-surface-raised',
        'focus-visible:shadow-[var(--ndx-workbench-focus-ring)]',
        className
      )}
      aria-pressed={active}
      {...rest}
    >
      {dirty && <span aria-label="Unsaved changes">●</span>}
      <span className="truncate">{children}</span>
    </button>
  )
})
