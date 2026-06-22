import { ipcMain } from 'electron'
import { createTwoFilesPatch } from 'diff'
import {
  IPC_CHANNELS,
  ndxError,
  recoveryCheckpointRequestSchema,
  workspaceRecoveryRequestSchema,
  type NdxResult,
  type RecoveryCheckpoint,
  type RecoveryDiffResult,
  type RecoveryStorageSummary
} from '@shared/contracts'
import { PathOutsideWorkspaceError, type FileService } from '../../core/files/FileService'
import type { RecoveryService } from '../../core/recovery/RecoveryService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/** Real handlers backed by `RecoveryService` — restore re-uses `FileService.write()`, so restoring is itself recorded as a new checkpoint (a real "redo" path, not a special case). */
export function registerRecoveryHandlers(
  recoveryService: RecoveryService,
  fileService: FileService,
  workspaceStore: WorkspaceStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.recoveryList,
    async (_event, payload: unknown): Promise<NdxResult<RecoveryCheckpoint[]>> => {
      const parsed = workspaceRecoveryRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await recoveryService.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recoveryDiff,
    async (_event, payload: unknown): Promise<NdxResult<RecoveryDiffResult>> => {
      const parsed = recoveryCheckpointRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()

      const checkpoint = await recoveryService.getCheckpoint(
        parsed.data.workspaceId,
        parsed.data.checkpointId
      )
      if (!checkpoint) {
        return {
          ok: false,
          error: ndxError(
            'not-found',
            'checkpoint-not-found',
            'That recovery checkpoint no longer exists.'
          )
        }
      }

      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) return workspaceNotFound()

      const before =
        (await recoveryService.getSnapshotContent(
          parsed.data.workspaceId,
          parsed.data.checkpointId
        )) ?? ''
      const after =
        (await fileService.readIfExists(workspace.rootPath, checkpoint.relativePath)) ?? ''
      const diff = createTwoFilesPatch(
        checkpoint.relativePath,
        checkpoint.relativePath,
        before,
        after,
        'before',
        'after'
      )
      return { ok: true, data: { diff, hadPreviousContent: checkpoint.hadPreviousContent } }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recoveryRestore,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = recoveryCheckpointRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()

      const checkpoint = await recoveryService.getCheckpoint(
        parsed.data.workspaceId,
        parsed.data.checkpointId
      )
      if (!checkpoint) {
        return {
          ok: false,
          error: ndxError(
            'not-found',
            'checkpoint-not-found',
            'That recovery checkpoint no longer exists.'
          )
        }
      }
      if (!checkpoint.hadPreviousContent) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'nothing-to-restore',
            'This checkpoint recorded a brand-new file — there is no prior content to restore.'
          )
        }
      }

      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) return workspaceNotFound()

      try {
        const content = await recoveryService.getSnapshotContent(
          parsed.data.workspaceId,
          parsed.data.checkpointId
        )
        const previousContent = await fileService.readIfExists(
          workspace.rootPath,
          checkpoint.relativePath
        )
        await recoveryService.recordCheckpoint(
          workspace.id,
          checkpoint.relativePath,
          previousContent,
          `Restore "${checkpoint.relativePath}" to its state from "${checkpoint.description}"`
        )
        await fileService.write(workspace.rootPath, checkpoint.relativePath, content ?? '')
        return { ok: true, data: null }
      } catch (error) {
        if (error instanceof PathOutsideWorkspaceError) {
          return {
            ok: false,
            error: ndxError(
              'security',
              'path-outside-workspace',
              'That path is outside the workspace.'
            )
          }
        }
        return {
          ok: false,
          error: ndxError(
            'system',
            'restore-failed',
            error instanceof Error ? error.message : 'Unknown error'
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recoveryStorageSummary,
    async (_event, payload: unknown): Promise<NdxResult<RecoveryStorageSummary>> => {
      const parsed = workspaceRecoveryRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await recoveryService.storageSummary(parsed.data.workspaceId) }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That recovery request is invalid.')
  }
}

function workspaceNotFound<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
  }
}
