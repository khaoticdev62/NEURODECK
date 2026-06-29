import type { ReactNode } from 'react'

export function NdxTerminalFrame({
  modeBar,
  sessionList,
  toolbar,
  children
}: {
  modeBar: ReactNode
  sessionList: ReactNode
  toolbar: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 flex-col border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)]">
      {modeBar ? (
        <div className="flex items-center gap-2 border-b border-[var(--ndx-workbench-border)] bg-surface-raised/40 px-3 py-2">
          {modeBar}
        </div>
      ) : null}
      <div
        className={
          sessionList
            ? 'grid min-h-0 flex-1 grid-cols-[15rem_minmax(0,1fr)] overflow-hidden'
            : 'flex min-h-0 flex-1 overflow-hidden'
        }
      >
        {sessionList}
        <div className="flex min-h-0 min-w-0 flex-col">
          {toolbar}
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </section>
  )
}
