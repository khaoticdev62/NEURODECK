import type { ControllerHintProps } from '../../components/navigation/ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from '../../components/navigation/defaultControllerHints'
import { ControllerCalibration } from '../../features/onboarding/ControllerCalibration'
import { FirstRunWelcome } from '../../features/onboarding/FirstRunWelcome'
import { HomeCommandCenter } from '../../features/home/HomeCommandCenter'
import { ExecutionTimeline } from '../../features/ai-canvas/ExecutionTimeline'
import { ApprovalQueue } from '../../features/approvals/ApprovalQueue'
import { GitControlCenter } from '../../features/git/GitControlCenter'
import { FileManager } from '../../features/workspaces/FileManager'
import { WorkspaceDetail } from '../../features/workspaces/WorkspaceDetail'
import { WorkspaceHub } from '../../features/workspaces/WorkspaceHub'
import { EpicBoundaryPlaceholder } from './EpicBoundaryPlaceholder'

/**
 * Route registry (mega-prompt §11). Every route declares the metadata fields
 * the spec requires; fields owned by epics that haven't landed yet are
 * explicitly `undefined` rather than faked. `element`, when provided, is the
 * real screen; otherwise an honest boundary placeholder names the screen ID
 * and owning epic until that epic builds it.
 */
export interface RouteDefinition {
  routeId: string
  screenId?: string
  path: string
  title: string
  owningEpic: string
  /** Capability gate — unset until Epic 4's permission broker exists. */
  requiredCapability?: string
  /** Spatial-focus initial target — unset until Epic 2's focus engine exists. */
  initialFocusTarget?: string
  controllerHints: ControllerHintProps[]
  /** Whether to restore scroll/focus position when revisiting (spec §11 "Restoration behavior"). */
  restoreOnRevisit: boolean
  element?: React.JSX.Element
}

export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    routeId: 'home',
    screenId: 'ND-008',
    path: '/',
    title: 'Home',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <HomeCommandCenter />
  },
  {
    routeId: 'onboarding-welcome',
    screenId: 'ND-003',
    path: '/onboarding/welcome',
    title: 'Welcome',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: <FirstRunWelcome />
  },
  {
    routeId: 'onboarding-calibration',
    screenId: 'ND-004',
    path: '/onboarding/calibration',
    title: 'Controller Calibration',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: <ControllerCalibration />
  },
  {
    routeId: 'ai',
    screenId: 'ND-013',
    path: '/ai',
    title: 'AI Command Canvas',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'ai-timeline',
    screenId: 'ND-014',
    path: '/ai/timeline',
    title: 'AI Execution Timeline',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <ExecutionTimeline />
  },
  {
    routeId: 'ai-approvals',
    screenId: 'ND-015',
    path: '/ai/approvals',
    title: 'Approval Queue',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <ApprovalQueue />
  },
  {
    routeId: 'workspaces',
    screenId: 'ND-018',
    path: '/workspaces',
    title: 'Workspace Hub',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <WorkspaceHub />
  },
  {
    routeId: 'workspaces-detail',
    screenId: 'ND-019',
    path: '/workspaces/detail',
    title: 'Workspace Detail',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <WorkspaceDetail />
  },
  {
    routeId: 'build',
    screenId: 'ND-021',
    path: '/build',
    title: 'Build Studio',
    owningEpic: 'Epic 7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'files',
    screenId: 'ND-026',
    path: '/files',
    title: 'File Manager',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <FileManager />
  },
  {
    routeId: 'git',
    screenId: 'ND-025',
    path: '/git',
    title: 'Git Control Center',
    owningEpic: 'Epic 6',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: <GitControlCenter />
  },
  {
    routeId: 'terminal',
    screenId: 'ND-028',
    path: '/terminal',
    title: 'Universal Terminal',
    owningEpic: 'Epic 6',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'browser',
    screenId: 'ND-030',
    path: '/browser',
    title: 'Browser Hub',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'automations',
    screenId: 'ND-032',
    path: '/automations',
    title: 'Workflow Library',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'models',
    screenId: 'ND-035',
    path: '/models',
    title: 'Model Control Center',
    owningEpic: 'Epic 9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'learn',
    screenId: 'ND-038',
    path: '/learn',
    title: 'Learning Hub',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  },
  {
    routeId: 'system',
    screenId: 'ND-042',
    path: '/system',
    title: 'System Dashboard',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
  }
]

export function renderRouteElement(route: RouteDefinition): React.JSX.Element {
  if (route.element) return route.element
  return (
    <EpicBoundaryPlaceholder
      title={route.title}
      screenId={route.screenId}
      owningEpic={route.owningEpic}
    />
  )
}
