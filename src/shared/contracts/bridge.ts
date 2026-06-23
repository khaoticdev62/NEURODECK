import type { FileEntry, ListFilesRequest, ReadFileRequest, ReadFileResult } from './file'
import type { NdxResult } from './error'
import type {
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
  GitDiffRequest,
  GitDiffResult,
  GitFetchRequest,
  GitRemote,
  GitRemoteOperationRequest,
  GitStagePathsRequest,
  GitStashEntry,
  GitStashPopRequest,
  GitStashSaveRequest,
  GitStatus,
  WorkspaceGitRequest
} from './git'
import type { CreateWorkspaceRequest, Workspace } from './workspace'
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
  ListTerminalSessionsRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalResizeRequest,
  TerminalSession,
  TerminalSessionRequest,
  TerminalSnapshot,
  TerminalWriteRequest
} from './terminal'
import type { SystemMetricsSnapshot } from './system'
import type { DiagnosticsInfo } from './diagnostics'
import type { ControllerSettings, SetControllerSettingsRequest } from './controllerSettings'
import type { DisplaySettings, SetDisplaySettingsRequest } from './displaySettings'
import type {
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
  }
  files: {
    list: (request: ListFilesRequest) => Promise<NdxResult<FileEntry[]>>
    read: (request: ReadFileRequest) => Promise<NdxResult<ReadFileResult>>
    write: (request: WriteFileRequest) => Promise<NdxResult<null>>
  }
  recovery: {
    list: (request: WorkspaceRecoveryRequest) => Promise<NdxResult<RecoveryCheckpoint[]>>
    diff: (request: RecoveryCheckpointRequest) => Promise<NdxResult<RecoveryDiffResult>>
    restore: (request: RecoveryCheckpointRequest) => Promise<NdxResult<null>>
    storageSummary: (
      request: WorkspaceRecoveryRequest
    ) => Promise<NdxResult<RecoveryStorageSummary>>
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
  }
  terminal: {
    create: (request: CreateTerminalRequest) => Promise<NdxResult<TerminalSession>>
    list: (request: ListTerminalSessionsRequest) => Promise<NdxResult<TerminalSession[]>>
    snapshot: (request: TerminalSessionRequest) => Promise<NdxResult<TerminalSnapshot>>
    write: (request: TerminalWriteRequest) => Promise<NdxResult<null>>
    resize: (request: TerminalResizeRequest) => Promise<NdxResult<null>>
    terminate: (request: TerminalSessionRequest) => Promise<NdxResult<null>>
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
  diagnostics: {
    get: () => Promise<NdxResult<DiagnosticsInfo>>
  }
  power: {
    restartApp: () => Promise<NdxResult<null>>
    quitApp: () => Promise<NdxResult<null>>
  }
  controllerSettings: {
    get: () => Promise<NdxResult<ControllerSettings>>
    set: (request: SetControllerSettingsRequest) => Promise<NdxResult<ControllerSettings>>
  }
  displaySettings: {
    get: () => Promise<NdxResult<DisplaySettings>>
    set: (request: SetDisplaySettingsRequest) => Promise<NdxResult<DisplaySettings>>
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
}
