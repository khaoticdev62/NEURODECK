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
}
