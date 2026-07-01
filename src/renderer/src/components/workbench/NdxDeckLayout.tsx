import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxDeckLayoutProps {
  left?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  mainClassName?: string
}

/**
 * Deck-first responsive workbench grid. At 1280x800 the main task surface
 * gets the width; docked displays progressively restore right and left rails.
 */
export function NdxDeckLayout({
  left,
  right,
  children,
  className,
  mainClassName
}: NdxDeckLayoutProps): React.JSX.Element {
  return (
    <div
      className={cn('ndx-deck-grid', className)}
      data-left={Boolean(left)}
      data-right={Boolean(right)}
    >
      {left && <div className="ndx-deck-grid-left">{left}</div>}
      <div className={cn('ndx-deck-grid-main', mainClassName)}>{children}</div>
      {right && <div className="ndx-deck-grid-right">{right}</div>}
    </div>
  )
}
