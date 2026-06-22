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
  NdxResult,
  WorkspaceGitRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getGitStatus(request: WorkspaceGitRequest): Promise<NdxResult<GitStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.status(request)
}

export async function getGitDiff(request: GitDiffRequest): Promise<NdxResult<GitDiffResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.diff(request)
}

export async function stageGitPaths(request: GitStagePathsRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.stage(request)
}

export async function unstageGitPaths(request: GitStagePathsRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.unstage(request)
}

export async function commitGit(request: GitCommitRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.commit(request)
}

export async function listGitBranches(
  request: WorkspaceGitRequest
): Promise<NdxResult<GitBranch[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.branches(request)
}

export async function checkoutGitBranch(request: GitCheckoutRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.checkout(request)
}

export async function getGitLog(request: WorkspaceGitRequest): Promise<NdxResult<GitCommit[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.log(request)
}

export async function listGitRemotes(
  request: WorkspaceGitRequest
): Promise<NdxResult<GitRemote[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.remotes(request)
}

export async function fetchGit(request: GitFetchRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.fetch(request)
}

export async function pullGit(request: GitRemoteOperationRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.pull(request)
}

export async function pushGit(request: GitRemoteOperationRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.push(request)
}

export async function stashSaveGit(request: GitStashSaveRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.stashSave(request)
}

export async function listGitStashes(
  request: WorkspaceGitRequest
): Promise<NdxResult<GitStashEntry[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.stashList(request)
}

export async function popGitStash(request: GitStashPopRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.git.stashPop(request)
}
