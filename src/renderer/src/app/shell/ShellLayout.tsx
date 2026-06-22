import { Outlet } from 'react-router-dom'
import { BottomControllerRail } from '../../components/navigation/BottomControllerRail'
import { ContextPanel, type ContextPanelItem } from '../../components/navigation/ContextPanel'
import { NavigationRail } from '../../components/navigation/NavigationRail'
import { SystemRail } from '../../components/navigation/SystemRail'
import {
  UNAVAILABLE_SYSTEM_RAIL_STATUS,
  type SystemRailStatus
} from '../../components/navigation/systemRailStatus'
import { CoreToolsBootstrap } from '../../ai-safety/CoreToolsBootstrap'
import { FocusDebugOverlay } from '../../controller/testing/FocusDebugOverlay'
import { CommandPalette } from '../../features/command-palette/CommandPalette'
import { ActivityAndNotificationsOverlay } from '../../features/activity/ActivityAndNotificationsOverlay'
import { EmergencyStopOverlay } from '../../features/ai-canvas/EmergencyStopOverlay'
import { WorkspaceSwitcherOverlay } from '../../features/workspaces/WorkspaceSwitcherOverlay'
import { useDisplayMode } from '../../state/useDisplayMode'

export interface ShellLayoutProps {
  systemRailStatus?: SystemRailStatus
  contextItem?: ContextPanelItem
}

/**
 * Default shell anatomy (wireframe §3.2): top system rail, primary nav rail,
 * active view, optional context panel, bottom controller rail. Focus and
 * split modes collapse the nav rail and context panel to maximize content
 * width (§3.3) — theater mode instead scales density via the
 * `data-display-mode` attribute consumed in tokens.css. The Command Palette
 * (ND-009), Activity/Notifications overlay (ND-011/012), and Emergency Stop
 * (ND-054) are global — always mounted here, each managing its own open
 * state via the controller action stream, not via a prop passed down a route.
 */
export function ShellLayout({
  systemRailStatus = UNAVAILABLE_SYSTEM_RAIL_STATUS,
  contextItem
}: ShellLayoutProps): React.JSX.Element {
  const { baseMode } = useDisplayMode()
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
      <CoreToolsBootstrap />
      <CommandPalette />
      <ActivityAndNotificationsOverlay />
      <EmergencyStopOverlay />
      <WorkspaceSwitcherOverlay />
      <FocusDebugOverlay />
    </div>
  )
}
