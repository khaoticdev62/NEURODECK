import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  listFilesRequestSchema,
  ndxError,
  readFileRequestSchema,
  type FileEntry,
  type NdxResult,
  type ReadFileResult
} from '@shared/contracts'
import type { FileService } from '../../core/files/FileService'
import { PathOutsideWorkspaceError } from '../../core/files/FileService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/** Real handlers backed by `FileService`, scoped to a workspace's root by `workspaceId` — never an arbitrary absolute path from the renderer. */
export function registerFileHandlers(
  fileService: FileService,
  workspaceStore: WorkspaceStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.fileList,
    async (_event, payload: unknown): Promise<NdxResult<FileEntry[]>> => {
      const parsed = listFilesRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That file request is invalid.')
        }
      }

      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) {
        return {
          ok: false,
          error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
        }
      }

      try {
        return {
          ok: true,
          data: await fileService.list(workspace.rootPath, parsed.data.relativePath)
        }
      } catch (error) {
        return { ok: false, error: toFileError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.fileRead,
    async (_event, payload: unknown): Promise<NdxResult<ReadFileResult>> => {
      const parsed = readFileRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That file request is invalid.')
        }
      }

      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) {
        return {
          ok: false,
          error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
        }
      }

      try {
        return {
          ok: true,
          data: await fileService.read(workspace.rootPath, parsed.data.relativePath)
        }
      } catch (error) {
        return { ok: false, error: toFileError(error) }
      }
    }
  )
}

function toFileError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof PathOutsideWorkspaceError) {
    return ndxError('security', 'path-outside-workspace', 'That path is outside the workspace.', {
      message: error.message
    })
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'file-operation-failed', message, { message })
}
