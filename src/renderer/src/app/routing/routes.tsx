import { lazy, Suspense } from 'react'
import type { ControllerHintProps } from '../../components/navigation/ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from '../../components/navigation/defaultControllerHints'
import { BootSessionStart } from '../../features/onboarding/BootSessionStart'
import { HomeCommandCenter } from '../../features/home/HomeCommandCenter'
import { EpicBoundaryPlaceholder } from './EpicBoundaryPlaceholder'

/**
 * Route-level code splitting (mega-prompt §33 performance budgets): every
 * screen below is loaded on demand, not bundled into the initial entry
 * chunk. `HomeCommandCenter` and `BootSessionStart` are the two exceptions —
 * both are on the universal cold-boot path (boot always renders first;
 * returning users land on Home immediately after), so lazy-loading them
 * would only add a guaranteed Suspense flash to the most common launch path
 * with no real benefit. `BootSessionStart` is also imported directly (and
 * eagerly) by `RouterRoot.tsx` for the real `/boot` route — its `import`
 * here exists only for this file's route-metadata catalog (Global Search,
 * Command Palette).
 */
const GlobalSearch = lazy(async () => {
  const module = await import('../../features/search/GlobalSearch')
  return { default: module.GlobalSearch }
})
const FirstRunWelcome = lazy(async () => {
  const module = await import('../../features/onboarding/FirstRunWelcome')
  return { default: module.FirstRunWelcome }
})
const AIProviderSetup = lazy(async () => {
  const module = await import('../../features/onboarding/AIProviderSetup')
  return { default: module.AIProviderSetup }
})
const WorkspaceDiscovery = lazy(async () => {
  const module = await import('../../features/onboarding/WorkspaceDiscovery')
  return { default: module.WorkspaceDiscovery }
})
const ControllerCalibration = lazy(async () => {
  const module = await import('../../features/onboarding/ControllerCalibration')
  return { default: module.ControllerCalibration }
})
const GuidedControllerTutorial = lazy(async () => {
  const module = await import('../../features/onboarding/GuidedControllerTutorial')
  return { default: module.GuidedControllerTutorial }
})
const AICommandCanvas = lazy(async () => {
  const module = await import('../../features/ai-canvas/AICommandCanvas')
  return { default: module.AICommandCanvas }
})
const ExecutionTimeline = lazy(async () => {
  const module = await import('../../features/ai-canvas/ExecutionTimeline')
  return { default: module.ExecutionTimeline }
})
const ApprovalQueue = lazy(async () => {
  const module = await import('../../features/approvals/ApprovalQueue')
  return { default: module.ApprovalQueue }
})
const WorkspaceHub = lazy(async () => {
  const module = await import('../../features/workspaces/WorkspaceHub')
  return { default: module.WorkspaceHub }
})
const WorkspaceDetail = lazy(async () => {
  const module = await import('../../features/workspaces/WorkspaceDetail')
  return { default: module.WorkspaceDetail }
})
const BuildStudio = lazy(async () => {
  const module = await import('../../features/build-studio/BuildStudio')
  return { default: module.BuildStudio }
})
const FileManager = lazy(async () => {
  const module = await import('../../features/workspaces/FileManager')
  return { default: module.FileManager }
})
const GitControlCenter = lazy(async () => {
  const module = await import('../../features/git/GitControlCenter')
  return { default: module.GitControlCenter }
})
const UniversalTerminal = lazy(async () => {
  const module = await import('../../features/terminal/UniversalTerminal')
  return { default: module.UniversalTerminal }
})
const CommandBuilder = lazy(async () => {
  const module = await import('../../features/terminal/CommandBuilder')
  return { default: module.CommandBuilder }
})
const BrowserHub = lazy(async () => {
  const module = await import('../../features/browser/BrowserHub')
  return { default: module.BrowserHub }
})
const BrowserView = lazy(async () => {
  const module = await import('../../features/browser/BrowserView')
  return { default: module.BrowserView }
})
const WorkflowLibrary = lazy(async () => {
  const module = await import('../../features/workflows/WorkflowLibrary')
  return { default: module.WorkflowLibrary }
})
const WorkflowForge = lazy(async () => {
  const module = await import('../../features/workflows/WorkflowForge')
  return { default: module.WorkflowForge }
})
const WorkflowRunDetail = lazy(async () => {
  const module = await import('../../features/workflows/WorkflowRunDetail')
  return { default: module.WorkflowRunDetail }
})
const ModelControlCenter = lazy(async () => {
  const module = await import('../../features/models/ModelControlCenter')
  return { default: module.ModelControlCenter }
})
const ModelDetail = lazy(async () => {
  const module = await import('../../features/models/ModelDetail')
  return { default: module.ModelDetail }
})
const RoutingProfiles = lazy(async () => {
  const module = await import('../../features/models/RoutingProfiles')
  return { default: module.RoutingProfiles }
})
const AgentOperationsCenter = lazy(async () => {
  const module = await import('../../features/agents/AgentOperationsCenter')
  return { default: module.AgentOperationsCenter }
})
const AgentDetail = lazy(async () => {
  const module = await import('../../features/agents/AgentDetail')
  return { default: module.AgentDetail }
})
const LearningHub = lazy(async () => {
  const module = await import('../../features/learning/LearningHub')
  return { default: module.LearningHub }
})
const GuidedLab = lazy(async () => {
  const module = await import('../../features/learning/GuidedLab')
  return { default: module.GuidedLab }
})
const RemoteSystems = lazy(async () => {
  const module = await import('../../features/remote/RemoteSystems')
  return { default: module.RemoteSystems }
})
const RemoteSession = lazy(async () => {
  const module = await import('../../features/remote/RemoteSession')
  return { default: module.RemoteSession }
})
const LanShareHome = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareHome')
  return { default: module.LanShareHome }
})
const LanShareNearbyDevices = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareNearbyDevices')
  return { default: module.LanShareNearbyDevices }
})
const LanShareDeviceDetail = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareDeviceDetail')
  return { default: module.LanShareDeviceDetail }
})
const LanShareSendComposer = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareSendComposer')
  return { default: module.LanShareSendComposer }
})
const LanShareTransfers = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareTransfers')
  return { default: module.LanShareTransfers }
})
const LanShareTransferDetail = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareTransferDetail')
  return { default: module.LanShareTransferDetail }
})
const LanShareSettings = lazy(async () => {
  const module = await import('../../features/lanShare/LanShareSettings')
  return { default: module.LanShareSettings }
})
const SystemDashboard = lazy(async () => {
  const module = await import('../../features/system/SystemDashboard')
  return { default: module.SystemDashboard }
})
const ControllerSettings = lazy(async () => {
  const module = await import('../../features/system/ControllerSettings')
  return { default: module.ControllerSettings }
})
const DisplayThemeSettings = lazy(async () => {
  const module = await import('../../features/system/DisplayThemeSettings')
  return { default: module.DisplayThemeSettings }
})
const PrivacyPermissions = lazy(async () => {
  const module = await import('../../features/system/PrivacyPermissions')
  return { default: module.PrivacyPermissions }
})
const NetworkAndVpn = lazy(async () => {
  const module = await import('../../features/system/NetworkAndVpn')
  return { default: module.NetworkAndVpn }
})
const Updates = lazy(async () => {
  const module = await import('../../features/system/Updates')
  return { default: module.Updates }
})
const PowerMenu = lazy(async () => {
  const module = await import('../../features/system/PowerMenu')
  return { default: module.PowerMenu }
})
const AboutDiagnostics = lazy(async () => {
  const module = await import('../../features/system/AboutDiagnostics')
  return { default: module.AboutDiagnostics }
})
const ErrorRecovery = lazy(async () => {
  const module = await import('../../features/system/ErrorRecovery')
  return { default: module.ErrorRecovery }
})
const Integrations = lazy(async () => {
  const module = await import('../../features/system/Integrations')
  return { default: module.Integrations }
})
const ExtensionManager = lazy(async () => {
  const module = await import('../../features/extensions/ExtensionManager')
  return { default: module.ExtensionManager }
})
const RecoveryTimeline = lazy(async () => {
  const module = await import('../../features/recovery/RecoveryTimeline')
  return { default: module.RecoveryTimeline }
})
const StorageAndRecovery = lazy(async () => {
  const module = await import('../../features/recovery/StorageAndRecovery')
  return { default: module.StorageAndRecovery }
})
const BackupAndRestore = lazy(async () => {
  const module = await import('../../features/backup/BackupAndRestore')
  return { default: module.BackupAndRestore }
})
const DevicePeripheralCenter = lazy(async () => {
  const module = await import('../../features/devices/DevicePeripheralCenter')
  return { default: module.DevicePeripheralCenter }
})
const Vault = lazy(async () => {
  const module = await import('../../features/vault/Vault')
  return { default: module.Vault }
})
const PrivacyDataMap = lazy(async () => {
  const module = await import('../../features/privacy/PrivacyDataMap')
  return { default: module.PrivacyDataMap }
})
const Profiles = lazy(async () => {
  const module = await import('../../features/profiles/Profiles')
  return { default: module.Profiles }
})
const ContinuityCenter = lazy(async () => {
  const module = await import('../../features/continuity/ContinuityCenter')
  return { default: module.ContinuityCenter }
})
const BluetoothDevices = lazy(async () => {
  const module = await import('../../features/devices/BluetoothDevices')
  return { default: module.BluetoothDevices }
})
const AudioMicrophoneCenter = lazy(async () => {
  const module = await import('../../features/devices/AudioMicrophoneCenter')
  return { default: module.AudioMicrophoneCenter }
})
const DisplayDockCenter = lazy(async () => {
  const module = await import('../../features/devices/DisplayDockCenter')
  return { default: module.DisplayDockCenter }
})
const RemovableStorageCenter = lazy(async () => {
  const module = await import('../../features/devices/RemovableStorageCenter')
  return { default: module.RemovableStorageCenter }
})
const ResourceGovernor = lazy(async () => {
  const module = await import('../../features/resource/ResourceGovernor')
  return { default: module.ResourceGovernor }
})
const AIWorkloadScheduler = lazy(async () => {
  const module = await import('../../features/resource/AIWorkloadScheduler')
  return { default: module.AIWorkloadScheduler }
})
const SchedulerTriggers = lazy(async () => {
  const module = await import('../../features/resource/SchedulerTriggers')
  return { default: module.SchedulerTriggers }
})
const HelpHub = lazy(async () => {
  const module = await import('../../features/help/HelpHub')
  return { default: module.HelpHub }
})
const GuidedTroubleshooter = lazy(async () => {
  const module = await import('../../features/troubleshooter/GuidedTroubleshooter')
  return { default: module.GuidedTroubleshooter }
})
const ScreenshotCenter = lazy(async () => {
  const module = await import('../../features/screenshot/ScreenshotCenter')
  return { default: module.ScreenshotCenter }
})
const PresentationModeSettingsScreen = lazy(async () => {
  const module = await import('../../features/presentation/PresentationModeSettingsScreen')
  return { default: module.PresentationModeSettingsScreen }
})
const NotificationPolicyScreen = lazy(async () => {
  const module = await import('../../features/notifications/NotificationPolicyScreen')
  return { default: module.NotificationPolicyScreen }
})
const RecordingCenter = lazy(async () => {
  const module = await import('../../features/recording/RecordingCenter')
  return { default: module.RecordingCenter }
})
const ApplicationPolicyCenter = lazy(async () => {
  const module = await import('../../features/applications/ApplicationPolicyCenter')
  return { default: module.ApplicationPolicyCenter }
})
const KioskModeSettings = lazy(async () => {
  const module = await import('../../features/kiosk/KioskModeSettings')
  return { default: module.KioskModeSettings }
})
const TrustedPublishers = lazy(async () => {
  const module = await import('../../features/extensions/TrustedPublishers')
  return { default: module.TrustedPublishers }
})
const ToolLibrary = lazy(async () => {
  const module = await import('../../features/tools/ToolLibrary')
  return { default: module.ToolLibrary }
})
const VoiceNotesCenter = lazy(async () => {
  const module = await import('../../features/voice/VoiceNotesCenter')
  return { default: module.VoiceNotesCenter }
})
const PlatformHealthOverview = lazy(async () => {
  const module = await import('../../features/system/PlatformHealthOverview')
  return { default: module.PlatformHealthOverview }
})

function withSuspense(label: string, element: React.JSX.Element): React.JSX.Element {
  return (
    <Suspense fallback={<p className="p-4 text-meta text-text-secondary">Loading {label}…</p>}>
      {element}
    </Suspense>
  )
}

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
    routeId: 'global-search',
    screenId: 'ND-010',
    path: '/search',
    title: 'Global Search',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('search', <GlobalSearch />)
  },
  {
    routeId: 'onboarding-welcome',
    screenId: 'ND-003',
    path: '/onboarding/welcome',
    title: 'Welcome',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('welcome', <FirstRunWelcome />)
  },
  {
    routeId: 'onboarding-provider-setup',
    screenId: 'ND-005',
    path: '/onboarding/providers',
    title: 'AI Provider Setup',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('provider setup', <AIProviderSetup />)
  },
  {
    routeId: 'onboarding-workspace-discovery',
    screenId: 'ND-006',
    path: '/onboarding/workspaces',
    title: 'Workspace Discovery',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('workspace discovery', <WorkspaceDiscovery />)
  },
  {
    routeId: 'onboarding-calibration',
    screenId: 'ND-004',
    path: '/onboarding/calibration',
    title: 'Controller Calibration',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('calibration', <ControllerCalibration />)
  },
  {
    routeId: 'onboarding-tutorial',
    screenId: 'ND-007',
    path: '/onboarding/tutorial',
    title: 'Guided Controller Tutorial',
    owningEpic: 'Epic 3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('tutorial', <GuidedControllerTutorial />)
  },
  {
    routeId: 'boot',
    screenId: 'ND-001',
    path: '/boot',
    title: 'Boot and Session Start',
    owningEpic: 'Epic 3',
    controllerHints: [{ glyph: 'B', label: 'Return to SteamOS' }],
    restoreOnRevisit: false,
    element: <BootSessionStart />
  },
  {
    routeId: 'ai',
    screenId: 'ND-013',
    path: '/ai',
    title: 'AI Command Canvas',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('AI Command Canvas', <AICommandCanvas />)
  },
  {
    routeId: 'ai-timeline',
    screenId: 'ND-014',
    path: '/ai/timeline',
    title: 'AI Execution Timeline',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('execution timeline', <ExecutionTimeline />)
  },
  {
    routeId: 'ai-approvals',
    screenId: 'ND-015',
    path: '/ai/approvals',
    title: 'Approval Queue',
    owningEpic: 'Epic 4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('approval queue', <ApprovalQueue />)
  },
  {
    routeId: 'workspaces',
    screenId: 'ND-018',
    path: '/workspaces',
    title: 'Workspace Hub',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workspaces', <WorkspaceHub />)
  },
  {
    routeId: 'workspaces-detail',
    screenId: 'ND-019',
    path: '/workspaces/detail',
    title: 'Workspace Detail',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workspace', <WorkspaceDetail />)
  },
  {
    routeId: 'build',
    screenId: 'ND-021',
    path: '/build',
    title: 'Build Studio',
    owningEpic: 'Epic 7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('Build Studio', <BuildStudio />)
  },
  {
    routeId: 'files',
    screenId: 'ND-026',
    path: '/files',
    title: 'File Manager',
    owningEpic: 'Epic 5',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('file manager', <FileManager />)
  },
  {
    routeId: 'git',
    screenId: 'ND-025',
    path: '/git',
    title: 'Git Control Center',
    owningEpic: 'Epic 6',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('Git Control Center', <GitControlCenter />)
  },
  {
    routeId: 'terminal',
    screenId: 'ND-028',
    path: '/terminal',
    title: 'Universal Terminal',
    owningEpic: 'Epic 6',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('terminal', <UniversalTerminal />)
  },
  {
    routeId: 'terminal-command-builder',
    screenId: 'ND-029',
    path: '/terminal/builder',
    title: 'Command Builder',
    owningEpic: 'Epic 6',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('builder', <CommandBuilder />)
  },
  {
    routeId: 'browser',
    screenId: 'ND-030',
    path: '/browser',
    title: 'Browser Hub',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('browser', <BrowserHub />)
  },
  {
    routeId: 'browser-view',
    screenId: 'ND-031',
    path: '/browser/:tabId',
    title: 'Browser View',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('browser', <BrowserView />)
  },
  {
    routeId: 'automations',
    screenId: 'ND-032',
    path: '/automations',
    title: 'Workflow Library',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workflows', <WorkflowLibrary />)
  },
  {
    routeId: 'automations-forge-new',
    screenId: 'ND-033',
    path: '/automations/forge',
    title: 'Workflow Forge',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workflow forge', <WorkflowForge />)
  },
  {
    routeId: 'automations-forge-edit',
    screenId: 'ND-033',
    path: '/automations/forge/:workflowId',
    title: 'Workflow Forge',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workflow forge', <WorkflowForge />)
  },
  {
    routeId: 'automations-run-detail',
    screenId: 'ND-034',
    path: '/automations/runs/:runId',
    title: 'Workflow Run Detail',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('workflow run', <WorkflowRunDetail />)
  },
  {
    routeId: 'models',
    screenId: 'ND-035',
    path: '/models',
    title: 'Model Control Center',
    owningEpic: 'Epic 9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('models', <ModelControlCenter />)
  },
  {
    routeId: 'model-detail',
    screenId: 'ND-036',
    path: '/models/:providerId',
    title: 'Model Detail',
    owningEpic: 'Epic 9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('model', <ModelDetail />)
  },
  {
    routeId: 'model-routing-profiles',
    screenId: 'ND-037',
    path: '/models/routing-profiles',
    title: 'Routing Profiles',
    owningEpic: 'Epic 9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('routing profiles', <RoutingProfiles />)
  },
  {
    routeId: 'agents',
    screenId: 'ND-016',
    path: '/agents',
    title: 'Agent Operations Center',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('agents', <AgentOperationsCenter />)
  },
  {
    routeId: 'agent-detail',
    screenId: 'ND-017',
    path: '/agents/:agentId',
    title: 'Agent Detail',
    owningEpic: 'Epic 8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('agent', <AgentDetail />)
  },
  {
    routeId: 'learn',
    screenId: 'ND-038',
    path: '/learn',
    title: 'Learning Hub',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('learning hub', <LearningHub />)
  },
  {
    routeId: 'guided-lab',
    screenId: 'ND-039',
    path: '/learn/lab/:curriculumId/:moduleId/:lessonId',
    title: 'Guided Lab',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('lab', <GuidedLab />)
  },
  {
    routeId: 'remote-systems',
    screenId: 'ND-040',
    path: '/remote',
    title: 'Remote Systems',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('remote systems', <RemoteSystems />)
  },
  {
    routeId: 'remote-session',
    screenId: 'ND-041',
    path: '/remote/:hostId',
    title: 'Remote Session',
    owningEpic: 'Epic 10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('remote', <RemoteSession />)
  },
  {
    routeId: 'lan-share-home',
    screenId: 'ND-LAN-001',
    path: '/lan-share',
    title: 'LAN Share',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('lan share', <LanShareHome />)
  },
  {
    routeId: 'lan-share-peers',
    screenId: 'ND-LAN-002',
    path: '/lan-share/peers',
    title: 'Nearby Devices',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('lan share nearby devices', <LanShareNearbyDevices />)
  },
  {
    routeId: 'lan-share-device-detail',
    screenId: 'ND-LAN-003',
    path: '/lan-share/peers/:peerId',
    title: 'Device Detail',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('lan share device detail', <LanShareDeviceDetail />)
  },
  {
    routeId: 'lan-share-send',
    screenId: 'ND-LAN-004',
    path: '/lan-share/send',
    title: 'Send Files',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('lan share send composer', <LanShareSendComposer />)
  },
  {
    routeId: 'lan-share-transfers',
    screenId: 'ND-LAN-007',
    path: '/lan-share/transfers',
    title: 'Transfers',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('lan share transfers', <LanShareTransfers />)
  },
  {
    routeId: 'lan-share-transfer-detail',
    screenId: 'ND-LAN-008',
    path: '/lan-share/transfers/:jobId',
    title: 'Transfer Detail',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('lan share transfer detail', <LanShareTransferDetail />)
  },
  {
    routeId: 'lan-share-settings',
    screenId: 'ND-LAN-017',
    path: '/lan-share/settings',
    title: 'LAN Share Settings',
    owningEpic: 'LAN Share Phase LAN-7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('lan share settings', <LanShareSettings />)
  },
  {
    routeId: 'system',
    screenId: 'ND-042',
    path: '/system',
    title: 'System Dashboard',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('system dashboard', <SystemDashboard />)
  },
  {
    routeId: 'controller-settings',
    screenId: 'ND-043',
    path: '/settings/controller',
    title: 'Controller Settings',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('controller settings', <ControllerSettings />)
  },
  {
    routeId: 'display-theme-settings',
    screenId: 'ND-044',
    path: '/settings/display',
    title: 'Display and Theme Settings',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('display settings', <DisplayThemeSettings />)
  },
  {
    routeId: 'privacy-permissions',
    screenId: 'ND-046',
    path: '/settings/privacy',
    title: 'Privacy and Permissions',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('privacy settings', <PrivacyPermissions />)
  },
  {
    routeId: 'network-vpn',
    screenId: 'ND-045',
    path: '/settings/network',
    title: 'Network and VPN',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('network settings', <NetworkAndVpn />)
  },
  {
    routeId: 'updates',
    screenId: 'ND-049',
    path: '/settings/updates',
    title: 'Updates',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('updates', <Updates />)
  },
  {
    routeId: 'power',
    screenId: 'ND-051',
    path: '/power',
    title: 'Power Menu',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('power menu', <PowerMenu />)
  },
  {
    routeId: 'about',
    screenId: 'ND-056',
    path: '/about',
    title: 'About and Diagnostics',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('about', <AboutDiagnostics />)
  },
  {
    routeId: 'error-recovery',
    screenId: 'ND-055',
    path: '/error-recovery',
    title: 'Error Recovery',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: false,
    element: withSuspense('error recovery', <ErrorRecovery />)
  },
  {
    routeId: 'integrations',
    screenId: 'ND-048',
    path: '/integrations',
    title: 'Integrations',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('integrations', <Integrations />)
  },
  {
    routeId: 'extensions',
    path: '/extensions',
    title: 'Extension Manager',
    owningEpic: 'Epic X3',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('extensions', <ExtensionManager />)
  },
  {
    routeId: 'recovery',
    screenId: 'ND-052',
    path: '/recovery',
    title: 'Recovery Timeline',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('recovery timeline', <RecoveryTimeline />)
  },
  {
    routeId: 'storage',
    screenId: 'ND-047',
    path: '/storage',
    title: 'Storage and Recovery',
    owningEpic: 'Epic 11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('storage', <StorageAndRecovery />)
  },
  {
    routeId: 'backup-restore',
    screenId: 'ND-X030',
    path: '/backup',
    title: 'Backup and Restore',
    owningEpic: 'Epic X7',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('backup and restore', <BackupAndRestore />)
  },
  {
    routeId: 'vault',
    screenId: 'ND-X043',
    path: '/vault',
    title: 'Secrets Vault',
    owningEpic: 'Epic X10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('vault', <Vault />)
  },
  {
    routeId: 'privacy-data-map',
    screenId: 'ND-X050',
    path: '/privacy',
    title: 'Privacy and Data Map',
    owningEpic: 'Epic X12',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('privacy data map', <PrivacyDataMap />)
  },
  {
    routeId: 'profiles',
    screenId: 'ND-X042',
    path: '/profiles',
    title: 'Profiles and Identity',
    owningEpic: 'Epic X10',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('profiles', <Profiles />)
  },
  {
    routeId: 'continuity',
    screenId: 'ND-X044',
    path: '/continuity',
    title: 'Continuity and Offline',
    owningEpic: 'Epic X11',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('continuity', <ContinuityCenter />)
  },
  {
    routeId: 'devices',
    screenId: 'ND-X032',
    path: '/devices',
    title: 'Device and Peripheral Center',
    owningEpic: 'Epic X8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('devices', <DevicePeripheralCenter />)
  },
  {
    routeId: 'bluetooth-devices',
    screenId: 'ND-X033',
    path: '/devices/bluetooth',
    title: 'Bluetooth Devices',
    owningEpic: 'Epic X8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('bluetooth devices', <BluetoothDevices />)
  },
  {
    routeId: 'audio-microphone',
    screenId: 'ND-X034',
    path: '/devices/audio',
    title: 'Audio and Microphone Center',
    owningEpic: 'Epic X8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('audio devices', <AudioMicrophoneCenter />)
  },
  {
    routeId: 'display-dock',
    screenId: 'ND-X035',
    path: '/devices/display',
    title: 'Display and Dock Center',
    owningEpic: 'Epic X8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('display devices', <DisplayDockCenter />)
  },
  {
    routeId: 'removable-storage',
    screenId: 'ND-X036',
    path: '/devices/storage',
    title: 'Removable Storage Center',
    owningEpic: 'Epic X8',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('storage devices', <RemovableStorageCenter />)
  },
  {
    routeId: 'resource-governor',
    screenId: 'ND-X037',
    path: '/resource-governor',
    title: 'Resource Governor',
    owningEpic: 'Epic X9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('resource governor', <ResourceGovernor />)
  },
  {
    routeId: 'ai-workload-scheduler',
    screenId: 'ND-X038',
    path: '/ai-workloads',
    title: 'AI Workload Scheduler',
    owningEpic: 'Epic X9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('AI workload scheduler', <AIWorkloadScheduler />)
  },
  {
    routeId: 'scheduler-triggers',
    screenId: 'ND-X039',
    path: '/scheduler',
    title: 'Scheduler and Triggers',
    owningEpic: 'Epic X9',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('scheduler', <SchedulerTriggers />)
  },
  {
    routeId: 'help',
    screenId: 'ND-X046',
    path: '/help',
    title: 'Help Hub',
    owningEpic: 'Epic X13',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('help', <HelpHub />)
  },
  {
    routeId: 'guided-troubleshooter',
    screenId: 'ND-X057',
    path: '/troubleshooter',
    title: 'Guided Troubleshooter',
    owningEpic: 'Epic X13',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('guided troubleshooter', <GuidedTroubleshooter />)
  },
  {
    routeId: 'platform-health',
    screenId: 'ND-X070',
    path: '/platform-health',
    title: 'Platform Health Overview',
    owningEpic: 'Epic X15',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('platform health', <PlatformHealthOverview />)
  },
  {
    routeId: 'screenshot-center',
    screenId: 'ND-X058',
    path: '/screenshots',
    title: 'Screenshot Center',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('screenshot center', <ScreenshotCenter />)
  },
  {
    routeId: 'voice-notes',
    screenId: 'ND-X059',
    path: '/voice-notes',
    title: 'Voice Notes',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('voice notes', <VoiceNotesCenter />)
  },
  {
    routeId: 'presentation-mode',
    screenId: 'ND-X064',
    path: '/presentation',
    title: 'Presentation Mode',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('presentation mode', <PresentationModeSettingsScreen />)
  },
  {
    routeId: 'notification-policy',
    screenId: 'ND-X060',
    path: '/notifications',
    title: 'Notification Policy',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('notification policy', <NotificationPolicyScreen />)
  },
  {
    routeId: 'recording-center',
    screenId: 'ND-X058',
    path: '/recording',
    title: 'Recording Center',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('recording center', <RecordingCenter />)
  },
  {
    routeId: 'application-policy-center',
    screenId: 'ND-X065',
    path: '/app-policies',
    title: 'Application Sandbox and Policy',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('application policy center', <ApplicationPolicyCenter />)
  },
  {
    routeId: 'kiosk-mode-settings',
    screenId: 'ND-X064',
    path: '/kiosk',
    title: 'Kiosk Mode',
    owningEpic: 'Epic X14',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('kiosk mode settings', <KioskModeSettings />)
  },
  {
    routeId: 'trusted-publishers',
    path: '/trusted-publishers',
    title: 'Trusted Publishers',
    owningEpic: 'Epic X15',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('trusted publishers', <TrustedPublishers />)
  },
  {
    routeId: 'tool-library',
    screenId: 'ND-X017',
    path: '/tools',
    title: 'Tool Library',
    owningEpic: 'Epic X4',
    controllerHints: DEFAULT_PRIMARY_HINTS,
    restoreOnRevisit: true,
    element: withSuspense('tool library', <ToolLibrary />)
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
