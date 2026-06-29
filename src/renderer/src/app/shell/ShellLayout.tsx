import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ContextPanel, type ContextPanelItem } from '../../components/navigation/ContextPanel'
import {
  UNAVAILABLE_SYSTEM_RAIL_STATUS,
  type SystemRailStatus
} from '../../components/navigation/systemRailStatus'
import {
  NdxActivityBar,
  NdxBottomPanel,
  NdxDenseRow,
  NdxStatusBar,
  NdxTitleBar,
  NdxToolWindow,
  NdxWorkbench
} from '../../components/workbench'
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
import { LanSharePlatformBridge } from '../../features/lanShare/LanSharePlatformBridge'
import { ContextHelpOverlay } from '../../features/help/ContextHelpOverlay'
import { saveSessionSnapshot } from '../../services/ipc/continuityClient'
import { getProfileState } from '../../services/ipc/profileClient'
import { useDisplayMode } from '../../state/useDisplayMode'
import { useDisplaySettings } from '../../state/useDisplaySettings'
import { useLockState } from '../../state/useLockState'
import { useEffect, useState } from 'react'

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
  const location = useLocation()
  const { baseMode } = useDisplayMode()
  const { reduceMotion, highContrast, textScale } = useDisplaySettings()
  const { isLocked } = useLockState()
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null)
  const collapsesRails = baseMode === 'focus' || baseMode === 'split'

  useEffect(() => {
    let active = true
    void getProfileState().then((result) => {
      if (!active || !result.ok) return
      const profile = result.data.profiles.find(
        (candidate) => candidate.id === result.data.session.activeProfileId
      )
      if (profile) setActiveProfileName(profile.name)
    })
    return () => {
      active = false
    }
  }, [])

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

  useEffect(() => {
    const route = `${location.pathname}${location.search}${location.hash}`
    void saveSessionSnapshot({ route })
  }, [location.hash, location.pathname, location.search])

  // Full takeover, same as Emergency Stop's queue-pause but for the whole
  // shell: no nav, no Command Palette, no overlays — only LockScreen itself
  // can clear `isLocked`, by verifying the real PIN against the main process.
  if (isLocked) {
    return <LockScreen />
  }

  const routeLabel = location.pathname === '/' ? 'Home' : location.pathname

  return (
    <NdxWorkbench
      displayMode={baseMode}
      reduceMotion={reduceMotion}
      highContrast={highContrast}
      textSize={textScale}
      collapseToolWindows={collapsesRails}
      titleBar={<NdxTitleBar status={systemRailStatus} activeProfileName={activeProfileName} />}
      activityBar={<NdxActivityBar hidden={collapsesRails} />}
      primaryToolWindow={
        <NdxToolWindow title="Primary Tool Window" subtitle="Workbench context">
          <div className="flex flex-col gap-2">
            <NdxDenseRow selected>Route: {routeLabel}</NdxDenseRow>
            <NdxDenseRow>Project tools migrate here in HYBRID-4.</NdxDenseRow>
            <NdxDenseRow>Use Activity Bar for primary destinations.</NdxDenseRow>
          </div>
        </NdxToolWindow>
      }
      secondaryToolWindow={<ContextPanel hidden={false} item={contextItem} />}
      bottomPanel={<NdxBottomPanel />}
      statusBar={<NdxStatusBar routeTitle={routeLabel} controllerLayer="workbench" />}
    >
      <Outlet />
      <CoreToolsBootstrap />
      <PowerStateBridge />
      <LanSharePlatformBridge />
      <ScreenNarrator />
      <AgentToolExecutionBridge />
      <ContextHelpOverlay />
      <CommandPalette />
      <ActivityAndNotificationsOverlay />
      <EmergencyStopOverlay />
      <WorkspaceSwitcherOverlay />
      <QuickAccessOverlay />
      <FocusDebugOverlay />
    </NdxWorkbench>
  )
}
