import { ipcMain, type BrowserWindow } from 'electron'
import {
  addScreenshotToWorkspaceRequestSchema,
  captureScreenshotRequestSchema,
  IPC_CHANNELS,
  ndxError,
  screenshotIdRequestSchema,
  type NdxResult,
  type ScreenshotRecord
} from '@shared/contracts'
import {
  ScreenshotCaptureError,
  ScreenshotNotFoundError,
  type ScreenshotService
} from '../screenshot/ScreenshotService'
import type { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Real Epic X14 Screenshot Center IPC — see `ScreenshotService` for the real capture/storage behind it. */
export function registerScreenshotHandlers(
  service: ScreenshotService,
  workspaceStore: WorkspaceStore,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    IPC_CHANNELS.screenshotCapture,
    async (_event, payload: unknown): Promise<NdxResult<ScreenshotRecord>> => {
      const parsed = captureScreenshotRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      if (parsed.data.delaySeconds > 0) await sleep(parsed.data.delaySeconds * 1000)
      try {
        if (parsed.data.source === 'full-screen') {
          return { ok: true, data: await service.captureFullScreen() }
        }
        const window = getWindow()
        if (!window) {
          return {
            ok: false,
            error: ndxError('system', 'no-window', 'No window is available to capture.')
          }
        }
        return { ok: true, data: await service.captureCurrentWindow(window) }
      } catch (error) {
        return { ok: false, error: toScreenshotError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.screenshotList, async (): Promise<NdxResult<ScreenshotRecord[]>> => {
    return { ok: true, data: await service.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.screenshotCopyToClipboard,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = screenshotIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await service.copyToClipboard(parsed.data.id)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toScreenshotError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.screenshotDelete,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = screenshotIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await service.delete(parsed.data.id)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toScreenshotError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.screenshotAddToWorkspace,
    async (_event, payload: unknown): Promise<NdxResult<string>> => {
      const parsed = addScreenshotToWorkspaceRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const workspace = await workspaceStore.get(parsed.data.workspaceId)
      if (!workspace) {
        return {
          ok: false,
          error: ndxError('not-found', 'workspace-not-found', 'That workspace no longer exists.')
        }
      }
      try {
        const destination = await service.addToWorkspace(parsed.data.id, workspace.rootPath)
        return { ok: true, data: destination }
      } catch (error) {
        return { ok: false, error: toScreenshotError(error) }
      }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That screenshot request is invalid.')
  }
}

function toScreenshotError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof ScreenshotNotFoundError) {
    return ndxError('not-found', 'screenshot-not-found', error.message)
  }
  if (error instanceof ScreenshotCaptureError) {
    return ndxError('system', 'screenshot-capture-failed', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'screenshot-operation-failed', message, { message })
}
