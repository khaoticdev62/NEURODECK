import type { ReactNode } from 'react'

export function NdxEditorShell({
  title,
  children
}: {
  title: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 flex-col border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-editor-bg)]">
      <div className="flex h-[var(--ndx-workbench-tabbar-height)] items-center border-b border-[var(--ndx-workbench-border)] px-3 text-meta text-text-secondary">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  )
}
