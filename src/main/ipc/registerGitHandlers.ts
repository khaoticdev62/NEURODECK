import { ipcMain } from 'electron'
import {
  gitCheckoutRequestSchema,
  gitCommitRequestSchema,
  gitDiffRequestSchema,
  gitFetchRequestSchema,
  gitRemoteOperationRequestSchema,
  gitStagePathsRequestSchema,
  gitStashPopRequestSchema,
  gitStashSaveRequestSchema,
  IPC_CHANNELS,
  ndxError,
  workspaceGitRequestSchema,
  type GitBranch,
  type GitCommit,
  type GitDiffResult,
  type GitRemote,
  type GitStashEntry,
  type GitStatus,
  type NdxResult
} from '@shared/contracts'
import type { GitService } from '../../core/git/GitService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/** Real handlers backed by `GitService`, scoped to a workspace's root the same way file handlers are — never an arbitrary path from the renderer. */
export function registerGitHandlers(gitService: GitService, workspaceStore: WorkspaceStore): void {
  async function resolveRoot(workspaceId: string): Promise<string | null> {
    const workspace = await workspaceStore.get(workspaceId)
    return workspace?.rootPath ?? null
  }

  ipcMain.handle(
    IPC_CHANNELS.gitStatus,
    async (_event, payload: unknown): Promise<NdxResult<GitStatus>> => {
      const parsed = workspaceGitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        return { ok: true, data: await gitService.status(root) }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitDiff,
    async (_event, payload: unknown): Promise<NdxResult<GitDiffResult>> => {
      const parsed = gitDiffRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        const diff = await gitService.diff(root, parsed.data.path, parsed.data.staged)
        return { ok: true, data: { diff } }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitStage,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitStagePathsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.stage(root, parsed.data.paths)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitUnstage,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitStagePathsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.unstage(root, parsed.data.paths)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitCommit,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitCommitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.commit(root, parsed.data.message)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitBranches,
    async (_event, payload: unknown): Promise<NdxResult<GitBranch[]>> => {
      const parsed = workspaceGitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        return { ok: true, data: await gitService.branches(root) }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitCheckout,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitCheckoutRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.checkout(root, parsed.data.branch)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitLog,
    async (_event, payload: unknown): Promise<NdxResult<GitCommit[]>> => {
      const parsed = workspaceGitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        return { ok: true, data: await gitService.log(root) }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitRemotes,
    async (_event, payload: unknown): Promise<NdxResult<GitRemote[]>> => {
      const parsed = workspaceGitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        return { ok: true, data: await gitService.remotes(root) }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitFetch,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitFetchRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.fetch(root, parsed.data.remote)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitPull,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitRemoteOperationRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.pull(root, parsed.data.remote, parsed.data.branch)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitPush,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitRemoteOperationRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.push(root, parsed.data.remote, parsed.data.branch)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitStashSave,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitStashSaveRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.stashSave(root, parsed.data.message)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitStashList,
    async (_event, payload: unknown): Promise<NdxResult<GitStashEntry[]>> => {
      const parsed = workspaceGitRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        return { ok: true, data: await gitService.stashList(root) }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitStashPop,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitStashPopRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.stashPop(root, parsed.data.index)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )
}

function invalidRequest(): NdxResult<never> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That Git request is invalid.')
  }
}

function workspaceNotFound(): NdxResult<never> {
  return {
    ok: false,
    error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
  }
}

function toGitError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'git-operation-failed', message, { message })
}
