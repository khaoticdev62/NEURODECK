import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CategoryTabStrip } from '../../components/navigation/CategoryTabStrip'
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
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { CoreToolsBootstrap } from '../../ai-safety/CoreToolsBootstrap'
import { FocusDebugOverlay } from '../../controller/testing/FocusDebugOverlay'
import { CommandPalette } from '../../features/command-palette/CommandPalette'
import { ActivityAndNotificationsOverlay } from '../../features/activity/ActivityAndNotificationsOverlay'
import { EmergencyStopOverlay } from '../../features/ai-canvas/EmergencyStopOverlay'
import { AgentToolExecutionBridge } from '../../features/agents/AgentToolExecutionBridge'
import { WorkspaceSwitcherOverlay } from '../../features/workspaces/WorkspaceSwitcherOverlay'
import { KioskExitOverlay } from '../../features/kiosk/KioskExitOverlay'
import { ShareSheetOverlay } from '../../features/shareSheet/ShareSheetOverlay'
import { DeckyNavigationBridge } from '../../features/system/DeckyNavigationBridge'
import { LockScreen } from '../../features/system/LockScreen'
import { PowerStateBridge } from '../../features/system/PowerStateBridge'
import { QuickAccessOverlay } from '../../features/system/QuickAccessOverlay'
import { ScreenNarrator } from '../../features/system/ScreenNarrator'
import { LanSharePlatformBridge } from '../../features/lanShare/LanSharePlatformBridge'
import { ContextHelpOverlay } from '../../features/help/ContextHelpOverlay'
import { saveSessionSnapshot } from '../../services/ipc/continuityClient'
import { listModelProviders } from '../../services/ipc/modelClient'
import { getProfileState } from '../../services/ipc/profileClient'
import type { ActiveModelProvider } from '../../components/workbench/NdxTitleBar'
import { useDisplayMode } from '../../state/useDisplayMode'
import { useDisplaySettings } from '../../state/useDisplaySettings'
import { useKioskMode } from '../../state/useKioskMode'
import { useLockState } from '../../state/useLockState'
import { useEffect, useState } from 'react'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

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
  const {
    reduceMotion,
    highContrast,
    textScale,
    accent,
    radiusStyle,
    density,
    surfaceStyle,
    focusStyle
  } = useDisplaySettings()
  const { isLocked } = useLockState()
  const { enabled: kioskEnabled, startRoutePath, isRouteAllowed } = useKioskMode()
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null)
  const [activeModelProvider, setActiveModelProvider] = useState<ActiveModelProvider | null>(null)
  const collapsesRails = baseMode === 'focus' || baseMode === 'split'

  const workbenchState = useWorkbenchStore()

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

  // TopNavBar model status badge: real enabled-provider lookup, never a
  // fabricated "Connected" claim — no live connection ping (would hit
  // cloud providers on a timer), just the provider's real configured state.
  useEffect(() => {
    let active = true
    void listModelProviders().then((result) => {
      if (!active || !result.ok) return
      const enabledProvider = result.data.find((provider) => provider.enabled)
      if (enabledProvider) {
        setActiveModelProvider({ name: enabledProvider.name, enabled: true })
      }
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

  // Epic X14 §46.2 "Allowlisted apps/routes" and "Restricted settings": a
  // disallowed navigation while kiosk mode is active redirects back to the
  // kiosk's configured start route rather than rendering the screen.
  useEffect(() => {
    if (kioskEnabled && !isRouteAllowed(location.pathname)) {
      navigate(startRoutePath, { replace: true })
    }
  }, [kioskEnabled, isRouteAllowed, location.pathname, navigate, startRoutePath])

  // Full takeover, same as Emergency Stop's queue-pause but for the whole
  // shell: no nav, no Command Palette, no overlays — only LockScreen itself
  // can clear `isLocked`, by verifying the real PIN against the main process.
  if (isLocked) {
    return <LockScreen />
  }

  const routeLabel = location.pathname === '/' ? 'Home' : location.pathname
  const routeGroup = getRouteGroup(location.pathname)
  const breadcrumb = buildBreadcrumb(location.pathname)
  const shellContextItem =
    contextItem ??
    ({
      title: routeLabel,
      status: routeGroup,
      metadata: [
        { label: 'Layer', value: 'Deck' },
        { label: 'Input', value: 'Pad' },
        { label: 'Review gate', value: 'On' }
      ]
    } satisfies ContextPanelItem)

  return (
    <NdxWorkbench
      displayMode={baseMode}
      reduceMotion={reduceMotion}
      highContrast={highContrast}
      textSize={textScale}
      accent={accent}
      radiusStyle={radiusStyle}
      density={density}
      surfaceStyle={surfaceStyle}
      focusStyle={focusStyle}
      collapseToolWindows={collapsesRails}
      titleBar={
        <NdxTitleBar
          status={systemRailStatus}
          activeProfileName={activeProfileName}
          breadcrumb={breadcrumb}
          activeModelProvider={activeModelProvider}
        />
      }
      activityBar={<NdxActivityBar hidden={collapsesRails} />}
      primaryToolWindow={
        <NdxToolWindow
          title={workbenchState.primaryTitle}
          ariaLabel="Primary Tool Window"
          subtitle={workbenchState.primarySubtitle ?? routeGroup}
        >
          {workbenchState.primaryContent ?? (
            <div className="flex flex-col gap-3">
              <div className="ndx-console-ruler" aria-hidden="true" />
              <div className="border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] p-3">
                <p className="text-meta uppercase tracking-wide text-text-tertiary">
                  Current screen
                </p>
                <p className="mt-1 truncate text-title font-semibold text-text-primary">
                  {routeLabel}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <NdxDenseRow selected>Layer: workbench</NdxDenseRow>
                <NdxDenseRow>Focus: controller grid</NdxDenseRow>
                <NdxDenseRow>Review: enabled</NdxDenseRow>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <ControllerButton
                  className="justify-start px-3"
                  variant="secondary"
                  onClick={() => navigate('/search')}
                >
                  Search workspace
                </ControllerButton>
                <ControllerButton
                  className="justify-start px-3"
                  variant="secondary"
                  onClick={() => navigate('/ai')}
                >
                  Ask AI
                </ControllerButton>
                <ControllerButton
                  className="justify-start px-3"
                  variant="ghost"
                  onClick={() => navigate('/system')}
                >
                  System status
                </ControllerButton>
              </div>
            </div>
          )}
        </NdxToolWindow>
      }
      secondaryToolWindow={
        workbenchState.secondaryContent ?? <ContextPanel hidden={false} item={shellContextItem} />
      }
      bottomPanel={<NdxBottomPanel />}
      statusBar={<NdxStatusBar routeTitle={routeLabel} controllerLayer="workbench" />}
    >
      <CategoryTabStrip />
      <Outlet />
      <CoreToolsBootstrap />
      <PowerStateBridge />
      <DeckyNavigationBridge />
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
      <KioskExitOverlay />
      <ShareSheetOverlay />
    </NdxWorkbench>
  )
}

/** TopNavBar breadcrumb: uppercase path segments, e.g. "/system/logs" -> ['SYSTEM', 'LOGS']. */
function buildBreadcrumb(pathname: string): string[] {
  if (pathname === '/') return ['HOME']
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replaceAll('-', ' ').toUpperCase())
}

function getRouteGroup(pathname: string): string {
  if (pathname === '/') return 'Home'
  if (pathname.startsWith('/ai')) return 'AI runtime'
  if (pathname.startsWith('/workspaces') || pathname.startsWith('/files')) return 'Workspace'
  if (pathname.startsWith('/terminal') || pathname.startsWith('/git')) return 'Developer tools'
  if (pathname.startsWith('/system') || pathname.startsWith('/settings')) return 'System'
  if (pathname.startsWith('/remote') || pathname.startsWith('/browser')) return 'Remote work'
  if (pathname.startsWith('/automations') || pathname.startsWith('/agents')) return 'Automation'
  return 'Workbench'
}
