import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

export interface NdxWorkbenchProps {
  displayMode: string
  reduceMotion: boolean
  highContrast: boolean
  textSize: string
  titleBar: ReactNode
  activityBar: ReactNode
  primaryToolWindow?: ReactNode
  secondaryToolWindow?: ReactNode
  bottomPanel?: ReactNode
  statusBar: ReactNode
  children: ReactNode
  collapseToolWindows?: boolean
}

/**
 * HYBRID-3 foundation shell: canonical workbench regions without changing
 * any route's real IPC/data behavior. Feature screens still own their
 * content; this component only provides the VS Code/JetBrains/tvOS frame.
 */
export function NdxWorkbench({
  displayMode,
  reduceMotion,
  highContrast,
  textSize,
  titleBar,
  activityBar,
  primaryToolWindow,
  secondaryToolWindow,
  bottomPanel,
  statusBar,
  children,
  collapseToolWindows = false
}: NdxWorkbenchProps): React.JSX.Element {
  return (
    <div
      data-display-mode={displayMode}
      data-reduce-motion={reduceMotion}
      data-high-contrast={highContrast}
      data-text-size={textSize}
      data-ndx-theme="hybrid-dark"
      className="grid h-full bg-canvas text-text-primary"
      style={{
        gridTemplateRows:
          'var(--ndx-workbench-titlebar-height) minmax(0, 1fr) auto var(--ndx-workbench-statusbar-height)'
      }}
    >
      {titleBar}
      <div
        className={cn(
          'grid min-h-0',
          collapseToolWindows
            ? 'grid-cols-[var(--ndx-workbench-activitybar-width)_minmax(0,1fr)]'
            : 'grid-cols-[var(--ndx-workbench-activitybar-width)_var(--ndx-workbench-primary-width)_minmax(0,1fr)_var(--ndx-workbench-secondary-width)]'
        )}
      >
        {activityBar}
        {!collapseToolWindows && primaryToolWindow}
        <main
          className="min-h-0 min-w-0 overflow-auto bg-[var(--ndx-workbench-editor-bg)]"
          style={{ padding: 'var(--ndx-workbench-content-inset)' }}
        >
          {children}
        </main>
        {!collapseToolWindows && secondaryToolWindow}
      </div>
      {bottomPanel}
      {statusBar}
    </div>
  )
}
