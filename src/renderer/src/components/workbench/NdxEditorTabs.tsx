import type { ReactNode } from 'react'

export function NdxEditorTabs({
  children,
  actions
}: {
  children: ReactNode
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-[var(--ndx-workbench-tabbar-height)] items-center justify-between border-b border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tab-inactive-bg)]">
      <div className="flex min-w-0 gap-1 overflow-x-auto px-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2 px-2">{actions}</div>}
    </div>
  )
}
