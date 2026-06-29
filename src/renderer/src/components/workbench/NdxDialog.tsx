import type { ReactNode } from 'react'
import { Modal } from '../overlays/Modal'

export interface NdxDialogProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function NdxDialog({ open, title, children, onClose }: NdxDialogProps): React.JSX.Element {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">{children}</div>
    </Modal>
  )
}
