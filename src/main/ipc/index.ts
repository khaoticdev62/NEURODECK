import {
  app,
  Notification,
  powerMonitor,
  session,
  shell,
  type BrowserWindow,
  type Event as ElectronEvent
} from 'electron'
import { randomUUID } from 'node:crypto'
import { hostname, homedir } from 'node:os'
import { join } from 'node:path'
import { AgentRuntime } from '../../core/agents/AgentRuntime'
import { AgentStore } from '../../core/agents/AgentStore'
import { BackupScheduleStore } from '../../core/backup/BackupScheduleStore'
import { BackupScheduler } from '../../core/backup/BackupScheduler'
import { BackupService } from '../../core/backup/BackupService'
import { ApplicationDiscoveryService } from '../../core/applications/ApplicationDiscoveryService'
import { ApplicationLauncher } from '../../core/applications/ApplicationLauncher'
import { ApplicationPolicyStore } from '../../core/applications/ApplicationPolicyStore'
import { KioskModeStore } from '../../core/kiosk/KioskModeStore'
import { ApplicationStore } from '../../core/applications/ApplicationStore'
import { DesktopEntryScanner } from '../../core/applications/discovery/DesktopEntryScanner'
import {
  defaultLibraryFoldersVdfPath,
  SteamLibraryScanner
} from '../../core/applications/discovery/SteamLibraryScanner'
import { defaultSteamRoot } from '../../core/steam/SteamUserdataPaths'
import { FlatpakAdapter } from '../../core/applications/FlatpakAdapter'
import { PackageLifecycleService } from '../../core/applications/PackageLifecycleService'
import { BrowserTabStore } from '../../core/browser/BrowserTabStore'
import { BrowserPermissionStore } from '../../core/browser/BrowserPermissionStore'
import { CapabilityRegistry } from '../../core/capability/CapabilityRegistry'
import { ContinuityStore } from '../../core/continuity/ContinuityStore'
import { ControllerSettingsStore } from '../../core/controller/ControllerSettingsStore'
import { DeviceInventoryService } from '../../core/devices/DeviceInventoryService'
import { DeviceStore } from '../../core/devices/DeviceStore'
import { DisplaySettingsStore } from '../../core/display/DisplaySettingsStore'
import { CapabilityBroker } from '../../core/extensions/CapabilityBroker'
import { ExtensionDataStore } from '../../core/extensions/ExtensionDataStore'
import { ExtensionHost } from '../../core/extensions/ExtensionHost'
import { ExtensionRuntime } from '../../core/extensions/ExtensionRuntime'
import { ExtensionStore } from '../../core/extensions/ExtensionStore'
import { TrustedPublisherStore } from '../../core/extensions/TrustedPublisherStore'
import { KnowledgeStore } from '../../core/knowledge/KnowledgeStore'
import { KnowledgeVaultService } from '../../core/knowledge/KnowledgeVaultService'
import { MemoryStore } from '../../core/memory/MemoryStore'
import { ProfileStore } from '../../core/profiles/ProfileStore'
import { PersonaStore } from '../../core/promptLibrary/PersonaStore'
import { PromptTemplateStore } from '../../core/promptLibrary/PromptTemplateStore'
import { MicrophonePermissionStore } from '../../core/voice/MicrophonePermissionStore'
import { VoiceNoteStore } from '../../core/voice/VoiceNoteStore'
import { ClipboardStore } from '../../core/clipboard/ClipboardStore'
import { SnippetStore } from '../../core/clipboard/SnippetStore'
import { DeviceIdentityStore } from '../../core/lan/DeviceIdentityStore'
import { PeerDiscoveryService } from '../../core/lan/PeerDiscoveryService'
import { PeerStore } from '../../core/lan/PeerStore'
import { LanShareCertificateStore } from '../../core/lanShare/LanShareCertificateStore'
import { LanShareGroupCodeStore } from '../../core/lanShare/LanShareGroupCodeStore'
import { LanShareIdentityStore } from '../../core/lanShare/LanShareIdentityStore'
import { LanShareInterfaceManager } from '../../core/lanShare/LanShareInterfaceManager'
import { LanSharePeerStore } from '../../core/lanShare/LanSharePeerStore'
import { LanShareService } from '../../core/lanShare/LanShareService'
import { LanShareSettingsStore } from '../../core/lanShare/LanShareSettingsStore'
import { LanShareTransferStore } from '../../core/lanShare/LanShareTransferStore'
import { PeerTransferService } from '../../core/lan/PeerTransferService'
import { TransferManager } from '../../core/transfer/TransferManager'
import { FeatureRegistry } from '../../core/feature/FeatureRegistry'
import { FileService } from '../../core/files/FileService'
import { GitService } from '../../core/git/GitService'
import { LockSettingsStore } from '../../core/lock/LockSettingsStore'
import { ModelProviderService } from '../../core/models/ModelProviderService'
import { ModelProviderStore } from '../../core/models/ModelProviderStore'
import { PrivacyDataMapService } from '../../core/privacy/PrivacyDataMapService'
import { GuidedTroubleshooterService } from '../../core/troubleshooter/GuidedTroubleshooterService'
import { ScreenshotService } from '../screenshot/ScreenshotService'
import { PresentationModeStore } from '../../core/presentation/PresentationModeStore'
import { NotificationPolicyStore } from '../../core/notifications/NotificationPolicyStore'
import { RecordingService } from '../recording/RecordingService'
import { VaultStore } from '../../core/vault/VaultStore'
import { ModelRouter } from '../../core/models/ModelRouter'
import { OllamaRuntimeService } from '../../core/models/OllamaRuntimeService'
import { SystemMetricsService } from '../../core/system/SystemMetricsService'
import { CrashReportStore } from '../../core/support/CrashReportStore'
import { SupportBundleService } from '../../core/support/SupportBundleService'
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
import { registerApplicationPolicyHandlers } from './registerApplicationPolicyHandlers'
import { registerKioskModeHandlers } from './registerKioskModeHandlers'
import { registerTrustedPublisherHandlers } from './registerTrustedPublisherHandlers'
import { registerSteamShortcutHandlers } from './registerSteamShortcutHandlers'
import { registerBackupHandlers } from './registerBackupHandlers'
import { registerBrowserHandlers } from './registerBrowserHandlers'
import { registerCapabilityHandlers } from './registerCapabilityHandlers'
import { registerContinuityHandlers } from './registerContinuityHandlers'
import { registerControllerSettingsHandlers } from './registerControllerSettingsHandlers'
import { registerDeviceHandlers } from './registerDeviceHandlers'
import { registerDiagnosticsHandlers } from './registerDiagnosticsHandlers'
import { registerDisplaySettingsHandlers } from './registerDisplaySettingsHandlers'
import { registerExtensionHandlers } from './registerExtensionHandlers'
import { registerKnowledgeHandlers } from './registerKnowledgeHandlers'
import { registerMemoryHandlers } from './registerMemoryHandlers'
import { registerPromptLibraryHandlers } from './registerPromptLibraryHandlers'
import { registerClipboardHandlers } from './registerClipboardHandlers'
import { registerLanHandlers } from './registerLanHandlers'
import { registerLanShareHandlers } from './registerLanShareHandlers'
import { registerVoiceHandlers } from './registerVoiceHandlers'
import { registerFeatureHandlers } from './registerFeatureHandlers'
import { registerFileHandlers } from './registerFileHandlers'
import { registerGitHandlers } from './registerGitHandlers'
import { registerLockHandlers } from './registerLockHandlers'
import { registerModelHandlers } from './registerModelHandlers'
import { registerNetworkHandlers } from './registerNetworkHandlers'
import { registerPackageHandlers } from './registerPackageHandlers'
import { registerPowerHandlers } from './registerPowerHandlers'
import { registerProfileHandlers } from './registerProfileHandlers'
import { registerUpdateHandlers } from './registerUpdateHandlers'
import { registerLearningHandlers } from './registerLearningHandlers'
import { registerVaultHandlers } from './registerVaultHandlers'
import { registerPrivacyHandlers } from './registerPrivacyHandlers'
import { registerTroubleshooterHandlers } from './registerTroubleshooterHandlers'
import { registerScreenshotHandlers } from './registerScreenshotHandlers'
import { registerPresentationModeHandlers } from './registerPresentationModeHandlers'
import { registerNotificationPolicyHandlers } from './registerNotificationPolicyHandlers'
import { registerRecordingHandlers } from './registerRecordingHandlers'
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
  const backupService = new BackupService(
    app.getPath('userData'),
    join(app.getPath('userData'), 'backups')
  )
  const backupScheduleStore = new BackupScheduleStore(
    join(app.getPath('userData'), 'backup-schedule.json')
  )
  const backupScheduler = new BackupScheduler(backupScheduleStore, backupService)
  const workflowStore = new WorkflowStore(join(app.getPath('userData'), 'workflows'))
  const workflowRunStore = new WorkflowRunStore(join(app.getPath('userData'), 'workflows'))
  const modelProviderStore = new ModelProviderStore(
    join(app.getPath('userData'), 'model-providers.json'),
    electronSecretCipher
  )
  const modelProviderService = new ModelProviderService()
  const systemMetricsService = new SystemMetricsService()
  const networkService = new NetworkService()
  const crashReportStore = new CrashReportStore(join(app.getPath('userData'), 'crash-reports.json'))
  const onBrowserWindowCreated = (_event: ElectronEvent, window: BrowserWindow): void => {
    window.webContents.on('render-process-gone', (_goneEvent, details) => {
      void crashReportStore.recordRendererProcessGone(details).catch(() => undefined)
    })
  }
  app.on('browser-window-created', onBrowserWindowCreated)
  const supportBundleService = new SupportBundleService({
    outputDirectory: join(app.getPath('userData'), 'support-bundles'),
    collectors: {
      diagnostics: async () => {
        const providers = await modelProviderStore.list()
        return {
          appVersion: app.getVersion(),
          electronVersion: process.versions.electron ?? 'unknown',
          chromeVersion: process.versions.chrome ?? 'unknown',
          nodeVersion: process.versions.node,
          platform: process.platform,
          arch: process.arch,
          license: 'Not specified',
          modelProviderNames: providers.map((provider) => provider.name)
        }
      },
      systemMetrics: () => systemMetricsService.collect(app.getPath('userData')),
      networkDiagnostics: () => networkService.getDiagnostics()
    }
  })
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
  const continuityStore = new ContinuityStore(join(app.getPath('userData'), 'continuity.json'))
  const featureRegistry = new FeatureRegistry(FEATURE_CATALOG)
  const applicationStore = new ApplicationStore(join(app.getPath('userData'), 'applications.json'))
  const deviceStore = new DeviceStore(join(app.getPath('userData'), 'devices.json'))
  const deviceInventoryService = new DeviceInventoryService(
    deviceStore,
    capabilityRegistry,
    systemMetricsService
  )
  const desktopEntryScanner = new DesktopEntryScanner([
    join(homedir(), '.local', 'share', 'applications'),
    '/usr/share/applications',
    '/var/lib/flatpak/exports/share/applications',
    join(homedir(), '.local', 'share', 'flatpak', 'exports', 'share', 'applications')
  ])
  const steamLibraryScanner = new SteamLibraryScanner(
    defaultLibraryFoldersVdfPath(homedir(), process.platform)
  )
  const steamRoot = defaultSteamRoot(homedir(), process.platform)
  const flatpakAdapter = new FlatpakAdapter()
  const applicationDiscoveryService = new ApplicationDiscoveryService(
    applicationStore,
    desktopEntryScanner,
    steamLibraryScanner,
    flatpakAdapter
  )
  const applicationPolicyStore = new ApplicationPolicyStore(
    join(app.getPath('userData'), 'application-policies.json')
  )
  const applicationLauncher = new ApplicationLauncher({
    openUrl: (url) => shell.openExternal(url),
    getLaunchEnvironment: (applicationId) =>
      applicationPolicyStore.getLaunchEnvironment(applicationId)
  })
  const transactionManager = new TransactionManager()
  const packageLifecycleService = new PackageLifecycleService(
    flatpakAdapter,
    transactionManager,
    applicationStore
  )
  const extensionStore = new ExtensionStore(join(app.getPath('userData'), 'extensions.json'))
  const trustedPublisherStore = new TrustedPublisherStore(
    join(app.getPath('userData'), 'trusted-publishers.json')
  )
  const extensionDataStore = new ExtensionDataStore(join(app.getPath('userData'), 'extension-data'))
  const capabilityBroker = new CapabilityBroker()
  capabilityBroker.register('show-notification', async ({ args }) => {
    if (!Notification.isSupported())
      throw new Error('Notifications are not supported on this device.')
    new Notification({
      title: typeof args.title === 'string' ? args.title : 'Extension notification',
      body: typeof args.body === 'string' ? args.body : undefined
    }).show()
    return { shown: true }
  })
  capabilityBroker.register('store-extension-data', async ({ extensionId, method, args }) => {
    if (method === 'get') return extensionDataStore.get(extensionId, String(args.key))
    if (method === 'set') {
      await extensionDataStore.set(extensionId, String(args.key), args.value)
      return { stored: true }
    }
    if (method === 'clear') {
      await extensionDataStore.clear(extensionId)
      return { cleared: true }
    }
    throw new Error(`Unknown store-extension-data method "${method}".`)
  })
  const extensionHost = new ExtensionHost(
    join(__dirname, 'extensionHostEntry.js'),
    capabilityBroker,
    {
      onFault: (extensionId, message, faultCountInWindow) => {
        void extensionRuntime.handleFault(extensionId, message, faultCountInWindow)
      }
    }
  )
  const extensionRuntime = new ExtensionRuntime(
    extensionStore,
    extensionHost,
    (record) => {
      const window = getWindow()
      if (window && !window.webContents.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.extensionHealthEvent, {
          id: record.manifest.id,
          state: record.state,
          faultCount: record.faultCount,
          quarantineReason: record.quarantineReason
        })
      }
    },
    trustedPublisherStore
  )
  const knowledgeStore = new KnowledgeStore(join(app.getPath('userData'), 'knowledge.json'))
  const knowledgeVaultService = new KnowledgeVaultService(knowledgeStore)
  const memoryStore = new MemoryStore(join(app.getPath('userData'), 'memory.json'))
  const profileStore = new ProfileStore(join(app.getPath('userData'), 'profiles.json'))
  const promptTemplateStore = new PromptTemplateStore(
    join(app.getPath('userData'), 'prompt-templates.json')
  )
  const personaStore = new PersonaStore(join(app.getPath('userData'), 'personas.json'))
  const microphonePermissionStore = new MicrophonePermissionStore(
    join(app.getPath('userData'), 'microphone-permission.json')
  )
  const voiceNoteStore = new VoiceNoteStore(
    join(app.getPath('userData'), 'voice-notes.json'),
    join(app.getPath('userData'), 'voice-notes')
  )
  // Real Epic X5 microphone gate (supplemental §15.3 "Microphone
  // permission" is the first real step of the voice command pipeline).
  // The main window only ever loads this app's own bundled UI (no
  // third-party origin), so this is the one real, explicit, persisted
  // yes/no the user grants via Privacy settings — never silently
  // approved. Fails closed: any state other than an explicit `granted`
  // denies the real OS-level `getUserMedia` request.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission !== 'media') {
      callback(false)
      return
    }
    microphonePermissionStore
      .isGranted()
      .then((granted) => callback(granted))
      .catch(() => callback(false))
  })
  const clipboardStore = new ClipboardStore(
    join(app.getPath('userData'), 'clipboard.json'),
    electronSecretCipher
  )
  const snippetStore = new SnippetStore(join(app.getPath('userData'), 'snippets.json'))
  const peerStore = new PeerStore(join(app.getPath('userData'), 'lan-peers.json'))
  const peerTransferService = new PeerTransferService()
  const lanTransferManager = new TransferManager()
  const deviceIdentityStore = new DeviceIdentityStore(
    join(app.getPath('userData'), 'device-identity.json')
  )
  // Real Epic X6 LAN discovery (supplemental §19.1) — started once the
  // real device identity (a real Ed25519 keypair, generated once and
  // persisted) is available, so every announcement carries this
  // device's real, stable fingerprint.
  const peerTransferPort = 53318
  let peerDiscoveryService: PeerDiscoveryService | null = null
  void deviceIdentityStore.get().then((identity) => {
    peerDiscoveryService = new PeerDiscoveryService({
      selfId: identity.id,
      friendlyName: hostname(),
      transferPort: peerTransferPort,
      fingerprint: identity.fingerprint,
      onPeerSeen: (announcement, fromAddress) => {
        void peerStore
          .upsertSeen({
            id: announcement.id,
            friendlyName: announcement.friendlyName,
            address: fromAddress,
            port: announcement.port,
            fingerprint: announcement.fingerprint,
            online: 'online',
            lastSeenAt: Date.now()
          })
          .then(() => peerStore.list())
          .then((peers) => {
            const window = getWindow()
            if (window && !window.webContents.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.peerUpdate, peers)
            }
          })
      }
    })
    peerDiscoveryService.start()
  })
  // Phase LAN-1 (Warpinator-compatible LAN Share) — schemas, settings,
  // and data-model stores only. No discovery/auth/transfer engine exists
  // yet; see docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md and the
  // implementation ledger for the phased rollout this is part of.
  const lanShareIdentityStore = new LanShareIdentityStore(
    join(app.getPath('userData'), 'lan-share-identity.json'),
    hostname()
  )
  const lanShareSettingsStore = new LanShareSettingsStore(
    join(app.getPath('userData'), 'lan-share-settings.json'),
    hostname(),
    join(app.getPath('downloads'), 'NeuroDeck LAN Share')
  )
  const lanSharePeerStore = new LanSharePeerStore(
    join(app.getPath('userData'), 'lan-share-peers.json')
  )
  const lanShareTransferStore = new LanShareTransferStore(
    join(app.getPath('userData'), 'lan-share-transfer-jobs.json')
  )
  const lanShareInterfaceManager = new LanShareInterfaceManager()
  const lanShareCertificateStore = new LanShareCertificateStore(
    join(app.getPath('userData'), 'lan-share-certificate.json'),
    electronSecretCipher,
    lanShareInterfaceManager
  )
  const lanShareGroupCodeStore = new LanShareGroupCodeStore(
    join(app.getPath('userData'), 'lan-share-group-code.json'),
    electronSecretCipher
  )
  // Real Phase LAN-2/LAN-3/LAN-4 service lifecycle — binds real sockets
  // once `start()` is explicitly called via IPC. Never auto-started
  // here: spec §24 gates auto-start behind "secure mode" (a non-default
  // group code), which only the user can configure.
  const lanShareService = new LanShareService(
    lanShareSettingsStore,
    lanShareInterfaceManager,
    lanShareIdentityStore,
    lanSharePeerStore,
    lanShareCertificateStore,
    lanShareGroupCodeStore,
    lanShareTransferStore
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
  registerBackupHandlers(backupService, getWindow, backupScheduleStore)
  backupScheduler.start()
  registerWorkflowHandlers(workflowStore, workflowRunStore)
  registerModelHandlers(modelProviderStore, modelProviderService, modelRouter, ollamaRuntime)
  registerAgentHandlers(agentStore, agentRuntime)
  registerSystemHandlers(systemMetricsService)
  registerNetworkHandlers(networkService)
  registerUpdateHandlers(updateService)
  registerLearningHandlers(learningService)
  registerDiagnosticsHandlers(modelProviderStore, supportBundleService, crashReportStore)
  const onMainUncaughtException = (error: Error): void => {
    void crashReportStore.recordMainUncaughtException(error).catch(() => undefined)
  }
  process.on('uncaughtExceptionMonitor', onMainUncaughtException)
  const disposePower = registerPowerHandlers(getWindow)
  // Real spec §24 suspend/resume: LAN Share's own real sockets/mDNS
  // advertisement must not stay bound across a suspend, and must rebind
  // and re-announce on resume — handled in `LanShareService` itself so
  // `core/` stays free of an `electron` import; this is the one real
  // subscription point.
  const onLanShareSuspend = (): void => void lanShareService.handleSystemSuspend()
  const onLanShareResume = (): void => void lanShareService.handleSystemResume()
  const onContinuitySuspend = (): void => void continuityStore.recordPowerEvent({ kind: 'suspend' })
  const onContinuityResume = (): void => void continuityStore.recordPowerEvent({ kind: 'resume' })
  powerMonitor.on('suspend', onLanShareSuspend)
  powerMonitor.on('resume', onLanShareResume)
  powerMonitor.on('suspend', onContinuitySuspend)
  powerMonitor.on('resume', onContinuityResume)
  registerControllerSettingsHandlers(
    new ControllerSettingsStore(join(app.getPath('userData'), 'controller-settings.json'))
  )
  registerDisplaySettingsHandlers(
    new DisplaySettingsStore(join(app.getPath('userData'), 'display-settings.json'))
  )
  registerLockHandlers(new LockSettingsStore(join(app.getPath('userData'), 'lock-settings.json')))
  const vaultStore = new VaultStore(
    join(app.getPath('userData'), 'vault.json'),
    electronSecretCipher
  )
  registerVaultHandlers(vaultStore)
  registerProfileHandlers(profileStore)
  registerContinuityHandlers(continuityStore)
  const browserPermissionStore = new BrowserPermissionStore(
    join(app.getPath('userData'), 'browser-permissions.json')
  )
  registerBrowserHandlers(
    new BrowserTabStore(join(app.getPath('userData'), 'browser-tabs.json')),
    browserPermissionStore,
    getWindow
  )
  registerPrivacyHandlers(
    new PrivacyDataMapService(
      clipboardStore,
      memoryStore,
      browserPermissionStore,
      knowledgeStore,
      backupService,
      vaultStore
    )
  )
  registerTroubleshooterHandlers(
    new GuidedTroubleshooterService(
      networkService,
      modelProviderStore,
      modelProviderService,
      capabilityRegistry,
      systemMetricsService,
      extensionStore,
      updateService
    )
  )
  registerScreenshotHandlers(
    new ScreenshotService(join(app.getPath('userData'), 'screenshots')),
    workspaceStore,
    getWindow
  )
  const disposePresentationMode = registerPresentationModeHandlers(
    new PresentationModeStore(join(app.getPath('userData'), 'presentation-mode.json'))
  )
  registerNotificationPolicyHandlers(
    new NotificationPolicyStore(join(app.getPath('userData'), 'notification-policy.json'))
  )
  registerRecordingHandlers(new RecordingService(join(app.getPath('userData'), 'recordings')))
  const disposeTerminal = registerTerminalHandlers(terminalService, workspaceStore, getWindow)
  const disposeRemote = registerRemoteHandlers(remoteHostStore, remoteConnectionService, getWindow)
  registerCapabilityHandlers(capabilityRegistry)
  registerFeatureHandlers(featureRegistry, capabilityRegistry, profileStore, continuityStore)
  registerApplicationHandlers(
    applicationStore,
    applicationDiscoveryService,
    applicationLauncher,
    getWindow
  )
  registerApplicationPolicyHandlers(applicationPolicyStore)
  registerKioskModeHandlers(new KioskModeStore(join(app.getPath('userData'), 'kiosk-mode.json')))
  registerTrustedPublisherHandlers(trustedPublisherStore)
  registerSteamShortcutHandlers(steamRoot, join(app.getPath('userData'), 'steam-shortcut-backups'))
  registerDeviceHandlers(deviceStore, deviceInventoryService)
  const disposePackages = registerPackageHandlers(
    flatpakAdapter,
    packageLifecycleService,
    transactionManager,
    getWindow
  )
  registerExtensionHandlers(extensionStore, extensionRuntime)
  registerKnowledgeHandlers(knowledgeStore, knowledgeVaultService)
  registerMemoryHandlers(memoryStore)
  registerPromptLibraryHandlers(promptTemplateStore, personaStore)
  registerVoiceHandlers(microphonePermissionStore, voiceNoteStore, knowledgeVaultService)
  registerClipboardHandlers(clipboardStore, snippetStore)
  const disposeLan = registerLanHandlers(
    peerStore,
    peerTransferService,
    lanTransferManager,
    getWindow
  )
  const disposeLanShare = registerLanShareHandlers(
    lanShareIdentityStore,
    lanShareSettingsStore,
    lanSharePeerStore,
    lanShareTransferStore,
    lanShareService,
    lanShareInterfaceManager,
    lanShareGroupCodeStore,
    getWindow
  )
  return () => {
    backupScheduler.stop()
    disposeTerminal()
    disposeRemote()
    disposePower()
    disposePresentationMode()
    powerMonitor.removeListener('suspend', onLanShareSuspend)
    powerMonitor.removeListener('resume', onLanShareResume)
    powerMonitor.removeListener('suspend', onContinuitySuspend)
    powerMonitor.removeListener('resume', onContinuityResume)
    disposePackages()
    disposeLan()
    disposeLanShare()
    process.removeListener('uncaughtExceptionMonitor', onMainUncaughtException)
    app.removeListener('browser-window-created', onBrowserWindowCreated)
    peerDiscoveryService?.stop()
    peerTransferService.stop()
    void lanShareService.stop()
  }
}
