import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxFocusSurfaceProps {
  density?: 'dense' | 'comfortable' | 'spatial'
  selected?: boolean
  active?: boolean
  children: ReactNode
  className?: string
}

export function NdxFocusSurface({
  density = 'comfortable',
  selected = false,
  active = false,
  children,
  className
}: NdxFocusSurfaceProps): React.JSX.Element {
  return (
    <div
      data-focus-density={density}
      data-selected={selected}
      data-active={active}
      className={cn('ndx-focus-surface', className)}
    >
      {children}
    </div>
  )
}
