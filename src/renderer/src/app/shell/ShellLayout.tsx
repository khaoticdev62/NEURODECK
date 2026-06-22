import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomControllerRail } from '../../components/navigation/BottomControllerRail'
import { ContextPanel, type ContextPanelItem } from '../../components/navigation/ContextPanel'
import { NavigationRail } from '../../components/navigation/NavigationRail'
import { SystemRail } from '../../components/navigation/SystemRail'
import {
  UNAVAILABLE_SYSTEM_RAIL_STATUS,
  type SystemRailStatus
} from '../../components/navigation/systemRailStatus'
import { useDisplayMode } from '../../state/useDisplayMode'
import { FocusDebugOverlay } from '../../controller/testing/FocusDebugOverlay'

export interface ShellLayoutProps {
  systemRailStatus?: SystemRailStatus
  contextItem?: ContextPanelItem
  /** Plugged in by the epic that owns the active overlay (quick overlay, command palette, ...). */
  overlayContent?: ReactNode
}

/**
 * Default shell anatomy (wireframe §3.2): top system rail, primary nav rail,
 * active view, optional context panel, bottom controller rail. Focus and
 * split modes collapse the nav rail and context panel to maximize content
 * width (§3.3) — theater mode instead scales density via the
 * `data-display-mode` attribute consumed in tokens.css.
 */
export function ShellLayout({
  systemRailStatus = UNAVAILABLE_SYSTEM_RAIL_STATUS,
  contextItem,
  overlayContent
}: ShellLayoutProps): React.JSX.Element {
  const { baseMode, overlayOpen } = useDisplayMode()
  const collapsesRails = baseMode === 'focus' || baseMode === 'split'

  return (
    <div data-display-mode={baseMode} className="flex h-full flex-col bg-canvas">
      <SystemRail status={systemRailStatus} />
      <div className="flex min-h-0 flex-1">
        <NavigationRail hidden={collapsesRails} />
        <main className="min-w-0 flex-1 overflow-auto" style={{ padding: 'var(--ndx-safe-inset)' }}>
          <Outlet />
        </main>
        <ContextPanel hidden={collapsesRails} item={contextItem} />
      </div>
      <BottomControllerRail />
      {overlayOpen && overlayContent}
      <FocusDebugOverlay />
    </div>
  )
}
