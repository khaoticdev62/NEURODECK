import { randomUUID } from 'node:crypto'
import type { BrowserTab } from '@shared/contracts/browser'
import { JsonStore } from '../persistence/JsonStore'

interface BrowserTabIndex {
  tabs: BrowserTab[]
}

/** Real, persisted tab metadata (mega-prompt §24 "session persistence") — the actual `WebContentsView` lifecycle lives in `main/browser/BrowserSessionService.ts`, which this store has no dependency on. */
export class BrowserTabStore {
  private readonly store: JsonStore<BrowserTabIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<BrowserTabIndex>(filePath, { tabs: [] })
  }

  async list(workspaceId: string): Promise<BrowserTab[]> {
    const index = await this.store.read()
    return index.tabs.filter((tab) => tab.workspaceId === workspaceId)
  }

  async get(tabId: string): Promise<BrowserTab | undefined> {
    return (await this.store.read()).tabs.find((tab) => tab.id === tabId)
  }

  async create(workspaceId: string, url: string): Promise<BrowserTab> {
    const now = Date.now()
    const tab: BrowserTab = {
      id: randomUUID(),
      workspaceId,
      url,
      title: url,
      loading: true,
      canGoBack: false,
      canGoForward: false,
      createdAt: now,
      updatedAt: now
    }
    const index = await this.store.read()
    await this.store.write({ tabs: [...index.tabs, tab] })
    return tab
  }

  async update(
    tabId: string,
    patch: Partial<Omit<BrowserTab, 'id' | 'workspaceId' | 'createdAt'>>
  ): Promise<BrowserTab | undefined> {
    const index = await this.store.read()
    const existing = index.tabs.find((tab) => tab.id === tabId)
    if (!existing) return undefined
    const updated: BrowserTab = { ...existing, ...patch, updatedAt: Date.now() }
    await this.store.write({ tabs: index.tabs.map((tab) => (tab.id === tabId ? updated : tab)) })
    return updated
  }

  async remove(tabId: string): Promise<void> {
    const index = await this.store.read()
    await this.store.write({ tabs: index.tabs.filter((tab) => tab.id !== tabId) })
  }
}
