import * as path from "path";
import { browserSessionService } from "./browserSessionService";
import { browserTabManager } from "./browserTabManager";
import { GUEST_WEB_PREFERENCES } from "../../../shared/browser/browserSecurityPolicy";
import { vpnRouteManager } from "../browser-vpn/vpnRouteManager";

export class BrowserViewManager {
  private views: Map<string, any> = new Map();
  private mainWindow: any = null;
  private currentBounds: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private registeredPartitions: Set<string> = new Set();
  private isVisible: boolean = true;

  setMainWindow(win: any) {
    this.mainWindow = win;
  }

  setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    this.currentBounds = bounds;
    // Update active view bounds
    const activeTabId = browserTabManager.getActiveTabId();
    if (activeTabId) {
      const activeView = this.views.get(activeTabId);
      if (activeView) {
        try {
          activeView.setBounds(bounds);
        } catch (_) {}
      }
    }
  }

  broadcastBrowserEvent(event: string, payload: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("browser-event", { event, payload });
    }
  }

  broadcastTabsUpdate() {
    this.broadcastBrowserEvent("tabs-updated", {
      tabs: browserTabManager.listTabs(),
      activeTabId: browserTabManager.getActiveTabId(),
    });
  }

  getOrCreateView(tabId: string): any {
    if (this.views.has(tabId)) {
      return this.views.get(tabId);
    }

    const tab = browserTabManager.getTab(tabId);
    if (!tab) return null;

    try {
      const { WebContentsView } = require("electron");
      const sess = browserSessionService.getSession(tab.profileId);
      const vpnProfile = vpnRouteManager.getVpnProfileForBrowserProfile(tab.profileId);
      if (sess && vpnProfile && vpnProfile.routeMode === "browser_proxy" && vpnProfile.diagnostics.lastState !== "disconnected") {
        void vpnRouteManager.applyBrowserProxy(vpnProfile.id, tab.profileId);
      }

      const view = new WebContentsView({
        webPreferences: {
          ...GUEST_WEB_PREFERENCES,
          session: sess,
        },
      });

      // Mask User-Agent to standard Chrome
      const CHROME_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
      view.webContents.setUserAgent(CHROME_USER_AGENT);

      // Hook navigation and loading events statefully
      view.webContents.on("did-start-loading", () => {
        browserTabManager.updateTab(tabId, { isLoading: true, state: "loading" });
        this.broadcastTabsUpdate();
      });

      view.webContents.on("did-stop-loading", () => {
        const canGoBack = view.webContents.navigationHistory.canGoBack();
        const canGoForward = view.webContents.navigationHistory.canGoForward();
        const title = view.webContents.getTitle() || "New Tab";
        browserTabManager.updateTab(tabId, {
          isLoading: false,
          state: "ready",
          canGoBack,
          canGoForward,
          title,
        });
        this.broadcastTabsUpdate();
      });

      view.webContents.on("did-finish-load", () => {
        const title = view.webContents.getTitle() || "New Tab";
        const canGoBack = view.webContents.navigationHistory.canGoBack();
        const canGoForward = view.webContents.navigationHistory.canGoForward();
        browserTabManager.updateTab(tabId, {
          isLoading: false,
          state: "ready",
          canGoBack,
          canGoForward,
          title,
        });
        this.broadcastTabsUpdate();
      });

      view.webContents.on("did-fail-load", (_event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
        browserTabManager.updateTab(tabId, {
          isLoading: false,
          state: "error",
          diagnostics: {
            lastErrorCode: errorCode.toString(),
            lastErrorMessage: errorDescription,
          },
        });
        this.broadcastTabsUpdate();
      });

      view.webContents.on("crashed", () => {
        const t = browserTabManager.getTab(tabId);
        const crashCount = (t?.crashCount || 0) + 1;
        browserTabManager.updateTab(tabId, {
          isLoading: false,
          state: "crashed",
          crashCount,
        });
        this.broadcastTabsUpdate();
      });

      // Handle popups safely by redirecting web links to a new managed tab
      view.webContents.setWindowOpenHandler(({ url }) => {
        const { browserSecurityService } = require("./browserSecurityService");
        const { allowed, error } = browserSecurityService.validateUrl(url);
        if (!allowed) {
          console.warn(`[browser] Blocked unsafe popup window url: ${url}. Reason: ${error}`);
          return { action: "deny" };
        }

        if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("sms:")) {
          try {
            const { shell } = require("electron");
            shell.openExternal(url);
          } catch (_) {}
          return { action: "deny" };
        }

        const activeTab = browserTabManager.getTab(tabId);
        const profileId = activeTab?.profileId || "default";

        setImmediate(() => {
          const newTab = browserTabManager.createTab(url, profileId);
          this.getOrCreateView(newTab.id);
          this.syncActiveView();
        });

        return { action: "deny" };
      });

      // Hook URLs for history
      const handleNavigation = (url: string) => {
        const title = view.webContents.getTitle() || url;
        browserTabManager.updateTab(tabId, {
          url,
          displayUrl: url,
        });
        const t = browserTabManager.getTab(tabId);
        if (t) {
          const { browserHistoryService } = require("./browserHistoryService");
          browserHistoryService.addEntry(url, title, t.profileId);
        }
        this.broadcastTabsUpdate();
      };

      view.webContents.on("did-navigate", (_event: any, url: string) => {
        handleNavigation(url);
      });

      view.webContents.on("did-navigate-in-page", (_event: any, url: string, isMainFrame: boolean) => {
        if (isMainFrame) {
          handleNavigation(url);
        }
      });

      // Attach download and permission handlers to the session once per partition ID
      if (sess && typeof sess.on === "function") {
        const partitionId = tab.partitionId;
        if (!this.registeredPartitions.has(partitionId)) {
          this.registeredPartitions.add(partitionId);

          // Apply ad blocker request filter
          if (sess.webRequest) {
            sess.webRequest.onBeforeRequest((details: any, callback: any) => {
              if (vpnRouteManager.shouldBlockBrowserRequest(tab.profileId, details.url)) {
                callback({ cancel: true });
                return;
              }
              const { browserSecurityService } = require("./browserSecurityService");
              if (browserSecurityService.shouldBlockRequest(details.url)) {
                callback({ cancel: true });
                return;
              }
              callback({});
            });
          }

          sess.on("will-download", (event: any, item: any, _webContents: any) => {
            if (vpnRouteManager.shouldBlockBrowserRequest(tab.profileId, item.getURL?.() || "")) {
              event.preventDefault();
              this.broadcastBrowserEvent("vpn-download-blocked", {
                tabId,
                profileId: tab.profileId,
                url: item.getURL?.() || "",
              });
              return;
            }
            const { browserDownloadService } = require("./browserDownloadService");
            if (!browserDownloadService.canDownload(tab.profileId)) {
              event.preventDefault();
              console.warn(`[Downloads] Download blocked by policy for profile: ${tab.profileId}`);
              return;
            }

            const downloadId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const filename = item.getFilename();
            const { app } = require("electron");
            const savePath = path.join(app.getPath("downloads"), filename);
            item.setSavePath(savePath);

            browserDownloadService.registerDownload({
              id: downloadId,
              url: item.getURL(),
              filename,
              savePath,
              totalBytes: item.getTotalBytes(),
              profileId: tab.profileId,
              tabId,
            }, item);

            this.broadcastBrowserEvent("download-started", {
              id: downloadId,
              filename,
              totalBytes: item.getTotalBytes(),
            });

            item.on("updated", (_evt: any, state: string) => {
              browserDownloadService.updateDownloadProgress(
                downloadId,
                item.getReceivedBytes(),
                state as any
              );
              this.broadcastBrowserEvent("download-progress", {
                id: downloadId,
                receivedBytes: item.getReceivedBytes(),
                totalBytes: item.getTotalBytes(),
                state,
              });
            });

            item.once("done", (_evt: any, state: string) => {
              browserDownloadService.updateDownloadProgress(
                downloadId,
                item.getReceivedBytes(),
                state as any
              );
              this.broadcastBrowserEvent("download-complete", {
                id: downloadId,
                filename,
                savePath,
                state,
              });
            });
          });

          sess.setPermissionRequestHandler((webContents: any, permission: string, callback: (allowed: boolean) => void, details: any) => {
            const origin = details?.requestingUrl || webContents.getURL();
            const { browserPermissionService } = require("./browserPermissionService");

            const existingDecision = browserPermissionService.getDecision(origin, permission, tab.profileId);
            if (existingDecision !== null) {
              const allowed = existingDecision === "allow_once" || existingDecision === "allow_always";
              callback(allowed);
              return;
            }

            const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            browserPermissionService.registerRequest(requestId, origin, permission, tab.profileId, callback);

            this.broadcastBrowserEvent("permission-requested", {
              requestId,
              origin,
              permission,
              profileId: tab.profileId,
            });
          });

          sess.setPermissionCheckHandler((webContents: any, permission: string, origin: string) => {
            const { browserPermissionService } = require("./browserPermissionService");
            const existingDecision = browserPermissionService.getDecision(origin, permission, tab.profileId);
            if (existingDecision !== null) {
              return existingDecision === "allow_once" || existingDecision === "allow_always";
            }
            // Default allow safe permissions
            const allowed = new Set(["notifications", "fullscreen", "clipboard-sanitized-write"]);
            return allowed.has(permission);
          });
        }
      }

      this.views.set(tabId, view);
      return view;
    } catch {
      // Mock view for unit tests
      const mockView = {
        webContents: {
          loadURL: () => {},
          destroy: () => {},
          navigationHistory: {
            canGoBack: () => false,
            canGoForward: () => false,
            goBack: () => {},
            goForward: () => {},
          },
          reload: () => {},
          stop: () => {},
          setAudioMuted: () => {},
        },
        setBounds: () => {},
        setVisible: () => {},
      };
      this.views.set(tabId, mockView);
      return mockView;
    }
  }

  destroyView(tabId: string) {
    const view = this.views.get(tabId);
    if (view) {
      try {
        if (this.mainWindow) {
          this.mainWindow.contentView.removeChildView(view);
        }
        view.webContents.destroy();
      } catch (_) {}
      this.views.delete(tabId);
    }
  }

  hideAll() {
    this.isVisible = false;
    if (!this.mainWindow) return;
    const tabs = browserTabManager.listTabs();
    for (const tab of tabs) {
      const view = this.views.get(tab.id);
      if (view) {
        try {
          this.mainWindow.contentView.removeChildView(view);
          view.setVisible(false);
        } catch (_) {}
      }
    }
  }

  showActive() {
    this.isVisible = true;
    this.syncActiveView();
  }

  syncActiveView() {
    if (!this.mainWindow) return;

    const activeTabId = browserTabManager.getActiveTabId();
    const tabs = browserTabManager.listTabs();

    for (const tab of tabs) {
      const view = this.views.get(tab.id);
      if (!view) continue;

      try {
        const showView = this.isVisible && 
                         tab.id === activeTabId && 
                         tab.state !== "new" && 
                         tab.state !== "error" && 
                         tab.state !== "crashed" && 
                         tab.state !== "blocked";

        if (showView) {
          // Attach and show active tab
          this.mainWindow.contentView.addChildView(view);
          view.setVisible(true);
          view.setBounds(this.currentBounds);
        } else {
          // Detach and hide background tabs
          this.mainWindow.contentView.removeChildView(view);
          view.setVisible(false);
        }
      } catch (_) {}
    }
  }
}

export const browserViewManager = new BrowserViewManager();

// Wire change listeners to broadcast tab updates
browserTabManager.addChangeListener(() => {
  browserViewManager.broadcastTabsUpdate();
  browserViewManager.syncActiveView();
});

vpnRouteManager.onChange(() => {
  browserViewManager.broadcastBrowserEvent("vpn-state-changed", vpnRouteManager.getStatus());
});
