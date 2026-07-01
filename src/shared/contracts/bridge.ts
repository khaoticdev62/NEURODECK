import type { FileEntry, ListFilesRequest, ReadFileRequest, ReadFileResult } from './file'
import type { NdxResult } from './error'
import type { CapabilityState } from './capability'
import type { FeatureState } from './feature'
import type {
  ApplicationIdRequest,
  ApplicationRecord,
  UpsertApplicationRequest
} from './application'
import type {
  DiscoverApplicationsRequest,
  FlatpakPermissionPreview,
  FlatpakRefRequest,
  FlatpakRemoteApp,
  FlatpakSearchRequest,
  LaunchApplicationRequest,
  LaunchResult
} from './applicationLifecycle'
import type {
  DeviceIdRequest,
  DeviceInventoryReport,
  DeviceRecord,
  UpsertDeviceRequest
} from './device'
import type { TransactionIdRequest, TransactionRecord } from './transaction'
import type {
  BackupIdRequest,
  BackupMigrationReport,
  BackupRecord,
  BackupRestoreResult,
  BackupVerification,
  CreateBackupRequest
} from './backup'
import type { BackupScheduleSettings, SetBackupScheduleRequest } from './backupSchedule'
import type {
  CreateVaultItemRequest,
  RevealVaultItemResult,
  RotateVaultItemRequest,
  UpdateVaultItemRequest,
  VaultAccessLogEntry,
  VaultItem,
  VaultItemIdRequest
} from './vault'
import type {
  CreateProfileRequest,
  ProfileIdRequest,
  ProfileState,
  StartProfileSessionRequest,
  UpdateProfileRequest,
  UserProfile
} from './profile'
import type {
  ContinuityPowerEvent,
  ContinuityState,
  RecordPowerEventRequest,
  SaveSessionSnapshotRequest,
  SetSafeModeRequest
} from './continuity'
import type { ClearDataCategoryRequest, ClearDataCategoryResult, DataMapEntry } from './privacy'
import type { RunTroubleshooterCheckRequest, TroubleshooterResult } from './troubleshooter'
import type {
  AddScreenshotToWorkspaceRequest,
  CaptureScreenshotRequest,
  ScreenshotIdRequest,
  ScreenshotRecord
} from './screenshot'
import type { PresentationModeSettings, SetPresentationModeRequest } from './presentationMode'
import type { NotificationPolicy, SetNotificationPolicyRequest } from './notificationPolicy'
import type {
  AppendRecordingChunkRequest,
  BeginRecordingRequest,
  BeginRecordingResult,
  RecordingIdRequest,
  RecordingRecord,
  RecordingSource
} from './recording'
import type {
  ApplicationPolicy,
  ApplicationPolicyIdRequest,
  SetApplicationPolicyRequest
} from './applicationPolicy'
import type { KioskModeSettings, SetKioskModeRequest } from './kioskMode'
import type {
  AddTrustedPublisherRequest,
  TrustedPublisherFingerprintRequest,
  TrustedPublisherRecord
} from './trustedPublisher'
import type {
  CreateSteamShortcutRequest,
  RemoveSteamShortcutRequest,
  RestoreSteamShortcutBackupRequest,
  SelectSteamProfileRequest,
  SteamRunningState,
  SteamShortcutBackup,
  SteamShortcutEntry,
  SteamUserProfile,
  UpdateSteamShortcutRequest
} from './steamShortcuts'
import type {
  ExtensionHealthEvent,
  ExtensionIdRequest,
  ExtensionInstallPreview,
  ExtensionRecord,
  InstallExtensionRequest,
  PreviewExtensionInstallRequest,
  SetExtensionEnabledRequest
} from './extension'
import type {
  AddKnowledgeSourceRequest,
  KnowledgeQueryRequest,
  AddKnowledgeNoteRequest,
  KnowledgeQueryResult,
  KnowledgeSource,
  KnowledgeSourceIdRequest,
  SetKnowledgeSourcePausedRequest
} from './knowledge'
import type {
  ClearMemoryScopeRequest,
  MemoryIdRequest,
  MemoryExport,
  MemoryItem,
  MemoryQueryRequest,
  SetMemoryDisabledRequest,
  UpdateMemoryRequest,
  WriteMemoryRequest
} from './memory'
import type {
  Persona,
  PersonaIdRequest,
  PromptTemplate,
  PromptTemplateIdRequest,
  UpsertPersonaRequest,
  UpsertPromptTemplateRequest
} from './promptLibrary'
import type {
  AddVoiceNoteToKnowledgeRequest,
  DocumentIntakeRequest,
  DocumentIntakeResult,
  MicrophonePermissionStatus,
  SaveVoiceNoteRequest,
  SetMicrophonePermissionRequest,
  VoiceNote,
  VoiceNoteIdRequest
} from './voice'
import type {
  ClipboardEntry,
  ClipboardEntryIdRequest,
  ClipboardQueryRequest,
  RenderedSnippet,
  RenderSnippetRequest,
  SetClipboardMonitoringRequest,
  SetClipboardPinnedRequest,
  Snippet,
  SnippetIdRequest,
  UpsertSnippetRequest
} from './clipboard'
import type {
  AddManualPeerRequest,
  PeerDevice,
  PeerIdRequest,
  SendFileToPeerRequest,
  SetPeerTrustRequest
} from './lan'
import type { TransferJob, TransferJobIdRequest } from './transfer'
import type {
  AddManualLanSharePeerRequest,
  LanShareHealth,
  LanShareIdentity,
  LanShareNetworkInterface,
  LanSharePeer,
  LanSharePeerIdRequest,
  LanShareServiceStatus,
  LanShareSettings,
  LanShareTransferJob,
  LanShareTransferJobIdRequest,
  SendLanShareFilesRequest,
  SetLanShareGroupCodeRequest,
  SetLanSharePeerTrustRequest,
  UpdateLanShareSettingsRequest
} from './lanShare'
import type {
  DeleteFileRequest,
  RecoveryCheckpoint,
  RecoveryCheckpointRequest,
  RecoveryDiffResult,
  RecoveryStorageSummary,
  WorkspaceRecoveryRequest,
  WriteFileRequest
} from './recovery'
import type {
  GitBranch,
  GitCheckoutRequest,
  GitCommit,
  GitCommitRequest,
  GitCreateBranchRequest,
  GitDeleteBranchRequest,
  GitDiffRequest,
  GitDiffResult,
  GitFetchRequest,
  GitForcePushRequest,
  GitRemote,
  GitRemoteOperationRequest,
  GitResolveConflictRequest,
  GitRestorePathsRequest,
  GitStagePathsRequest,
  GitStashEntry,
  GitStashPopRequest,
  GitStashSaveRequest,
  GitStatus,
  WorkspaceGitRequest
} from './git'
import type {
  CreateWorkspaceRequest,
  DiscoveredWorkspace,
  Workspace,
  WorkspaceDiscoveryOptions
} from './workspace'
import type {
  AddModelProviderRequest,
  ConnectionTestResult,
  ModelProvider,
  ModelProviderIdRequest,
  ModelCompletionRequest,
  ModelCompletionResult,
  ModelRouteDecision,
  ModelRouteRequest,
  SetModelProviderEnabledRequest,
  LocalModelRequest,
  LocalModelStatus,
  ModelBenchmarkResult
} from './model'
import type {
  CreateWorkflowRunRequest,
  SaveWorkflowRequest,
  UpdateWorkflowRunRequest,
  WorkflowDefinition,
  WorkflowIdRequest,
  WorkflowRun,
  WorkspaceWorkflowRequest
} from './workflow'
import type {
  CreateTerminalRequest,
  HeadlessTerminalRequest,
  HeadlessTerminalResult,
  ListTerminalSessionsRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalResizeRequest,
  TerminalSession,
  TerminalSessionRequest,
  TerminalSnapshot,
  TerminalWriteRequest
} from './terminal'
import type { PowerStateEvent, SystemMetricsSnapshot } from './system'
import type { NetworkDiagnostics } from './network'
import type {
  CrashReport,
  CreateRendererCrashReportRequest,
  DiagnosticsInfo,
  SupportBundleRecord
} from './diagnostics'
import type { UpdateStatus } from './update'
import type {
  CreateUserCurriculumRequest,
  Curriculum,
  CurriculumIdRequest,
  CurriculumProgress,
  UpdateProgressRequest,
  UpdateUserCurriculumRequest
} from './learning'
import type { ControllerSettings, SetControllerSettingsRequest } from './controllerSettings'
import type { DisplaySettings, SetDisplaySettingsRequest } from './displaySettings'
import type {
  LockStatus,
  RemoveLockPinRequest,
  SetLockPinRequest,
  VerifyLockPinRequest,
  VerifyLockPinResult
} from './lock'
import type {
  BrowserPermission,
  BrowserPermissionKeyRequest,
  BrowserPermissionRequest,
  BrowserPermissionResponse,
  BrowserTab,
  BrowserTabIdRequest,
  CreateBrowserTabRequest,
  NavigateBrowserTabRequest,
  SetBrowserTabBoundsRequest,
  WorkspaceBrowserRequest
} from './browser'
import type {
  AddRemoteHostRequest,
  CreateRemoteSessionRequest,
  RemoteConnectionTestResult,
  RemoteHost,
  RemoteHostRequest,
  RemoteSession,
  RemoteSessionDataEvent,
  RemoteSessionExitEvent,
  RemoteSessionRequest,
  RemoteSessionResizeRequest,
  RemoteSessionSnapshot,
  RemoteSessionWriteRequest
} from './remote'
import type {
  AgentDefinition,
  AgentIdRequest,
  AgentRun,
  AgentRunIdRequest,
  AgentToolExecutionRequest,
  AgentToolExecutionResult,
  CreateAgentRequest,
  ListAgentRunsRequest,
  SetAgentEnabledRequest,
  StartAgentRunRequest,
  UpdateAgentRequest,
  WorkspaceAgentRequest
} from './agent'

/**
 * The shape of the real preload bridge (`window.ndx`). Defined here, in
 * shared, rather than in `src/preload/index.ts` — both the preload script
 * and the renderer need this type, and a renderer file importing a type
 * from `src/preload/*.ts` trips TypeScript's composite-project file-listing
 * rule (`tsconfig.web.json` doesn't include preload `.ts` sources, only
 * `.d.ts`). Importing it from `shared` instead avoids that boundary
 * violation entirely.
 */
export interface NdxBridge {
  workspaces: {
    list: () => Promise<NdxResult<Workspace[]>>
    create: (request: CreateWorkspaceRequest) => Promise<NdxResult<Workspace>>
    remove: (id: string) => Promise<NdxResult<null>>
    pickFolder: () => Promise<NdxResult<string | null>>
    discover: (options: WorkspaceDiscoveryOptions) => Promise<NdxResult<DiscoveredWorkspace[]>>
  }
  files: {
    list: (request: ListFilesRequest) => Promise<NdxResult<FileEntry[]>>
    read: (request: ReadFileRequest) => Promise<NdxResult<ReadFileResult>>
    write: (request: WriteFileRequest) => Promise<NdxResult<null>>
    delete: (request: DeleteFileRequest) => Promise<NdxResult<null>>
  }
  recovery: {
    list: (request: WorkspaceRecoveryRequest) => Promise<NdxResult<RecoveryCheckpoint[]>>
    diff: (request: RecoveryCheckpointRequest) => Promise<NdxResult<RecoveryDiffResult>>
    restore: (request: RecoveryCheckpointRequest) => Promise<NdxResult<null>>
    storageSummary: (
      request: WorkspaceRecoveryRequest
    ) => Promise<NdxResult<RecoveryStorageSummary>>
  }
  backups: {
    list: () => Promise<NdxResult<BackupRecord[]>>
    create: (request?: CreateBackupRequest) => Promise<NdxResult<BackupRecord>>
    verify: (request: BackupIdRequest) => Promise<NdxResult<BackupVerification>>
    restore: (request: BackupIdRequest) => Promise<NdxResult<BackupRestoreResult>>
    importLocal: () => Promise<NdxResult<BackupRecord | null>>
    migrate: () => Promise<NdxResult<BackupMigrationReport>>
    getSchedule: () => Promise<NdxResult<BackupScheduleSettings>>
    setSchedule: (request: SetBackupScheduleRequest) => Promise<NdxResult<BackupScheduleSettings>>
  }
  git: {
    status: (request: WorkspaceGitRequest) => Promise<NdxResult<GitStatus>>
    diff: (request: GitDiffRequest) => Promise<NdxResult<GitDiffResult>>
    stage: (request: GitStagePathsRequest) => Promise<NdxResult<null>>
    unstage: (request: GitStagePathsRequest) => Promise<NdxResult<null>>
    commit: (request: GitCommitRequest) => Promise<NdxResult<null>>
    branches: (request: WorkspaceGitRequest) => Promise<NdxResult<GitBranch[]>>
    checkout: (request: GitCheckoutRequest) => Promise<NdxResult<null>>
    log: (request: WorkspaceGitRequest) => Promise<NdxResult<GitCommit[]>>
    remotes: (request: WorkspaceGitRequest) => Promise<NdxResult<GitRemote[]>>
    fetch: (request: GitFetchRequest) => Promise<NdxResult<null>>
    pull: (request: GitRemoteOperationRequest) => Promise<NdxResult<null>>
    push: (request: GitRemoteOperationRequest) => Promise<NdxResult<null>>
    stashSave: (request: GitStashSaveRequest) => Promise<NdxResult<null>>
    stashList: (request: WorkspaceGitRequest) => Promise<NdxResult<GitStashEntry[]>>
    stashPop: (request: GitStashPopRequest) => Promise<NdxResult<null>>
    restore: (request: GitRestorePathsRequest) => Promise<NdxResult<null>>
    createBranch: (request: GitCreateBranchRequest) => Promise<NdxResult<null>>
    deleteBranch: (request: GitDeleteBranchRequest) => Promise<NdxResult<null>>
    forcePush: (request: GitForcePushRequest) => Promise<NdxResult<null>>
    resolveConflict: (request: GitResolveConflictRequest) => Promise<NdxResult<null>>
  }
  terminal: {
    create: (request: CreateTerminalRequest) => Promise<NdxResult<TerminalSession>>
    list: (request: ListTerminalSessionsRequest) => Promise<NdxResult<TerminalSession[]>>
    snapshot: (request: TerminalSessionRequest) => Promise<NdxResult<TerminalSnapshot>>
    write: (request: TerminalWriteRequest) => Promise<NdxResult<null>>
    resize: (request: TerminalResizeRequest) => Promise<NdxResult<null>>
    terminate: (request: TerminalSessionRequest) => Promise<NdxResult<null>>
    runHeadless: (request: HeadlessTerminalRequest) => Promise<NdxResult<HeadlessTerminalResult>>
    onData: (listener: (event: TerminalDataEvent) => void) => () => void
    onExit: (listener: (event: TerminalExitEvent) => void) => () => void
  }
  workflows: {
    list: (request: WorkspaceWorkflowRequest) => Promise<NdxResult<WorkflowDefinition[]>>
    save: (request: SaveWorkflowRequest) => Promise<NdxResult<WorkflowDefinition>>
    remove: (request: WorkflowIdRequest) => Promise<NdxResult<null>>
  }
  workflowRuns: {
    list: (request: WorkspaceWorkflowRequest) => Promise<NdxResult<WorkflowRun[]>>
    create: (request: CreateWorkflowRunRequest) => Promise<NdxResult<WorkflowRun>>
    update: (request: UpdateWorkflowRunRequest) => Promise<NdxResult<null>>
  }
  modelProviders: {
    list: () => Promise<NdxResult<ModelProvider[]>>
    add: (request: AddModelProviderRequest) => Promise<NdxResult<ModelProvider>>
    remove: (request: ModelProviderIdRequest) => Promise<NdxResult<null>>
    testConnection: (request: ModelProviderIdRequest) => Promise<NdxResult<ConnectionTestResult>>
    setEnabled: (request: SetModelProviderEnabledRequest) => Promise<NdxResult<ModelProvider>>
    route: (request: ModelRouteRequest) => Promise<NdxResult<ModelRouteDecision>>
    complete: (request: ModelCompletionRequest) => Promise<NdxResult<ModelCompletionResult>>
    localStatus: (request: ModelProviderIdRequest) => Promise<NdxResult<LocalModelStatus>>
    loadLocal: (request: LocalModelRequest) => Promise<NdxResult<null>>
    unloadLocal: (request: LocalModelRequest) => Promise<NdxResult<null>>
    benchmarkLocal: (request: LocalModelRequest) => Promise<NdxResult<ModelBenchmarkResult>>
  }
  agents: {
    list: (request: WorkspaceAgentRequest) => Promise<NdxResult<AgentDefinition[]>>
    create: (request: CreateAgentRequest) => Promise<NdxResult<AgentDefinition>>
    update: (request: UpdateAgentRequest) => Promise<NdxResult<AgentDefinition>>
    setEnabled: (request: SetAgentEnabledRequest) => Promise<NdxResult<AgentDefinition>>
    remove: (request: AgentIdRequest) => Promise<NdxResult<null>>
  }
  agentRuns: {
    list: (request: ListAgentRunsRequest) => Promise<NdxResult<AgentRun[]>>
    get: (request: AgentRunIdRequest) => Promise<NdxResult<AgentRun>>
    start: (request: StartAgentRunRequest) => Promise<NdxResult<AgentRun>>
    pause: (request: AgentRunIdRequest) => Promise<NdxResult<AgentRun>>
    resume: (request: AgentRunIdRequest) => Promise<NdxResult<AgentRun>>
    cancel: (request: AgentRunIdRequest) => Promise<NdxResult<AgentRun>>
    onUpdate: (listener: (run: AgentRun) => void) => () => void
    onToolRequest: (listener: (request: AgentToolExecutionRequest) => void) => () => void
    reportToolResult: (result: AgentToolExecutionResult) => Promise<NdxResult<null>>
  }
  system: {
    collectMetrics: () => Promise<NdxResult<SystemMetricsSnapshot>>
  }
  network: {
    getDiagnostics: () => Promise<NdxResult<NetworkDiagnostics>>
  }
  diagnostics: {
    get: () => Promise<NdxResult<DiagnosticsInfo>>
    createSupportBundle: () => Promise<NdxResult<SupportBundleRecord>>
    listCrashReports: () => Promise<NdxResult<CrashReport[]>>
    recordRendererCrashReport: (
      request: CreateRendererCrashReportRequest
    ) => Promise<NdxResult<CrashReport>>
  }
  power: {
    restartApp: () => Promise<NdxResult<null>>
    quitApp: () => Promise<NdxResult<null>>
    onStateEvent: (listener: (event: PowerStateEvent) => void) => () => void
  }
  controllerSettings: {
    get: () => Promise<NdxResult<ControllerSettings>>
    set: (request: SetControllerSettingsRequest) => Promise<NdxResult<ControllerSettings>>
  }
  displaySettings: {
    get: () => Promise<NdxResult<DisplaySettings>>
    set: (request: SetDisplaySettingsRequest) => Promise<NdxResult<DisplaySettings>>
  }
  lock: {
    getStatus: () => Promise<NdxResult<LockStatus>>
    setPin: (request: SetLockPinRequest) => Promise<NdxResult<LockStatus>>
    removePin: (request: RemoveLockPinRequest) => Promise<NdxResult<LockStatus>>
    verifyPin: (request: VerifyLockPinRequest) => Promise<NdxResult<VerifyLockPinResult>>
  }
  vault: {
    list: () => Promise<NdxResult<VaultItem[]>>
    create: (request: CreateVaultItemRequest) => Promise<NdxResult<VaultItem>>
    update: (request: UpdateVaultItemRequest) => Promise<NdxResult<VaultItem>>
    rotate: (request: RotateVaultItemRequest) => Promise<NdxResult<VaultItem>>
    reveal: (request: VaultItemIdRequest) => Promise<NdxResult<RevealVaultItemResult>>
    remove: (request: VaultItemIdRequest) => Promise<NdxResult<null>>
    listAccessLog: () => Promise<NdxResult<VaultAccessLogEntry[]>>
  }
  profiles: {
    getState: () => Promise<NdxResult<ProfileState>>
    create: (request: CreateProfileRequest) => Promise<NdxResult<UserProfile>>
    update: (request: UpdateProfileRequest) => Promise<NdxResult<UserProfile>>
    remove: (request: ProfileIdRequest) => Promise<NdxResult<ProfileState>>
    startSession: (request: StartProfileSessionRequest) => Promise<NdxResult<ProfileState>>
    endPrivateSession: () => Promise<NdxResult<ProfileState>>
  }
  continuity: {
    getState: () => Promise<NdxResult<ContinuityState>>
    setSafeMode: (request: SetSafeModeRequest) => Promise<NdxResult<ContinuityState>>
    recordPowerEvent: (request: RecordPowerEventRequest) => Promise<NdxResult<ContinuityPowerEvent>>
    saveSessionSnapshot: (
      request: SaveSessionSnapshotRequest
    ) => Promise<NdxResult<ContinuityState>>
  }
  privacy: {
    getDataMap: () => Promise<NdxResult<DataMapEntry[]>>
    clearDataCategory: (
      request: ClearDataCategoryRequest
    ) => Promise<NdxResult<ClearDataCategoryResult>>
  }
  troubleshooter: {
    runCheck: (request: RunTroubleshooterCheckRequest) => Promise<NdxResult<TroubleshooterResult>>
  }
  screenshot: {
    capture: (request: CaptureScreenshotRequest) => Promise<NdxResult<ScreenshotRecord>>
    list: () => Promise<NdxResult<ScreenshotRecord[]>>
    copyToClipboard: (request: ScreenshotIdRequest) => Promise<NdxResult<null>>
    remove: (request: ScreenshotIdRequest) => Promise<NdxResult<null>>
    addToWorkspace: (request: AddScreenshotToWorkspaceRequest) => Promise<NdxResult<string>>
  }
  presentationMode: {
    get: () => Promise<NdxResult<PresentationModeSettings>>
    set: (request: SetPresentationModeRequest) => Promise<NdxResult<PresentationModeSettings>>
  }
  notificationPolicy: {
    get: () => Promise<NdxResult<NotificationPolicy>>
    set: (request: SetNotificationPolicyRequest) => Promise<NdxResult<NotificationPolicy>>
  }
  recording: {
    listSources: () => Promise<NdxResult<RecordingSource[]>>
    begin: (request: BeginRecordingRequest) => Promise<NdxResult<BeginRecordingResult>>
    appendChunk: (request: AppendRecordingChunkRequest) => Promise<NdxResult<null>>
    finish: (request: RecordingIdRequest) => Promise<NdxResult<RecordingRecord>>
    cancel: (request: RecordingIdRequest) => Promise<NdxResult<null>>
    list: () => Promise<NdxResult<RecordingRecord[]>>
    remove: (request: RecordingIdRequest) => Promise<NdxResult<null>>
  }
  applicationPolicy: {
    get: (request: ApplicationPolicyIdRequest) => Promise<NdxResult<ApplicationPolicy | null>>
    set: (request: SetApplicationPolicyRequest) => Promise<NdxResult<ApplicationPolicy>>
  }
  kioskMode: {
    get: () => Promise<NdxResult<KioskModeSettings>>
    set: (request: SetKioskModeRequest) => Promise<NdxResult<KioskModeSettings>>
  }
  trustedPublisher: {
    list: () => Promise<NdxResult<TrustedPublisherRecord[]>>
    add: (request: AddTrustedPublisherRequest) => Promise<NdxResult<TrustedPublisherRecord>>
    revoke: (
      request: TrustedPublisherFingerprintRequest
    ) => Promise<NdxResult<TrustedPublisherRecord>>
    unrevoke: (
      request: TrustedPublisherFingerprintRequest
    ) => Promise<NdxResult<TrustedPublisherRecord>>
  }
  steamShortcuts: {
    listProfiles: () => Promise<NdxResult<SteamUserProfile[]>>
    list: (request: SelectSteamProfileRequest) => Promise<NdxResult<SteamShortcutEntry[]>>
    create: (request: CreateSteamShortcutRequest) => Promise<NdxResult<SteamShortcutEntry[]>>
    update: (request: UpdateSteamShortcutRequest) => Promise<NdxResult<SteamShortcutEntry[]>>
    remove: (request: RemoveSteamShortcutRequest) => Promise<NdxResult<SteamShortcutEntry[]>>
    listBackups: (request: SelectSteamProfileRequest) => Promise<NdxResult<SteamShortcutBackup[]>>
    restoreBackup: (
      request: RestoreSteamShortcutBackupRequest
    ) => Promise<NdxResult<SteamShortcutEntry[]>>
    checkRunning: (request: SelectSteamProfileRequest) => Promise<NdxResult<SteamRunningState>>
  }
  browserTabs: {
    list: (request: WorkspaceBrowserRequest) => Promise<NdxResult<BrowserTab[]>>
    create: (request: CreateBrowserTabRequest) => Promise<NdxResult<BrowserTab>>
    setActive: (request: BrowserTabIdRequest) => Promise<NdxResult<BrowserTab>>
    navigate: (request: NavigateBrowserTabRequest) => Promise<NdxResult<null>>
    goBack: (request: BrowserTabIdRequest) => Promise<NdxResult<null>>
    goForward: (request: BrowserTabIdRequest) => Promise<NdxResult<null>>
    reload: (request: BrowserTabIdRequest) => Promise<NdxResult<null>>
    setBounds: (request: SetBrowserTabBoundsRequest) => Promise<NdxResult<null>>
    remove: (request: BrowserTabIdRequest) => Promise<NdxResult<null>>
    openExternal: (url: string) => Promise<NdxResult<null>>
    onUpdate: (listener: (tab: BrowserTab) => void) => () => void
    onPermissionRequest: (listener: (request: BrowserPermissionRequest) => void) => () => void
    respondToPermissionRequest: (request: BrowserPermissionResponse) => Promise<NdxResult<null>>
    listPermissions: () => Promise<NdxResult<BrowserPermission[]>>
    revokePermission: (request: BrowserPermissionKeyRequest) => Promise<NdxResult<null>>
  }
  remoteHosts: {
    list: () => Promise<NdxResult<RemoteHost[]>>
    add: (request: AddRemoteHostRequest) => Promise<NdxResult<RemoteHost>>
    remove: (request: RemoteHostRequest) => Promise<NdxResult<null>>
    testConnection: (request: RemoteHostRequest) => Promise<NdxResult<RemoteConnectionTestResult>>
  }
  remoteSessions: {
    create: (request: CreateRemoteSessionRequest) => Promise<NdxResult<RemoteSession>>
    snapshot: (request: RemoteSessionRequest) => Promise<NdxResult<RemoteSessionSnapshot>>
    write: (request: RemoteSessionWriteRequest) => Promise<NdxResult<null>>
    resize: (request: RemoteSessionResizeRequest) => Promise<NdxResult<null>>
    terminate: (request: RemoteSessionRequest) => Promise<NdxResult<null>>
    onData: (listener: (event: RemoteSessionDataEvent) => void) => () => void
    onExit: (listener: (event: RemoteSessionExitEvent) => void) => () => void
  }
  update: {
    getStatus: () => Promise<NdxResult<UpdateStatus>>
    check: () => Promise<NdxResult<UpdateStatus>>
  }
  learning: {
    listCurricula: () => Promise<NdxResult<Curriculum[]>>
    getCurriculum: (request: CurriculumIdRequest) => Promise<NdxResult<Curriculum>>
    createUserCurriculum: (request: CreateUserCurriculumRequest) => Promise<NdxResult<Curriculum>>
    updateUserCurriculum: (request: UpdateUserCurriculumRequest) => Promise<NdxResult<Curriculum>>
    deleteUserCurriculum: (request: CurriculumIdRequest) => Promise<NdxResult<null>>
    getProgress: () => Promise<NdxResult<CurriculumProgress>>
    updateProgress: (request: UpdateProgressRequest) => Promise<NdxResult<CurriculumProgress>>
  }
  capabilities: {
    list: () => Promise<NdxResult<CapabilityState[]>>
    refresh: () => Promise<NdxResult<CapabilityState[]>>
  }
  features: {
    list: () => Promise<NdxResult<FeatureState[]>>
  }
  applications: {
    list: () => Promise<NdxResult<ApplicationRecord[]>>
    upsert: (request: UpsertApplicationRequest) => Promise<NdxResult<ApplicationRecord>>
    remove: (request: ApplicationIdRequest) => Promise<NdxResult<null>>
    discover: (request?: DiscoverApplicationsRequest) => Promise<NdxResult<ApplicationRecord[]>>
    launch: (request: LaunchApplicationRequest) => Promise<NdxResult<LaunchResult>>
    registerAppImage: () => Promise<NdxResult<ApplicationRecord | null>>
  }
  devices: {
    list: () => Promise<NdxResult<DeviceRecord[]>>
    inventory: () => Promise<NdxResult<DeviceInventoryReport>>
    upsert: (request: UpsertDeviceRequest) => Promise<NdxResult<DeviceRecord>>
    remove: (request: DeviceIdRequest) => Promise<NdxResult<null>>
  }
  packages: {
    flatpakSearch: (request: FlatpakSearchRequest) => Promise<NdxResult<FlatpakRemoteApp[]>>
    flatpakPermissions: (request: FlatpakRefRequest) => Promise<NdxResult<FlatpakPermissionPreview>>
    flatpakInstall: (request: FlatpakRefRequest) => Promise<NdxResult<TransactionRecord>>
    flatpakUpdate: (request: FlatpakRefRequest) => Promise<NdxResult<TransactionRecord>>
    flatpakUninstall: (request: FlatpakRefRequest) => Promise<NdxResult<TransactionRecord>>
    listTransactions: () => Promise<NdxResult<TransactionRecord[]>>
    cancelTransaction: (request: TransactionIdRequest) => Promise<NdxResult<boolean>>
    onTransactionUpdate: (listener: (transactions: TransactionRecord[]) => void) => () => void
  }
  extensions: {
    list: () => Promise<NdxResult<ExtensionRecord[]>>
    previewInstall: (
      request: PreviewExtensionInstallRequest
    ) => Promise<NdxResult<ExtensionInstallPreview>>
    install: (request: InstallExtensionRequest) => Promise<NdxResult<ExtensionRecord>>
    setEnabled: (request: SetExtensionEnabledRequest) => Promise<NdxResult<ExtensionRecord>>
    remove: (request: ExtensionIdRequest) => Promise<NdxResult<null>>
    clearQuarantine: (request: ExtensionIdRequest) => Promise<NdxResult<ExtensionRecord>>
    onHealthEvent: (listener: (event: ExtensionHealthEvent) => void) => () => void
  }
  knowledge: {
    listSources: () => Promise<NdxResult<KnowledgeSource[]>>
    addSource: (request: AddKnowledgeSourceRequest) => Promise<NdxResult<KnowledgeSource>>
    removeSource: (request: KnowledgeSourceIdRequest) => Promise<NdxResult<null>>
    reindexSource: (request: KnowledgeSourceIdRequest) => Promise<NdxResult<KnowledgeSource>>
    setSourcePaused: (
      request: SetKnowledgeSourcePausedRequest
    ) => Promise<NdxResult<KnowledgeSource>>
    query: (request: KnowledgeQueryRequest) => Promise<NdxResult<KnowledgeQueryResult[]>>
    addNote: (request: AddKnowledgeNoteRequest) => Promise<NdxResult<KnowledgeSource>>
  }
  memory: {
    list: (request?: MemoryQueryRequest) => Promise<NdxResult<MemoryItem[]>>
    write: (request: WriteMemoryRequest) => Promise<NdxResult<MemoryItem>>
    update: (request: UpdateMemoryRequest) => Promise<NdxResult<MemoryItem>>
    delete: (request: MemoryIdRequest) => Promise<NdxResult<null>>
    setDisabled: (request: SetMemoryDisabledRequest) => Promise<NdxResult<null>>
    clearScope: (request: ClearMemoryScopeRequest) => Promise<NdxResult<number>>
    export: (request?: MemoryQueryRequest) => Promise<NdxResult<MemoryExport>>
  }
  promptLibrary: {
    listTemplates: () => Promise<NdxResult<PromptTemplate[]>>
    upsertTemplate: (request: UpsertPromptTemplateRequest) => Promise<NdxResult<PromptTemplate>>
    removeTemplate: (request: PromptTemplateIdRequest) => Promise<NdxResult<null>>
    listPersonas: () => Promise<NdxResult<Persona[]>>
    upsertPersona: (request: UpsertPersonaRequest) => Promise<NdxResult<Persona>>
    removePersona: (request: PersonaIdRequest) => Promise<NdxResult<null>>
  }
  voice: {
    getMicrophoneStatus: () => Promise<NdxResult<MicrophonePermissionStatus>>
    setMicrophoneGranted: (
      request: SetMicrophonePermissionRequest
    ) => Promise<NdxResult<MicrophonePermissionStatus>>
    listVoiceNotes: () => Promise<NdxResult<VoiceNote[]>>
    saveVoiceNote: (request: SaveVoiceNoteRequest) => Promise<NdxResult<VoiceNote>>
    removeVoiceNote: (request: VoiceNoteIdRequest) => Promise<NdxResult<null>>
    deleteVoiceNoteAudio: (request: VoiceNoteIdRequest) => Promise<NdxResult<VoiceNote>>
    addVoiceNoteToKnowledge: (
      request: AddVoiceNoteToKnowledgeRequest
    ) => Promise<NdxResult<KnowledgeSource>>
    intakeDocument: (request: DocumentIntakeRequest) => Promise<NdxResult<DocumentIntakeResult>>
  }
  clipboard: {
    list: (request?: ClipboardQueryRequest) => Promise<NdxResult<ClipboardEntry[]>>
    setPinned: (request: SetClipboardPinnedRequest) => Promise<NdxResult<ClipboardEntry>>
    remove: (request: ClipboardEntryIdRequest) => Promise<NdxResult<null>>
    clear: () => Promise<NdxResult<null>>
    setMonitoring: (request: SetClipboardMonitoringRequest) => Promise<NdxResult<null>>
    getMonitoring: () => Promise<NdxResult<boolean>>
  }
  snippets: {
    list: () => Promise<NdxResult<Snippet[]>>
    upsert: (request: UpsertSnippetRequest) => Promise<NdxResult<Snippet>>
    remove: (request: SnippetIdRequest) => Promise<NdxResult<null>>
    render: (request: RenderSnippetRequest) => Promise<NdxResult<RenderedSnippet>>
  }
  peers: {
    list: () => Promise<NdxResult<PeerDevice[]>>
    addManual: (request: AddManualPeerRequest) => Promise<NdxResult<PeerDevice>>
    remove: (request: PeerIdRequest) => Promise<NdxResult<null>>
    setTrust: (request: SetPeerTrustRequest) => Promise<NdxResult<PeerDevice>>
    sendFile: (request: SendFileToPeerRequest) => Promise<NdxResult<TransferJob>>
    onUpdate: (listener: (peers: PeerDevice[]) => void) => () => void
  }
  transferJobs: {
    list: () => Promise<NdxResult<TransferJob[]>>
    cancel: (request: TransferJobIdRequest) => Promise<NdxResult<boolean>>
    onUpdate: (listener: (jobs: TransferJob[]) => void) => () => void
  }
  lanShare: {
    getIdentity: () => Promise<NdxResult<LanShareIdentity>>
    getServiceStatus: () => Promise<NdxResult<LanShareServiceStatus>>
    getSettings: () => Promise<NdxResult<LanShareSettings>>
    updateSettings: (request: UpdateLanShareSettingsRequest) => Promise<NdxResult<LanShareSettings>>
    setGroupCode: (request: SetLanShareGroupCodeRequest) => Promise<NdxResult<LanShareSettings>>
    listPeers: () => Promise<NdxResult<LanSharePeer[]>>
    addManualPeer: (request: AddManualLanSharePeerRequest) => Promise<NdxResult<LanSharePeer>>
    removePeer: (request: LanSharePeerIdRequest) => Promise<NdxResult<null>>
    setPeerTrust: (request: SetLanSharePeerTrustRequest) => Promise<NdxResult<LanSharePeer>>
    listTransferJobs: () => Promise<NdxResult<LanShareTransferJob[]>>
    cancelTransferJob: (request: LanShareTransferJobIdRequest) => Promise<NdxResult<boolean>>
    onTransferJobUpdate: (listener: (jobs: LanShareTransferJob[]) => void) => () => void
    startService: () => Promise<NdxResult<LanShareServiceStatus>>
    stopService: () => Promise<NdxResult<LanShareServiceStatus>>
    onServiceUpdate: (listener: (status: LanShareServiceStatus) => void) => () => void
    listInterfaces: () => Promise<NdxResult<LanShareNetworkInterface[]>>
    getHealth: () => Promise<NdxResult<LanShareHealth>>
    sendFiles: (request: SendLanShareFilesRequest) => Promise<NdxResult<LanShareTransferJob>>
    acceptTransfer: (
      request: LanShareTransferJobIdRequest
    ) => Promise<NdxResult<LanShareTransferJob>>
    rejectTransfer: (
      request: LanShareTransferJobIdRequest
    ) => Promise<NdxResult<LanShareTransferJob>>
    pickFiles: () => Promise<NdxResult<string[]>>
  }
}
