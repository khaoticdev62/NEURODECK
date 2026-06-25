import { Outlet, useNavigate } from 'react-router-dom'
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
import { AgentToolExecutionBridge } from '../../features/agents/AgentToolExecutionBridge'
import { WorkspaceSwitcherOverlay } from '../../features/workspaces/WorkspaceSwitcherOverlay'
import { LockScreen } from '../../features/system/LockScreen'
import { PowerStateBridge } from '../../features/system/PowerStateBridge'
import { QuickAccessOverlay } from '../../features/system/QuickAccessOverlay'
import { ScreenNarrator } from '../../features/system/ScreenNarrator'
import { useDisplayMode } from '../../state/useDisplayMode'
import { useDisplaySettings } from '../../state/useDisplaySettings'
import { useLockState } from '../../state/useLockState'
import { useEffect } from 'react'

export interface ShellLayoutProps {
  systemRailStatus?: SystemRailStatus
  contextItem?: ContextPanelItem
}

/**
 * Default shell anatomy (wireframe §3.2): top system rail, primary nav rail,
 * active view, optional context panel, bottom controller rail. Focus and
 * split modes collapse the nav rail and context panel to maximize content
 * width (§3.3) — theater mode instead scales density via the
 * `data-display-mode` attribute consumed in tokens.css. ND-044's real
 * reduce-motion/high-contrast/text-scale overrides use the same
 * attribute-driven-CSS pattern via `data-reduce-motion`/`data-high-contrast`/
 * `data-text-size`. The Command Palette (ND-009), Activity/Notifications
 * overlay (ND-011/012), and Emergency Stop (ND-054) are global — always
 * mounted here, each managing its own open state via the controller action
 * stream, not via a prop passed down a route.
 */
export function ShellLayout({
  systemRailStatus = UNAVAILABLE_SYSTEM_RAIL_STATUS,
  contextItem
}: ShellLayoutProps): React.JSX.Element {
  const navigate = useNavigate()
  const { baseMode } = useDisplayMode()
  const { reduceMotion, highContrast, textScale } = useDisplaySettings()
  const { isLocked } = useLockState()
  const collapsesRails = baseMode === 'focus' || baseMode === 'split'

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== '/' || event.repeat) return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      navigate('/search')
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // Full takeover, same as Emergency Stop's queue-pause but for the whole
  // shell: no nav, no Command Palette, no overlays — only LockScreen itself
  // can clear `isLocked`, by verifying the real PIN against the main process.
  if (isLocked) {
    return <LockScreen />
  }

  return (
    <div
      data-display-mode={baseMode}
      data-reduce-motion={reduceMotion}
      data-high-contrast={highContrast}
      data-text-size={textScale}
      className="flex h-full flex-col bg-canvas"
    >
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
      <PowerStateBridge />
      <ScreenNarrator />
      <AgentToolExecutionBridge />
      <CommandPalette />
      <ActivityAndNotificationsOverlay />
      <EmergencyStopOverlay />
      <WorkspaceSwitcherOverlay />
      <QuickAccessOverlay />
      <FocusDebugOverlay />
    </div>
  )
}
