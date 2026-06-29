import type { ReactNode } from 'react'
import { NdxFocusSurface } from './NdxFocusSurface'

export function NdxDenseRow({
  children,
  selected = false
}: {
  children: ReactNode
  selected?: boolean
}): React.JSX.Element {
  return (
    <NdxFocusSurface density="dense" selected={selected} className="px-2 py-1 text-meta">
      {children}
    </NdxFocusSurface>
  )
}
