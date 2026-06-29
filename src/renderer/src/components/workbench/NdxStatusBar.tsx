import { ControllerHint, type ControllerHintProps } from '../navigation/ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from '../navigation/defaultControllerHints'

export interface NdxStatusBarProps {
  routeTitle: string
  screenId?: string
  controllerLayer?: string
  primaryHints?: ControllerHintProps[]
}

export function NdxStatusBar({
  routeTitle,
  screenId,
  controllerLayer = 'workbench',
  primaryHints = DEFAULT_PRIMARY_HINTS
}: NdxStatusBarProps): React.JSX.Element {
  return (
    <footer
      role="contentinfo"
      className="flex items-center justify-between border-t border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-statusbar-bg)] px-[var(--ndx-safe-inset)]"
      style={{ zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex min-w-0 items-center gap-3 text-meta text-text-secondary">
        <span className="text-text-primary">{routeTitle}</span>
        {screenId && <span>{screenId}</span>}
        <span>Layer: {controllerLayer}</span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {primaryHints.slice(0, 6).map((hint) => (
          <ControllerHint key={hint.glyph} {...hint} />
        ))}
      </div>
    </footer>
  )
}
