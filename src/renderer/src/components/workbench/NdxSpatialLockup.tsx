import type { ReactNode } from 'react'
import { NdxFocusSurface } from './NdxFocusSurface'

export function NdxSpatialLockup({
  children,
  selected = false
}: {
  children: ReactNode
  selected?: boolean
}): React.JSX.Element {
  return (
    <NdxFocusSurface density="spatial" selected={selected} className="p-4">
      {children}
    </NdxFocusSurface>
  )
}
