import { WebContentsView, shell, type BrowserWindow } from 'electron'
import { isAllowedBrowserUrl } from '../security/browserUrlPolicy'

export interface BrowserTabState {
  tabId: string
  url?: string
  title?: string
  loading?: boolean
  canGoBack?: boolean
  canGoForward?: boolean
}

export interface BrowserTabBounds {
  x: number
  y: number
  width: number
  height: number
}

export class BrowserSessionError extends Error {}

/**
 * Real `WebContentsView` lifecycle (mega-prompt §24). Only one tab's view
 * is ever attached to the window at a time — switching tabs detaches and
 * closes the previous tab's `webContents` (via `webContents.close()`, the
 * documented disposal API for a `WebContentsView` not owned by a
 * `BrowserWindow`) rather than keeping every tab's content process
 * resident; reactivating a tab creates a fresh view and reloads its
 * persisted URL. This is Electron-integration code — it needs a real
 * `app.whenReady()` window to run, so unlike every other `core/` service
 * in this codebase it cannot be unit-tested in Vitest's plain-Node/jsdom
 * environment; it's exercised by the Playwright e2e smoke test and manual
 * verification instead. The pure URL policy and tab-metadata persistence
 * it depends on (`browserUrlPolicy.ts`, `BrowserTabStore.ts`) are real
 * unit-tested modules.
 */
export class BrowserSessionService {
  private views = new Map<string, WebContentsView>()
  private activeTabId: string | null = null

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly onUpdate: (state: BrowserTabState) => void
  ) {}

  open(tabId: string, workspaceId: string, url: string): void {
    if (!isAllowedBrowserUrl(url)) {
      throw new BrowserSessionError('That URL is not allowed in the embedded browser.')
    }
    const window = this.getWindow()
    if (!window) throw new BrowserSessionError('No window is available to host the browser view.')

    if (this.activeTabId && this.activeTabId !== tabId) this.detachActive(window)

    const view = this.createView(tabId, workspaceId)
    window.contentView.addChildView(view)
    this.activeTabId = tabId
    void view.webContents.loadURL(url)
  }

  navigate(tabId: string, url: string): void {
    if (!isAllowedBrowserUrl(url)) {
      throw new BrowserSessionError('That URL is not allowed in the embedded browser.')
    }
    void this.requireActiveView(tabId).webContents.loadURL(url)
  }

  goBack(tabId: string): void {
    this.requireActiveView(tabId).webContents.navigationHistory.goBack()
  }

  goForward(tabId: string): void {
    this.requireActiveView(tabId).webContents.navigationHistory.goForward()
  }

  reload(tabId: string): void {
    this.requireActiveView(tabId).webContents.reload()
  }

  setBounds(tabId: string, bounds: BrowserTabBounds): void {
    if (this.activeTabId !== tabId) return
    this.views.get(tabId)?.setBounds(bounds)
  }

  close(tabId: string): void {
    const window = this.getWindow()
    if (window && this.activeTabId === tabId) this.detachActive(window)
    this.views.get(tabId)?.webContents.close()
    this.views.delete(tabId)
  }

  dispose(): void {
    const window = this.getWindow()
    if (window) for (const view of this.views.values()) window.contentView.removeChildView(view)
    for (const view of this.views.values()) view.webContents.close()
    this.views.clear()
    this.activeTabId = null
  }

  private requireActiveView(tabId: string): WebContentsView {
    const view = this.activeTabId === tabId ? this.views.get(tabId) : undefined
    if (!view) throw new BrowserSessionError('That tab is not currently active.')
    return view
  }

  private detachActive(window: BrowserWindow): void {
    if (!this.activeTabId) return
    const previous = this.views.get(this.activeTabId)
    if (previous) {
      window.contentView.removeChildView(previous)
      previous.webContents.close()
      this.views.delete(this.activeTabId)
    }
    this.activeTabId = null
  }

  private createView(tabId: string, workspaceId: string): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: `persist:browser-${workspaceId}`
      }
    })
    const contents = view.webContents

    // Default-deny every permission request — no interactive permission-prompt UI exists yet (deferred, see ledger).
    contents.session.setPermissionRequestHandler((_webContents, _permission, callback) =>
      callback(false)
    )

    contents.on('will-navigate', (event, url) => {
      if (!isAllowedBrowserUrl(url)) event.preventDefault()
    })
    contents.setWindowOpenHandler(({ url }) => {
      if (isAllowedBrowserUrl(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })

    const emitNavigationState = (): void => {
      this.onUpdate({
        tabId,
        url: contents.getURL(),
        canGoBack: contents.navigationHistory.canGoBack(),
        canGoForward: contents.navigationHistory.canGoForward()
      })
    }
    contents.on('did-navigate', emitNavigationState)
    contents.on('did-navigate-in-page', emitNavigationState)
    contents.on('page-title-updated', (_event, title) => this.onUpdate({ tabId, title }))
    contents.on('did-start-loading', () => this.onUpdate({ tabId, loading: true }))
    contents.on('did-stop-loading', () => {
      this.onUpdate({ tabId, loading: false })
      emitNavigationState()
    })

    this.views.set(tabId, view)
    return view
  }
}
