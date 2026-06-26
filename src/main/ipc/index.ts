import { app, shell, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { AgentRuntime } from '../../core/agents/AgentRuntime'
import { AgentStore } from '../../core/agents/AgentStore'
import { ApplicationDiscoveryService } from '../../core/applications/ApplicationDiscoveryService'
import { ApplicationLauncher } from '../../core/applications/ApplicationLauncher'
import { ApplicationStore } from '../../core/applications/ApplicationStore'
import { DesktopEntryScanner } from '../../core/applications/discovery/DesktopEntryScanner'
import {
  defaultLibraryFoldersVdfPath,
  SteamLibraryScanner
} from '../../core/applications/discovery/SteamLibraryScanner'
import { FlatpakAdapter } from '../../core/applications/FlatpakAdapter'
import { PackageLifecycleService } from '../../core/applications/PackageLifecycleService'
import { BrowserTabStore } from '../../core/browser/BrowserTabStore'
import { BrowserPermissionStore } from '../../core/browser/BrowserPermissionStore'
import { CapabilityRegistry } from '../../core/capability/CapabilityRegistry'
import { ControllerSettingsStore } from '../../core/controller/ControllerSettingsStore'
import { DeviceStore } from '../../core/devices/DeviceStore'
import { DisplaySettingsStore } from '../../core/display/DisplaySettingsStore'
import { FeatureRegistry } from '../../core/feature/FeatureRegistry'
import { FileService } from '../../core/files/FileService'
import { GitService } from '../../core/git/GitService'
import { LockSettingsStore } from '../../core/lock/LockSettingsStore'
import { ModelProviderService } from '../../core/models/ModelProviderService'
import { ModelProviderStore } from '../../core/models/ModelProviderStore'
import { ModelRouter } from '../../core/models/ModelRouter'
import { OllamaRuntimeService } from '../../core/models/OllamaRuntimeService'
import { SystemMetricsService } from '../../core/system/SystemMetricsService'
import { UpdateService } from '../../core/system/UpdateService'
import { NetworkService } from '../../core/network/NetworkService'
import { LearningService } from '../../core/learning/LearningService'
import { BUNDLED_CATALOG } from '../../shared/curricula/bundledCatalog'
import { RecoveryService } from '../../core/recovery/RecoveryService'
import { RemoteConnectionService } from '../../core/remote/RemoteConnectionService'
import { RemoteHostStore } from '../../core/remote/RemoteHostStore'
import { TerminalService } from '../../core/terminal/TerminalService'
import { TransactionManager } from '../../core/transactions/TransactionManager'
import { WorkflowRunStore } from '../../core/workflows/WorkflowRunStore'
import { WorkflowStore } from '../../core/workflows/WorkflowStore'
import { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'
import { electronCapabilityDetectors } from '../security/electronCapabilityDetectors'
import { electronSecretCipher } from '../security/electronSecretCipher'
import { FEATURE_CATALOG } from '../../shared/features/featureCatalog'
import { IPC_CHANNELS } from '@shared/contracts'
import { registerAgentHandlers } from './registerAgentHandlers'
import { registerApplicationHandlers } from './registerApplicationHandlers'
import { registerBrowserHandlers } from './registerBrowserHandlers'
import { registerCapabilityHandlers } from './registerCapabilityHandlers'
import { registerControllerSettingsHandlers } from './registerControllerSettingsHandlers'
import { registerDeviceHandlers } from './registerDeviceHandlers'
import { registerDiagnosticsHandlers } from './registerDiagnosticsHandlers'
import { registerDisplaySettingsHandlers } from './registerDisplaySettingsHandlers'
import { registerFeatureHandlers } from './registerFeatureHandlers'
import { registerFileHandlers } from './registerFileHandlers'
import { registerGitHandlers } from './registerGitHandlers'
import { registerLockHandlers } from './registerLockHandlers'
import { registerModelHandlers } from './registerModelHandlers'
import { registerNetworkHandlers } from './registerNetworkHandlers'
import { registerPackageHandlers } from './registerPackageHandlers'
import { registerPowerHandlers } from './registerPowerHandlers'
import { registerUpdateHandlers } from './registerUpdateHandlers'
import { registerLearningHandlers } from './registerLearningHandlers'
import { registerRecoveryHandlers } from './registerRecoveryHandlers'
import { registerRemoteHandlers } from './registerRemoteHandlers'
import { registerSystemHandlers } from './registerSystemHandlers'
import { registerTerminalHandlers } from './registerTerminalHandlers'
import { registerWorkflowHandlers } from './registerWorkflowHandlers'
import { registerWorkspaceHandlers } from './registerWorkspaceHandlers'

/** Registers every real IPC handler. Called once from `src/main/index.ts` after `app.whenReady()`. */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): () => void {
  const workspaceStore = new WorkspaceStore(join(app.getPath('userData'), 'workspaces.json'))
  const fileService = new FileService()
  const gitService = new GitService()
  const terminalService = new TerminalService()
  const remoteHostStore = new RemoteHostStore(
    join(app.getPath('userData'), 'remote-hosts.json'),
    electronSecretCipher
  )
  const remoteConnectionService = new RemoteConnectionService(remoteHostStore)
  const recoveryService = new RecoveryService(join(app.getPath('userData'), 'recovery'))
  const workflowStore = new WorkflowStore(join(app.getPath('userData'), 'workflows'))
  const workflowRunStore = new WorkflowRunStore(join(app.getPath('userData'), 'workflows'))
  const modelProviderStore = new ModelProviderStore(
    join(app.getPath('userData'), 'model-providers.json'),
    electronSecretCipher
  )
  const modelProviderService = new ModelProviderService()
  const systemMetricsService = new SystemMetricsService()
  const networkService = new NetworkService()
  const learningService = new LearningService({
    userDataPath: app.getPath('userData'),
    bundledCatalog: BUNDLED_CATALOG,
    generateId: () => randomUUID(),
    now: () => Date.now()
  })
  const updateService = new UpdateService({
    currentVersion: app.getVersion(),
    channel: (process.env.ND_UPDATE_CHANNEL as 'stable' | 'beta' | 'nightly') ?? 'stable',
    feedUrl: process.env.ND_UPDATE_FEED_URL,
    fetch
  })
  const modelRouter = new ModelRouter(
    modelProviderStore,
    modelProviderService,
    systemMetricsService
  )
  const ollamaRuntime = new OllamaRuntimeService()
  const capabilityRegistry = new CapabilityRegistry(electronCapabilityDetectors)
  const featureRegistry = new FeatureRegistry(FEATURE_CATALOG)
  const applicationStore = new ApplicationStore(join(app.getPath('userData'), 'applications.json'))
  const deviceStore = new DeviceStore(join(app.getPath('userData'), 'devices.json'))
  const desktopEntryScanner = new DesktopEntryScanner([
    join(homedir(), '.local', 'share', 'applications'),
    '/usr/share/applications',
    '/var/lib/flatpak/exports/share/applications',
    join(homedir(), '.local', 'share', 'flatpak', 'exports', 'share', 'applications')
  ])
  const steamLibraryScanner = new SteamLibraryScanner(
    defaultLibraryFoldersVdfPath(homedir(), process.platform)
  )
  const flatpakAdapter = new FlatpakAdapter()
  const applicationDiscoveryService = new ApplicationDiscoveryService(
    applicationStore,
    desktopEntryScanner,
    steamLibraryScanner,
    flatpakAdapter
  )
  const applicationLauncher = new ApplicationLauncher({ openUrl: (url) => shell.openExternal(url) })
  const transactionManager = new TransactionManager()
  const packageLifecycleService = new PackageLifecycleService(
    flatpakAdapter,
    transactionManager,
    applicationStore
  )
  const agentStore = new AgentStore(join(app.getPath('userData'), 'agents.json'))
  const agentRuntime = new AgentRuntime(
    agentStore,
    modelRouter,
    (run) => {
      const window = getWindow()
      if (window && !window.webContents.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.agentRunUpdate, run)
      }
    },
    (request) => {
      const window = getWindow()
      if (window && !window.webContents.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.agentToolRequest, request)
      }
    }
  )

  registerWorkspaceHandlers(workspaceStore, getWindow, gitService, remoteHostStore)
  registerFileHandlers(fileService, recoveryService, workspaceStore)
  registerGitHandlers(gitService, workspaceStore, fileService, recoveryService)
  registerRecoveryHandlers(recoveryService, fileService, workspaceStore)
  registerWorkflowHandlers(workflowStore, workflowRunStore)
  registerModelHandlers(modelProviderStore, modelProviderService, modelRouter, ollamaRuntime)
  registerAgentHandlers(agentStore, agentRuntime)
  registerSystemHandlers(systemMetricsService)
  registerNetworkHandlers(networkService)
  registerUpdateHandlers(updateService)
  registerLearningHandlers(learningService)
  registerDiagnosticsHandlers(modelProviderStore)
  const disposePower = registerPowerHandlers(getWindow)
  registerControllerSettingsHandlers(
    new ControllerSettingsStore(join(app.getPath('userData'), 'controller-settings.json'))
  )
  registerDisplaySettingsHandlers(
    new DisplaySettingsStore(join(app.getPath('userData'), 'display-settings.json'))
  )
  registerLockHandlers(new LockSettingsStore(join(app.getPath('userData'), 'lock-settings.json')))
  registerBrowserHandlers(
    new BrowserTabStore(join(app.getPath('userData'), 'browser-tabs.json')),
    new BrowserPermissionStore(join(app.getPath('userData'), 'browser-permissions.json')),
    getWindow
  )
  const disposeTerminal = registerTerminalHandlers(terminalService, workspaceStore, getWindow)
  const disposeRemote = registerRemoteHandlers(remoteHostStore, remoteConnectionService, getWindow)
  registerCapabilityHandlers(capabilityRegistry)
  registerFeatureHandlers(featureRegistry, capabilityRegistry)
  registerApplicationHandlers(
    applicationStore,
    applicationDiscoveryService,
    applicationLauncher,
    getWindow
  )
  registerDeviceHandlers(deviceStore)
  const disposePackages = registerPackageHandlers(
    flatpakAdapter,
    packageLifecycleService,
    transactionManager,
    getWindow
  )
  return () => {
    disposeTerminal()
    disposeRemote()
    disposePower()
    disposePackages()
  }
}
