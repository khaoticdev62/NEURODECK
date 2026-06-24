import { ipcMain, type BrowserWindow } from 'electron'
import {
  createTerminalRequestSchema,
  headlessTerminalRequestSchema,
  IPC_CHANNELS,
  listTerminalSessionsRequestSchema,
  ndxError,
  terminalResizeRequestSchema,
  terminalSessionRequestSchema,
  terminalWriteRequestSchema,
  type NdxResult,
  type HeadlessTerminalResult,
  type TerminalSession,
  type TerminalSnapshot
} from '@shared/contracts'
import { TerminalService, TerminalServiceError } from '../../core/terminal/TerminalService'
import {
  resolveTerminalCwd,
  TerminalPathOutsideWorkspaceError
} from '../../core/terminal/TerminalPathPolicy'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

/** Workspace-scoped PTY IPC. The renderer never supplies a shell binary or absolute cwd. */
export function registerTerminalHandlers(
  terminalService: TerminalService,
  workspaceStore: WorkspaceStore,
  getWindow: () => BrowserWindow | null
): () => void {
  const removeDataListener = terminalService.onData((event) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.terminalData, event)
    }
  })
  const removeExitListener = terminalService.onExit((event) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.terminalExit, event)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.terminalCreate,
    async (_event, payload: unknown): Promise<NdxResult<TerminalSession>> => {
      const parsed = createTerminalRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) return workspaceNotFound()

      try {
        const cwd = await resolveTerminalCwd(workspace.rootPath, parsed.data.relativeCwd)
        return {
          ok: true,
          data: terminalService.create({
            workspaceId: workspace.id,
            cwd,
            cols: parsed.data.cols,
            rows: parsed.data.rows
          })
        }
      } catch (error) {
        return { ok: false, error: toTerminalError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.terminalList,
    async (_event, payload: unknown): Promise<NdxResult<TerminalSession[]>> => {
      const parsed = listTerminalSessionsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      if (!(await workspaceStore.get(parsed.data.workspaceId))) return workspaceNotFound()
      return { ok: true, data: terminalService.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.terminalSnapshot,
    (_event, payload: unknown): NdxResult<TerminalSnapshot> => {
      const parsed = terminalSessionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: terminalService.snapshot(parsed.data.sessionId) }
      } catch (error) {
        return { ok: false, error: toTerminalError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.terminalWrite, (_event, payload: unknown): NdxResult<null> => {
    const parsed = terminalWriteRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    try {
      terminalService.write(parsed.data.sessionId, parsed.data.data)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toTerminalError(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.terminalResize, (_event, payload: unknown): NdxResult<null> => {
    const parsed = terminalResizeRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    try {
      terminalService.resize(parsed.data.sessionId, parsed.data.cols, parsed.data.rows)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toTerminalError(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.terminalTerminate, (_event, payload: unknown): NdxResult<null> => {
    const parsed = terminalSessionRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    try {
      terminalService.terminate(parsed.data.sessionId)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toTerminalError(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.terminalRunHeadless,
    async (_event, payload: unknown): Promise<NdxResult<HeadlessTerminalResult>> => {
      const parsed = headlessTerminalRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) return workspaceNotFound()

      try {
        const cwd = await resolveTerminalCwd(workspace.rootPath, parsed.data.relativeCwd)
        return {
          ok: true,
          data: await terminalService.runHeadless({ ...parsed.data, cwd })
        }
      } catch (error) {
        return { ok: false, error: toTerminalError(error) }
      }
    }
  )

  return () => {
    removeDataListener()
    removeExitListener()
    terminalService.dispose()
  }
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That terminal request is invalid.')
  }
}

function workspaceNotFound<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
  }
}

function toTerminalError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof TerminalPathOutsideWorkspaceError) {
    return ndxError(
      'security',
      'terminal-path-outside-workspace',
      'The terminal directory must stay inside the workspace.'
    )
  }
  if (error instanceof TerminalServiceError) {
    const category = error.code === 'SESSION_NOT_FOUND' ? 'not-found' : 'conflict'
    return ndxError(category, error.code.toLowerCase().replaceAll('_', '-'), error.message)
  }
  return ndxError('system', 'terminal-operation-failed', 'The terminal operation failed.', {
    message: error instanceof Error ? error.message : 'Unknown terminal error'
  })
}
