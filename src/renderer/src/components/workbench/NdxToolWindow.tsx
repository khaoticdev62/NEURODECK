import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxToolWindowProps {
  title: string
  subtitle?: string
  side?: 'left' | 'right'
  children: ReactNode
}

export function NdxToolWindow({
  title,
  subtitle,
  side = 'left',
  children
}: NdxToolWindowProps): React.JSX.Element {
  return (
    <aside
      aria-label={title}
      className={cn(
        'flex min-h-0 flex-col border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tool-bg)]',
        side === 'left' ? 'border-r' : 'border-l'
      )}
    >
      <div className="border-b border-[var(--ndx-workbench-border)] px-3 py-2">
        <p className="text-meta font-semibold uppercase tracking-wide text-text-primary">{title}</p>
        {subtitle && <p className="truncate text-meta text-text-tertiary">{subtitle}</p>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">{children}</div>
    </aside>
  )
}
