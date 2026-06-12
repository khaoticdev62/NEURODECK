import type { BrowserTab, BrowserTabId, BrowserTabState, BrowserSecurityState } from "../../../shared/browser/browserContracts";
import { browserProfileService } from "./browserProfileService";

export class BrowserTabManager {
  private tabs: Map<BrowserTabId, BrowserTab> = new Map();
  private activeTabId: BrowserTabId | null = null;
  private changeListeners: Set<(tabs: BrowserTab[]) => void> = new Set();

  createTab(url: string = "about:blank", profileId: string = "default"): BrowserTab {
    const profile = browserProfileService.getProfile(profileId) || browserProfileService.listProfiles()[0];
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const newTab: BrowserTab = {
      id,
      profileId: profile.id,
      partitionId: profile.partitionId,
      title: "New Tab",
      url,
      displayUrl: url,
      state: "new",
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      isMuted: false,
      isPinned: false,
      isPrivate: !profile.persistent,
      security: "secure",
      permissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      crashCount: 0,
      diagnostics: {},
    };

    this.tabs.set(id, newTab);
    if (!this.activeTabId) {
      this.activeTabId = id;
    }

    this.notifyListeners();
    return newTab;
  }

  getTab(id: BrowserTabId): BrowserTab | undefined {
    return this.tabs.get(id);
  }

  getActiveTabId(): BrowserTabId | null {
    return this.activeTabId;
  }

  getActiveTab(): BrowserTab | undefined {
    if (!this.activeTabId) return undefined;
    return this.getTab(this.activeTabId);
  }

  listTabs(): BrowserTab[] {
    return Array.from(this.tabs.values());
  }

  switchTab(id: BrowserTabId): boolean {
    if (!this.tabs.has(id)) return false;
    this.activeTabId = id;
    this.notifyListeners();
    return true;
  }

  closeTab(id: BrowserTabId): boolean {
    if (!this.tabs.has(id)) return false;
    this.tabs.delete(id);

    if (this.activeTabId === id) {
      const keys = Array.from(this.tabs.keys());
      this.activeTabId = keys.length > 0 ? keys[0] : null;
    }

    this.notifyListeners();
    return true;
  }

  updateTab(id: BrowserTabId, updates: Partial<Omit<BrowserTab, "id" | "partitionId">>): boolean {
    const tab = this.tabs.get(id);
    if (!tab) return false;

    Object.assign(tab, updates);
    tab.updatedAt = new Date().toISOString();

    this.notifyListeners();
    return true;
  }

  duplicateTab(id: BrowserTabId): BrowserTab | null {
    const tab = this.tabs.get(id);
    if (!tab) return null;

    const dup = this.createTab(tab.url, tab.profileId);
    this.updateTab(dup.id, {
      title: `${tab.title} (Copy)`,
      isPinned: false,
      isMuted: tab.isMuted,
    });

    return dup;
  }

  addChangeListener(listener: (tabs: BrowserTab[]) => void) {
    this.changeListeners.add(listener);
  }

  removeChangeListener(listener: (tabs: BrowserTab[]) => void) {
    this.changeListeners.delete(listener);
  }

  private notifyListeners() {
    const list = this.listTabs();
    for (const listener of this.changeListeners) {
      try {
        listener(list);
      } catch (err) {
        console.error("Error in tab manager change listener:", err);
      }
    }
  }
}

export const browserTabManager = new BrowserTabManager();
