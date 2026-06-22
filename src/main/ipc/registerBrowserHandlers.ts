import { ipcMain, shell, type BrowserWindow } from 'electron'
import {
  browserTabIdRequestSchema,
  createBrowserTabRequestSchema,
  IPC_CHANNELS,
  navigateBrowserTabRequestSchema,
  ndxError,
  setBrowserTabBoundsRequestSchema,
  workspaceBrowserRequestSchema,
  type BrowserTab,
  type NdxResult
} from '@shared/contracts'
import { isAllowedBrowserUrl } from '../security/browserUrlPolicy'
import type { BrowserTabStore } from '../../core/browser/BrowserTabStore'
import {
  BrowserSessionError,
  BrowserSessionService,
  type BrowserTabState
} from '../browser/BrowserSessionService'

/** Real Browser System IPC (mega-prompt §24): persistence (`BrowserTabStore`) and the live `WebContentsView` (`BrowserSessionService`) are orchestrated here, mirroring `registerFileHandlers.ts`'s checkpoint-then-write pattern. */
export function registerBrowserHandlers(
  tabStore: BrowserTabStore,
  getWindow: () => BrowserWindow | null
): void {
  const session = new BrowserSessionService(getWindow, (state) => {
    void applyTabUpdate(state)
  })

  async function applyTabUpdate(state: BrowserTabState): Promise<void> {
    const { tabId, ...patch } = state
    const updated = await tabStore.update(tabId, patch)
    if (!updated) return
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.browserTabUpdate, updated)
    }
  }

  ipcMain.handle(
    IPC_CHANNELS.browserTabList,
    async (_event, payload: unknown): Promise<NdxResult<BrowserTab[]>> => {
      const parsed = workspaceBrowserRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await tabStore.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.browserTabCreate,
    async (_event, payload: unknown): Promise<NdxResult<BrowserTab>> => {
      const parsed = createBrowserTabRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      if (!isAllowedBrowserUrl(parsed.data.url)) return notAllowedUrl()

      const tab = await tabStore.create(parsed.data.workspaceId, parsed.data.url)
      try {
        session.open(tab.id, tab.workspaceId, tab.url)
        return { ok: true, data: tab }
      } catch (error) {
        await tabStore.remove(tab.id)
        return { ok: false, error: toBrowserError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.browserTabSetActive,
    async (_event, payload: unknown): Promise<NdxResult<BrowserTab>> => {
      const parsed = browserTabIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const tab = await tabStore.get(parsed.data.tabId)
      if (!tab) return tabNotFound()
      try {
        session.open(tab.id, tab.workspaceId, tab.url)
        return { ok: true, data: tab }
      } catch (error) {
        return { ok: false, error: toBrowserError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.browserTabNavigate, (_event, payload: unknown): NdxResult<null> => {
    const parsed = navigateBrowserTabRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    try {
      session.navigate(parsed.data.tabId, parsed.data.url)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toBrowserError(error) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.browserTabGoBack,
    (_event, payload: unknown): NdxResult<null> =>
      runTabAction(payload, (tabId) => session.goBack(tabId))
  )
  ipcMain.handle(
    IPC_CHANNELS.browserTabGoForward,
    (_event, payload: unknown): NdxResult<null> =>
      runTabAction(payload, (tabId) => session.goForward(tabId))
  )
  ipcMain.handle(
    IPC_CHANNELS.browserTabReload,
    (_event, payload: unknown): NdxResult<null> =>
      runTabAction(payload, (tabId) => session.reload(tabId))
  )

  ipcMain.handle(IPC_CHANNELS.browserTabSetBounds, (_event, payload: unknown): NdxResult<null> => {
    const parsed = setBrowserTabBoundsRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    const { tabId, ...bounds } = parsed.data
    session.setBounds(tabId, bounds)
    return { ok: true, data: null }
  })

  ipcMain.handle(
    IPC_CHANNELS.browserTabRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = browserTabIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      session.close(parsed.data.tabId)
      await tabStore.remove(parsed.data.tabId)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.browserOpenExternal,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = navigateBrowserTabRequestSchema.pick({ url: true }).safeParse(payload)
      if (!parsed.success) return invalidRequest()
      if (!isAllowedBrowserUrl(parsed.data.url)) return notAllowedUrl()
      await shell.openExternal(parsed.data.url)
      return { ok: true, data: null }
    }
  )

  function runTabAction(payload: unknown, action: (tabId: string) => void): NdxResult<null> {
    const parsed = browserTabIdRequestSchema.safeParse(payload)
    if (!parsed.success) return invalidRequest()
    try {
      action(parsed.data.tabId)
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: toBrowserError(error) }
    }
  }
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That browser request is invalid.')
  }
}

function notAllowedUrl<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError(
      'validation',
      'url-not-allowed',
      'That URL is not allowed in the embedded browser.'
    )
  }
}

function tabNotFound<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('not-found', 'browser-tab-not-found', 'That browser tab no longer exists.')
  }
}

function toBrowserError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof BrowserSessionError) {
    return ndxError('conflict', 'browser-session-error', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'browser-operation-failed', message, { message })
}
