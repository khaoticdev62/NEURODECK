import type {
  GitBranch,
  GitCheckoutRequest,
  GitCommit,
  GitCommitRequest,
  GitDiffRequest,
  GitDiffResult,
  GitStagePathsRequest,
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
