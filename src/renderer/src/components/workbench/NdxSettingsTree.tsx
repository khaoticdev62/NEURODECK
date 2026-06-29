import type { ReactNode } from 'react'

export function NdxSettingsTree({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <nav
      aria-label="Settings categories"
      className="min-w-52 border-r border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tool-bg)] p-2"
    >
      {children}
    </nav>
  )
}
