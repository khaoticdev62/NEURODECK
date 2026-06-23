import { dialog, ipcMain, type BrowserWindow } from 'electron'
import {
  createWorkspaceRequestSchema,
  IPC_CHANNELS,
  ndxError,
  workspaceDiscoveryOptionsSchema,
  workspaceIdRequestSchema,
  type DiscoveredWorkspace,
  type NdxResult,
  type Workspace
} from '@shared/contracts'
import type { GitService } from '../../core/git/GitService'
import type { RemoteHostStore } from '../../core/remote/RemoteHostStore'
import { WorkspaceDiscoveryService } from '../../core/workspaces/WorkspaceDiscoveryService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/** Real handlers backed by `WorkspaceStore` — every payload is Zod-validated before it touches the store (mega-prompt §14.1). */
export function registerWorkspaceHandlers(
  store: WorkspaceStore,
  getWindow: () => BrowserWindow | null,
  gitService: GitService,
  remoteHostStore: RemoteHostStore
): void {
  const discoveryService = new WorkspaceDiscoveryService(gitService, remoteHostStore)
  ipcMain.handle(IPC_CHANNELS.workspaceList, async (): Promise<NdxResult<Workspace[]>> => {
    try {
      return { ok: true, data: await store.list() }
    } catch (error) {
      return { ok: false, error: toSystemError(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.workspaceCreate,
    async (_event, payload: unknown): Promise<NdxResult<Workspace>> => {
      const parsed = createWorkspaceRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That folder path is invalid.')
        }
      }
      try {
        return { ok: true, data: await store.create(parsed.data.rootPath) }
      } catch (error) {
        return { ok: false, error: toSystemError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workspaceRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = workspaceIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That workspace id is invalid.')
        }
      }
      try {
        await store.remove(parsed.data.id)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toSystemError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.workspacePickFolder, async (): Promise<NdxResult<string | null>> => {
    const window = getWindow()
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: true, data: null }
    }
    return { ok: true, data: result.filePaths[0] }
  })

  ipcMain.handle(
    IPC_CHANNELS.workspaceDiscover,
    async (_event, payload: unknown): Promise<NdxResult<DiscoveredWorkspace[]>> => {
      const parsed = workspaceDiscoveryOptionsSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'Discovery options are invalid.')
        }
      }
      try {
        const data = await discoveryService.discover(parsed.data)
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toSystemError(error) }
      }
    }
  )
}

function toSystemError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'workspace-operation-failed', message, { message })
}
