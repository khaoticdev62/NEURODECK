import { ipcMain } from 'electron'
import {
  gitCheckoutRequestSchema,
  gitCommitRequestSchema,
  gitCreateBranchRequestSchema,
  gitDeleteBranchRequestSchema,
  gitDiffRequestSchema,
  gitFetchRequestSchema,
  gitForcePushRequestSchema,
  gitRemoteOperationRequestSchema,
  gitResolveConflictRequestSchema,
  gitRestorePathsRequestSchema,
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
import type { FileService } from '../../core/files/FileService'
import type { GitService } from '../../core/git/GitService'
import type { RecoveryService } from '../../core/recovery/RecoveryService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/**
 * Real handlers backed by `GitService`, scoped to a workspace's root the
 * same way file handlers are — never an arbitrary path from the renderer.
 * `gitRestore` orchestrates `FileService` + `RecoveryService` directly here
 * (the same pattern `registerFileHandlers.ts`'s `fileWrite` uses) so a
 * recovery checkpoint of each path's current content is always recorded
 * before the discard runs — there is no code path to `GitService.restore()`
 * that skips it.
 */
export function registerGitHandlers(
  gitService: GitService,
  workspaceStore: WorkspaceStore,
  fileService: FileService,
  recoveryService: RecoveryService
): void {
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

  ipcMain.handle(
    IPC_CHANNELS.gitRestore,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitRestorePathsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) return workspaceNotFound()
      try {
        for (const relativePath of parsed.data.paths) {
          const previousContent = await fileService.readIfExists(workspace.rootPath, relativePath)
          await recoveryService.recordCheckpoint(
            workspace.id,
            relativePath,
            previousContent,
            'Discarded uncommitted Git changes',
            'git-restore',
            'manually-recoverable'
          )
        }
        await gitService.restore(workspace.rootPath, parsed.data.paths)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitBranchCreate,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitCreateBranchRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.createBranch(root, parsed.data.name, parsed.data.fromRef)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitBranchDelete,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitDeleteBranchRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.deleteBranch(root, parsed.data.name, parsed.data.force)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitForcePush,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitForcePushRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.forcePush(root, parsed.data.remote, parsed.data.branch)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toGitError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.gitResolveConflict,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = gitResolveConflictRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const root = await resolveRoot(parsed.data.workspaceId)
      if (!root) return workspaceNotFound()
      try {
        await gitService.resolveConflict(root, parsed.data.path, parsed.data.resolution)
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
