import type { ReactNode } from 'react'
import { cn } from '../primitives/cn'

// Only real theme today — no light theme exists yet (see DisplayThemeSettings'
// "Appearance" section). Named as a constant rather than an inline literal so
// the `data-ndx-theme` attribute reads as an explicit choice, not a magic string.
const NDX_THEME = 'hybrid-dark'

export interface NdxWorkbenchProps {
  displayMode: string
  reduceMotion: boolean
  highContrast: boolean
  textSize: string
  accent: string
  radiusStyle: string
  density: string
  surfaceStyle: string
  focusStyle: string
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
  accent,
  radiusStyle,
  density,
  surfaceStyle,
  focusStyle,
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
      data-ndx-accent={accent}
      data-ndx-radius={radiusStyle}
      data-ndx-density={density}
      data-ndx-surface={surfaceStyle}
      data-ndx-focus-style={focusStyle}
      data-ndx-theme={NDX_THEME}
      className="grid h-full bg-canvas text-text-primary"
      style={{
        gridTemplateRows:
          'var(--ndx-workbench-titlebar-height) minmax(0, 1fr) auto var(--ndx-workbench-statusbar-height)'
      }}
    >
      {titleBar}
      <div
        data-collapse={collapseToolWindows}
        className={cn(
          'ndx-workbench-body grid min-h-0',
          collapseToolWindows && 'ndx-workbench-body-collapsed'
        )}
      >
        {activityBar}
        {!collapseToolWindows && <div className="ndx-workbench-primary">{primaryToolWindow}</div>}
        <main
          className="ndx-workbench-main min-h-0 min-w-0 overflow-auto bg-[var(--ndx-workbench-editor-bg)]"
          style={{ padding: 'var(--ndx-workbench-content-inset)' }}
        >
          {children}
        </main>
        {!collapseToolWindows && (
          <div className="ndx-workbench-secondary">{secondaryToolWindow}</div>
        )}
      </div>
      {bottomPanel}
      {statusBar}
    </div>
  )
}
