import { ipcMain, type BrowserWindow } from 'electron'
import {
  addRemoteHostRequestSchema,
  createRemoteSessionRequestSchema,
  IPC_CHANNELS,
  ndxError,
  remoteHostRequestSchema,
  remoteSessionRequestSchema,
  remoteSessionResizeRequestSchema,
  remoteSessionWriteRequestSchema,
  type NdxResult,
  type RemoteConnectionTestResult,
  type RemoteHost,
  type RemoteSession,
  type RemoteSessionSnapshot
} from '@shared/contracts'
import {
  RemoteConnectionError,
  type RemoteConnectionService
} from '../../core/remote/RemoteConnectionService'
import type { RemoteHostStore } from '../../core/remote/RemoteHostStore'

/** Real SSH Remote Systems IPC. Secrets never cross back to the renderer. */
export function registerRemoteHandlers(
  hostStore: RemoteHostStore,
  connectionService: RemoteConnectionService,
  getWindow: () => BrowserWindow | null
): () => void {
  const removeDataListener = connectionService.onData((event) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.remoteSessionData, event)
    }
  })
  const removeExitListener = connectionService.onExit((event) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.remoteSessionExit, event)
    }
  })

  ipcMain.handle(IPC_CHANNELS.remoteHostList, async (): Promise<NdxResult<RemoteHost[]>> => {
    return { ok: true, data: await hostStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.remoteHostAdd,
    async (_event, payload: unknown): Promise<NdxResult<RemoteHost>> => {
      const parsed = addRemoteHostRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote host')
      try {
        return { ok: true, data: await hostStore.add(parsed.data) }
      } catch (error) {
        return { ok: false, error: toRemoteError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.remoteHostRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = remoteHostRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote host')
      await hostStore.remove(parsed.data.hostId)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.remoteHostTestConnection,
    async (_event, payload: unknown): Promise<NdxResult<RemoteConnectionTestResult>> => {
      const parsed = remoteHostRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote host')
      try {
        return { ok: true, data: await connectionService.testConnection(parsed.data.hostId) }
      } catch (error) {
        return { ok: false, error: toRemoteError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.remoteSessionCreate,
    async (_event, payload: unknown): Promise<NdxResult<RemoteSession>> => {
      const parsed = createRemoteSessionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote session')
      try {
        return {
          ok: true,
          data: await connectionService.createSession(
            parsed.data.hostId,
            parsed.data.cols,
            parsed.data.rows
          )
        }
      } catch (error) {
        return { ok: false, error: toRemoteError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.remoteSessionSnapshot,
    (_event, payload: unknown): NdxResult<RemoteSessionSnapshot> => {
      const parsed = remoteSessionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote session')
      try {
        return { ok: true, data: connectionService.snapshot(parsed.data.sessionId) }
      } catch (error) {
        return { ok: false, error: toRemoteError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.remoteSessionWrite, (_event, payload: unknown): NdxResult<null> => {
    const parsed = remoteSessionWriteRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest('remote session')
    try {
      connectionService.write(parsed.data.sessionId, parsed.data.data)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toRemoteError(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.remoteSessionResize, (_event, payload: unknown): NdxResult<null> => {
    const parsed = remoteSessionResizeRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest('remote session')
    try {
      connectionService.resize(parsed.data.sessionId, parsed.data.cols, parsed.data.rows)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toRemoteError(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.remoteSessionTerminate,
    (_event, payload: unknown): NdxResult<null> => {
      const parsed = remoteSessionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest('remote session')
      try {
        connectionService.terminate(parsed.data.sessionId)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toRemoteError(error) }
      }
    }
  )

  return () => {
    removeDataListener()
    removeExitListener()
    connectionService.dispose()
  }
}

function invalidRequest<T>(resource: string): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', `That ${resource} request is invalid.`)
  }
}

function toRemoteError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof RemoteConnectionError) {
    const category =
      error.code === 'HOST_NOT_FOUND' || error.code === 'SESSION_NOT_FOUND'
        ? 'not-found'
        : error.code === 'HOST_KEY_MISMATCH'
          ? 'security'
          : 'conflict'
    return ndxError(category, error.code.toLowerCase().replaceAll('_', '-'), error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown remote systems error.'
  return ndxError('system', 'remote-operation-failed', message, { message })
}
