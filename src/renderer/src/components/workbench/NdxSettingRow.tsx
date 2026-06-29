import type { ReactNode } from 'react'

export function NdxSettingRow({
  label,
  description,
  control
}: {
  label: string
  description?: string
  control: ReactNode
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border py-3">
      <div>
        <p className="text-body font-medium text-text-primary">{label}</p>
        {description && <p className="text-meta text-text-secondary">{description}</p>}
      </div>
      <div className="self-center">{control}</div>
    </div>
  )
}
