import type { ControllerHintProps } from '../../components/navigation/ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from '../../components/navigation/defaultControllerHints'
import { EpicBoundaryPlaceholder } from './EpicBoundaryPlaceholder'

/**
 * Route registry (mega-prompt §11). Every route declares the metadata fields
 * the spec requires; fields owned by epics that haven't landed yet are
 * explicitly `undefined` rather than faked. `element` renders the real
 * screen once its owning epic builds it — for now it renders an honest
 * boundary placeholder naming the screen ID and owning epic.
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
}

export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    routeId: 'home',
    screenId: 'ND-008',
    path: '/',
    title: 'Home',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
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
    routeId: 'workspaces',
    screenId: 'ND-018',
    path: '/workspaces',
    title: 'Workspace Hub',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true
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
    restoreOnRevisit: true
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
  return (
    <EpicBoundaryPlaceholder
      title={route.title}
      screenId={route.screenId}
      owningEpic={route.owningEpic}
    />
  )
}
