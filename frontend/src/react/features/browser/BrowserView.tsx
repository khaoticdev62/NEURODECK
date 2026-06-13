import { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  ZoomIn,
  ZoomOut,
  Focus,
  Search,
  X,
  Star,
  BookOpen,
  Shield,
  ShieldCheck,
  Download,
  Clock,
  Trash2,
  BookMarked,
  ChevronDown,
  Plus,
  Pin,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Settings,
  AlertTriangle,
  Terminal,
  Info,
  RefreshCw,
} from "lucide-react";
import { BrowserVpnPanel } from "../browser-vpn/BrowserVpnPanel";

interface BrowserTab {
  id: string;
  profileId: string;
  partitionId: string;
  title: string;
  url: string;
  displayUrl: string;
  favicon?: string;
  state: "new" | "loading" | "ready" | "blocked" | "crashed" | "offline" | "error" | "closed";
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isPrivate: boolean;
  security: "secure" | "insecure" | "warning" | "broken";
  permissions: any[];
  crashCount: number;
  diagnostics: {
    processId?: number;
    loadTimeMs?: number;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  };
}

interface BrowserProfile {
  id: string;
  name: string;
  partitionId: string;
  persistent: boolean;
  policy: {
    allowDownloads: boolean;
    allowPopups: boolean;
    allowMedia: boolean;
    allowNotifications: boolean;
    allowGeolocation: boolean;
    allowClipboardRead: boolean;
    allowClipboardWrite: boolean;
    allowDevTools: boolean;
    blockThirdPartyCookies: boolean;
    clearOnClose: boolean;
  };
  storage: {
    historyEnabled: boolean;
    bookmarksEnabled: boolean;
    cookiesEnabled: boolean;
    cacheEnabled: boolean;
  };
}

interface BrowserHistoryEntry {
  id: string;
  profileId: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitedAt: string;
}

interface BrowserBookmark {
  id: string;
  profileId: string;
  title: string;
  url: string;
  createdAt: string;
}

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  profileId: string;
  startTime: string;
}

interface PermissionRequest {
  requestId: string;
  origin: string;
  permission: string;
  profileId: string;
}

export function BrowserView() {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [showSidebar, setShowSidebar] = useState<"history" | "bookmarks" | null>(null);
  const [history, setHistory] = useState<BrowserHistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [showProfilesMenu, setShowProfilesMenu] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showVpnPanel, setShowVpnPanel] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [showDownloadsMenu, setShowDownloadsMenu] = useState(false);
  const [errorDetailsOpen, setErrorDetailsOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({});

  const viewportRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const reportBounds = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !window.neurodeck?.browser?.setBounds) return;
    const rect = el.getBoundingClientRect();
    window.neurodeck.browser.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, []);

  const loadTabs = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    try {
      const list = await window.neurodeck.browser.getTabs();
      setTabs(list);
      const active = await window.neurodeck.browser.getActiveTab();
      if (active) {
        setActiveTabId(active.id);
        setUrlInput(active.displayUrl || active.url || "");
      } else if (list.length > 0) {
        setActiveTabId(list[0].id);
        setUrlInput(list[0].displayUrl || list[0].url || "");
      }
    } catch (_) {}
  }, []);

  const loadHistory = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || "default";
    try {
      const list = await window.neurodeck.browser.getHistory(profileId);
      setHistory(list);
    } catch (_) {}
  }, [tabs, activeTabId]);

  const loadBookmarks = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || "default";
    try {
      const list = await window.neurodeck.browser.getBookmarks(profileId);
      setBookmarks(list);
    } catch (_) {}
  }, [tabs, activeTabId]);

  const loadDownloads = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    try {
      const list = await window.neurodeck.browser.getDownloads();
      setDownloads(list);
      const activeCount = list.filter((d) => d.state === "progressing").length;
      setActiveDownloadCount(activeCount);
    } catch (_) {}
  }, []);

  const createTab = async (urlStr: string = "https://example.com") => {
    if (!window.neurodeck?.browser) return;
    try {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const profileId = activeTab?.profileId || "default";
      await window.neurodeck.browser.createTab(urlStr, profileId);
      await loadTabs();
      setTimeout(reportBounds, 100);
    } catch (_) {}
  };

  const closeTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.neurodeck?.browser) return;
    try {
      await window.neurodeck.browser.closeTab(tabId);
      await loadTabs();
      setTimeout(reportBounds, 100);
    } catch (_) {}
  };

  const switchTab = async (tabId: string) => {
    if (!window.neurodeck?.browser) return;
    try {
      await window.neurodeck.browser.switchTab(tabId);
      setActiveTabId(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        setUrlInput(tab.displayUrl || tab.url || "");
      }
      setTimeout(reportBounds, 100);
    } catch (_) {}
  };

  const duplicateTab = async (tabId: string) => {
    if (!window.neurodeck?.browser) return;
    try {
      await window.neurodeck.browser.duplicateTab(tabId);
      await loadTabs();
      setTimeout(reportBounds, 100);
    } catch (_) {}
  };

  const navigate = async (targetUrl: string) => {
    if (!targetUrl.trim() || !window.neurodeck?.browser) return;
    try {
      let tabId = activeTabId;
      if (!tabId) {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        const profileId = activeTab?.profileId || "default";
        const tab = await window.neurodeck.browser.createTab("about:blank", profileId);
        if (!tab) return;
        tabId = tab.id;
        await loadTabs();
        reportBounds();
      }
      const { url } = await window.neurodeck.browser.normalizeUrl(targetUrl.trim());
      setUrlInput(url);
      await window.neurodeck.browser.navigate(tabId!, url);
    } catch (_) {}
  };

  const goBack = async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.goBack(activeTabId);
  };

  const goForward = async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.goForward(activeTabId);
  };

  const refresh = async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.reload(activeTabId);
  };

  const stop = async () => {
    if (activeTabId && window.neurodeck?.browser) await window.neurodeck.browser.stop(activeTabId);
  };

  const toggleVisibility = async () => {
    if (!window.neurodeck?.browser) return;
    if (visible) {
      await window.neurodeck.browser.hide();
    } else {
      await window.neurodeck.browser.show();
      setTimeout(reportBounds, 100);
    }
    setVisible(!visible);
  };

  const saveToMemory = async () => {
    if (window.neurodeck?.browser) {
      try {
        await window.neurodeck.browser.saveToMemory();
        showNotice('ok', 'Page content captured and injected into vector memory.');
      } catch (err: unknown) {
        showNotice('error', `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const handleZoomIn = () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      const current = zoomLevels[tab.id] ?? 1.0;
      const next = Math.min(3.0, parseFloat((current + 0.15).toFixed(2)));
      setZoomLevels((prev) => ({ ...prev, [tab.id]: next }));
      window.neurodeck.browser.setZoom(tab.id, next);
    }
  };

  const handleZoomOut = () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      const current = zoomLevels[tab.id] ?? 1.0;
      const next = Math.max(0.5, parseFloat((current - 0.15).toFixed(2)));
      setZoomLevels((prev) => ({ ...prev, [tab.id]: next }));
      window.neurodeck.browser.setZoom(tab.id, next);
    }
  };

  const handleZoomReset = () => {
    if (activeTabId && window.neurodeck?.browser) {
      setZoomLevels((prev) => ({ ...prev, [activeTabId]: 1.0 }));
      window.neurodeck.browser.setZoom(activeTabId, 1.0);
    }
  };

  const handleFind = () => {
    if (findOpen) {
      setFindOpen(false);
      setFindText("");
    } else {
      setFindOpen(true);
    }
  };

  const submitFind = (next: boolean = false) => {
    if (activeTabId && findText.trim() && window.neurodeck?.browser) {
      window.neurodeck.browser.findInPage(activeTabId, findText.trim(), next);
    }
  };

  const toggleBookmark = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab || !window.neurodeck?.browser) return;
    const isBookmarked = bookmarks.some((b) => b.url === activeTab.url);
    if (isBookmarked) {
      const b = bookmarks.find((x) => x.url === activeTab.url);
      if (b) {
        await window.neurodeck.browser.deleteBookmark(b.id);
      }
    } else {
      await window.neurodeck.browser.addBookmark(
        activeTab.url,
        activeTab.title || activeTab.url,
        activeTab.profileId
      );
    }
    await loadBookmarks();
  };

  const deleteBookmark = async (id: string) => {
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.deleteBookmark(id);
      await loadBookmarks();
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.deleteHistory(id);
      await loadHistory();
    }
  };

  const clearHistory = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || "default";
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.clearHistory(profileId);
      setHistory([]);
    }
  };

  const handleToggleAdBlock = async () => {
    if (window.electronAPI?.browserAdblockToggle) {
      const toggleRes = await window.electronAPI.browserAdblockToggle();
      setAdBlockEnabled(toggleRes.enabled);
    }
  };

  const checkAdBlockStatus = useCallback(async () => {
    if (window.electronAPI?.browserAdblockStatus) {
      const res = await window.electronAPI.browserAdblockStatus();
      setAdBlockEnabled(res.enabled);
    }
  }, []);

  const changeProfile = async (profileId: string) => {
    if (activeTabId && window.neurodeck?.browser) {
      await window.neurodeck.browser.setProfile(activeTabId, profileId);
      await loadTabs();
      setShowProfilesMenu(false);
      setTimeout(reportBounds, 150);
    }
  };

  const clearProfileData = async (profileId: string) => {
    if (window.neurodeck?.browser) {
      await (window.neurodeck.browser as any).clearData(profileId, {
        cookies: true,
        cache: true,
        localStorage: true,
      });
      setShowProfilesMenu(false);
      showNotice('ok', `Partition data purged for profile: ${profileId}`);
    }
  };

  const handleClearData = async (scope: "currentTab" | "all") => {
    if (window.neurodeck?.browser?.clearBrowserData) {
      try {
        const res = await window.neurodeck.browser.clearBrowserData(scope);
        if (res?.success) {
          showNotice('ok', scope === "currentTab" ? "Current session data cleared." : "All profile storage purged.");
        } else {
          showNotice('error', "Failed to clear data.");
        }
      } catch (err: unknown) {
        showNotice('error', `Failed to clear data: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const openDevTools = async () => {
    if (activeTabId && window.neurodeck?.browser) {
      await window.neurodeck.browser.openDevTools(activeTabId);
    }
  };

  const respondToPermission = async (requestId: string, decision: string) => {
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.respondToPermission(requestId, decision);
      setPermissions((prev) => prev.filter((p) => p.requestId !== requestId));
    }
  };

  const loadDiagnostics = async () => {
    if (window.neurodeck?.browser) {
      const data = await window.neurodeck.browser.getDiagnostics();
      setDiagnosticsReport(data);
    }
  };

  // Lifecycle listeners
  useEffect(() => {
    if (window.neurodeck?.browser) {
      window.neurodeck.browser.show();
      loadTabs();
      window.neurodeck.browser.getProfiles().then(setProfiles);
      loadDownloads();
      checkAdBlockStatus();
    }
    setTimeout(reportBounds, 300);

    return () => {
      if (window.neurodeck?.browser) {
        window.neurodeck.browser.hide();
      }
    };
  }, [reportBounds, loadTabs, loadDownloads, checkAdBlockStatus]);

  // Sidebar loading sync
  useEffect(() => {
    if (showSidebar === "history") {
      loadHistory();
    } else if (showSidebar === "bookmarks") {
      loadBookmarks();
    }
  }, [showSidebar, loadHistory, loadBookmarks]);

  // Bounds tracking
  useEffect(() => {
    if (!visible) return;
    reportBounds();
    const onResize = () => reportBounds();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => reportBounds());
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [visible, reportBounds, activeTabId, tabs]);

  // IPC Event subscription
  useEffect(() => {
    if (!window.neurodeck?.browser) return;
    const unsubscribe = window.neurodeck.browser.onBrowserEvent((data: any) => {
      const { event, payload } = data;
      if (event === "tabs-updated") {
        setTabs(payload.tabs || []);
        if (payload.activeTabId) {
          setActiveTabId(payload.activeTabId);
        }
        setTimeout(reportBounds, 50);
      } else if (event === "permission-requested") {
        setPermissions((prev) => [...prev, payload]);
      } else if (event === "download-started") {
        loadDownloads();
      } else if (event === "download-progress") {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === payload.id
              ? { ...d, receivedBytes: payload.receivedBytes, state: payload.state }
              : d
          )
        );
      } else if (event === "download-complete") {
        loadDownloads();
      } else if (event === "did-navigate") {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.id === payload.tabId) {
          setUrlInput(payload.url);
        }
        loadTabs();
      }
    });
    return unsubscribe;
  }, [tabs, activeTabId, loadTabs, loadDownloads, reportBounds]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case "t":
          e.preventDefault();
          createTab();
          break;
        case "w":
          if (activeTabId) {
            e.preventDefault();
            window.neurodeck?.browser?.closeTab(activeTabId).then(() => loadTabs());
          }
          break;
        case "l":
          e.preventDefault();
          urlInputRef.current?.focus();
          urlInputRef.current?.select();
          break;
        case "r":
          e.preventDefault();
          refresh();
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          handleZoomReset();
          break;
        case "f":
          if (!e.shiftKey) {
            e.preventDefault();
            handleFind();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTabId, tabs, loadTabs]);

  useEffect(() => {
    const controllerBridge = window as unknown as {
      __neurodeckBrowserBack?: () => void;
      __neurodeckBrowserReload?: () => void;
      __neurodeckBrowserFavorite?: () => void;
      __neurodeckBrowserNewTab?: () => void;
    };
    controllerBridge.__neurodeckBrowserBack = () => {
      void goBack();
    };
    controllerBridge.__neurodeckBrowserReload = () => {
      void refresh();
    };
    controllerBridge.__neurodeckBrowserFavorite = () => {
      void toggleBookmark();
    };
    controllerBridge.__neurodeckBrowserNewTab = () => {
      void createTab();
    };
    return () => {
      delete controllerBridge.__neurodeckBrowserBack;
      delete controllerBridge.__neurodeckBrowserReload;
      delete controllerBridge.__neurodeckBrowserFavorite;
      delete controllerBridge.__neurodeckBrowserNewTab;
    };
  }, [createTab, goBack, refresh, toggleBookmark]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isBookmarked = activeTab && bookmarks.some((b) => b.url === activeTab.url);
  const activeProfile = profiles.find((p) => p.id === activeTab?.profileId);

  return (
    <div className="browser-container flex h-full flex-col bg-nd-bg text-nd-text select-none" data-controller-zone="browser">
      {/* Inline notice (replaces alert() calls) */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute bottom-4 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md ${
            notice.kind === 'ok'
              ? 'border-nd-success/30 bg-nd-success/10 text-nd-success'
              : 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
          }`}
        >
          {notice.text}
        </div>
      )}
      {/* Permission Prompts Overlay */}
      {permissions.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] w-96 rounded-2xl border border-nd-accent/30 bg-nd-bg/95 p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-nd-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-nd-text">Permission Request</h4>
              <p className="text-xs text-nd-text-muted mt-1 leading-relaxed">
                The site <code className="text-nd-accent">{permissions[0].origin}</code> requests
                access to <code className="text-nd-accent">{permissions[0].permission}</code>.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => respondToPermission(permissions[0].requestId, "allow_once")}
              className="px-3 py-1.5 rounded-lg bg-nd-accent/10 border border-nd-accent/20 text-xs font-semibold text-nd-accent hover:bg-nd-accent/20 transition text-center"
            >
              Allow Once
            </button>
            <button
              type="button"
              onClick={() => respondToPermission(permissions[0].requestId, "allow_always")}
              className="px-3 py-1.5 rounded-lg bg-nd-accent text-xs font-semibold text-nd-bg hover:opacity-90 transition text-center"
            >
              Allow Always
            </button>
            <button
              type="button"
              onClick={() => respondToPermission(permissions[0].requestId, "block_once")}
              className="px-3 py-1.5 rounded-lg bg-nd-surface border border-nd-text-muted/15 text-xs text-nd-text-muted hover:text-nd-text transition text-center"
            >
              Block Once
            </button>
            <button
              type="button"
              onClick={() => respondToPermission(permissions[0].requestId, "block_always")}
              className="px-3 py-1.5 rounded-lg bg-nd-danger/10 border border-nd-danger/20 text-xs font-semibold text-nd-danger hover:bg-nd-danger/20 transition text-center"
            >
              Block Always
            </button>
          </div>
        </div>
      )}

      {/* Title / Tab Strip */}
      <div className="flex items-center justify-between border-b border-nd-text-muted/10 bg-nd-surface/10 px-4 py-2 shrink-0" data-controller-zone="toolbar">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 max-w-[80%] pr-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition cursor-pointer shrink-0 border ${
                  isActive
                    ? "bg-nd-accent/10 border-nd-accent/30 text-nd-text font-semibold"
                    : "bg-nd-surface/30 border-transparent text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text"
                }`}
              >
                {tab.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 text-nd-warning shrink-0" />
                ) : (
                  <Globe
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-nd-accent" : "text-nd-text-muted"}`}
                  />
                )}
                <span className="max-w-[120px] truncate">{tab.title || "New Tab"}</span>
                {tab.isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-nd-accent shrink-0" />
                )}
                {tab.isMuted && <VolumeX className="h-3 w-3 text-nd-danger shrink-0" />}
                {tab.isPinned && <Pin className="h-3 w-3 text-nd-accent shrink-0 rotate-45" />}
                <button
                  type="button"
                  onClick={(e) => closeTab(tab.id, e)}
                  aria-label={`Close tab: ${tab.title || "New Tab"}`}
                  className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-nd-surface text-nd-text-muted hover:text-nd-text shrink-0"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => createTab()}
            aria-label="Open new tab"
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text transition"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDownloadsMenu((v) => !v)}
            aria-label="Downloads"
            aria-expanded={showDownloadsMenu}
            className={`relative rounded-xl border p-2 text-nd-text transition ${
              showDownloadsMenu || activeDownloadCount > 0
                ? "bg-nd-accent/15 border-nd-accent/30 text-nd-accent"
                : "bg-nd-surface/30 border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text"
            }`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {activeDownloadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-nd-accent text-[9px] font-bold text-nd-bg">
                {activeDownloadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDiagnostics((v) => !v);
              if (!showDiagnostics) loadDiagnostics();
            }}
            aria-label="Session diagnostics"
            aria-expanded={showDiagnostics}
            className={`rounded-xl border p-2 text-nd-text transition ${
              showDiagnostics
                ? "bg-nd-accent/15 border-nd-accent/30 text-nd-accent"
                : "bg-nd-surface/30 border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text"
            }`}
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setShowVpnPanel((v) => !v)}
            aria-label="Browser VPN"
            aria-expanded={showVpnPanel}
            className={`rounded-xl border p-2 text-nd-text transition ${
              showVpnPanel
                ? "bg-nd-warning/15 border-nd-warning/30 text-nd-warning"
                : "bg-nd-surface/30 border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text"
            }`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Navigation & Address Bar Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-nd-text-muted/10 bg-nd-surface/5 px-4 py-2 shrink-0" data-controller-zone="browser">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goBack}
            disabled={!activeTab?.canGoBack}
            aria-label="Back"
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!activeTab?.canGoForward}
            aria-label="Forward"
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={activeTab?.isLoading ? stop : refresh}
            aria-label={activeTab?.isLoading ? "Stop loading" : "Reload page"}
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text"
          >
            {activeTab?.isLoading ? <X className="h-4 w-4" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => navigate("https://example.com")}
            aria-label="Home"
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/20 px-3 py-1.5 focus-within:border-nd-accent/40 focus-within:ring-2 focus-within:ring-nd-accent/25 transition">
          {activeTab?.security === "secure" ? (
            <span aria-label="Secure HTTPS connection" role="img">
              <Lock className="h-3.5 w-3.5 text-nd-success" aria-hidden="true" />
            </span>
          ) : (
            <span aria-label="Insecure HTTP connection" role="img">
              <Unlock className="h-3.5 w-3.5 text-nd-warning" aria-hidden="true" />
            </span>
          )}
          <input
            ref={urlInputRef}
            id="browser-address-input"
            data-controller-default="true"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate(urlInput)}
            aria-label="Address bar"
            className="flex-1 bg-transparent text-xs text-nd-text outline-none"
            placeholder="Search or enter web URL..."
          />
          <button
            type="button"
            onClick={() => navigate(urlInput)}
            className="rounded px-2 py-0.5 text-xs font-semibold text-nd-accent hover:bg-nd-accent/15 transition"
          >
            Go
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            aria-pressed={isBookmarked}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              isBookmarked
                ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent"
                : "border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text"
            }`}
          >
            <Star className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleToggleAdBlock}
            aria-label={adBlockEnabled ? "Disable ad blocker" : "Enable ad blocker"}
            aria-pressed={adBlockEnabled}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              adBlockEnabled
                ? "border-nd-success/30 bg-nd-success/10 text-nd-success"
                : "border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text"
            }`}
          >
            {adBlockEnabled ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <Shield className="h-4 w-4" aria-hidden="true" />}
          </button>

          {/* Profile Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfilesMenu((v) => !v);
                setShowDownloadsMenu(false);
                setShowDiagnostics(false);
              }}
              aria-label="Switch browser profile"
              aria-expanded={showProfilesMenu}
              className="flex items-center gap-1.5 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 px-3 py-2 text-xs font-semibold text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeProfile?.name || "Profile"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>

            {showProfilesMenu && (
              <div className="absolute right-0 top-full z-[999] mt-1.5 w-64 rounded-2xl border border-nd-text-muted/15 bg-nd-bg/98 p-3 shadow-2xl backdrop-blur-xl">
                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-nd-text-muted">
                  Session Profile Isolation
                </div>
                {profiles.map((p) => {
                  const isCurrent = p.id === activeTab?.profileId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => changeProfile(p.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                        isCurrent
                          ? "bg-nd-accent/10 text-nd-accent font-semibold"
                          : "hover:bg-nd-surface/50 text-nd-text/80 hover:text-nd-text"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-nd-text-muted">
                          {p.persistent ? "Persistent Session" : "In-Memory/Private"}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {!p.persistent && (
                          <span role="img" aria-label="Private mode">
                            <Lock className="h-3 w-3 text-nd-warning" aria-hidden="true" />
                          </span>
                        )}
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-nd-accent" />}
                      </div>
                    </button>
                  );
                })}
                <div className="my-2 border-t border-nd-text-muted/10" />
                {activeProfile && (
                  <button
                    type="button"
                    onClick={() => clearProfileData(activeProfile.id)}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-nd-danger hover:bg-nd-danger/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Clear Profile Storage</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleFind}
            aria-label="Find in page"
            aria-pressed={findOpen}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              findOpen
                ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent"
                : "border-nd-text-muted/10 text-nd-text-muted"
            }`}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (showSidebar === "history") setShowSidebar(null);
              else setShowSidebar("history");
            }}
            aria-label="History"
            aria-pressed={showSidebar === "history"}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              showSidebar === "history"
                ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent"
                : "border-nd-text-muted/10 text-nd-text-muted"
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (showSidebar === "bookmarks") setShowSidebar(null);
              else setShowSidebar("bookmarks");
            }}
            aria-label="Bookmarks"
            aria-pressed={showSidebar === "bookmarks"}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              showSidebar === "bookmarks"
                ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent"
                : "border-nd-text-muted/10 text-nd-text-muted"
            }`}
          >
            <BookMarked className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={openDevTools}
            aria-label="Inspect (DevTools)"
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={saveToMemory}
            aria-label="Save page to memory fact"
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggleVisibility}
            aria-label={visible ? "Hide viewport" : "Show viewport"}
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Find Bar */}
      {findOpen && (
        <div className="flex items-center gap-3 border-b border-nd-accent/20 bg-nd-accent/5 px-4 py-2 shrink-0">
          <Search className="h-4 w-4 text-nd-accent" />
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitFind(true)}
            placeholder="Search text in page..."
            aria-label="Find text in page"
            className="flex-1 bg-transparent text-xs text-nd-text outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submitFind(false)}
              className="rounded px-2.5 py-1 bg-nd-surface border border-nd-text-muted/15 text-xs text-nd-text-muted hover:text-nd-text transition"
            >
              Find Previous
            </button>
            <button
              type="button"
              onClick={() => submitFind(true)}
              className="rounded px-2.5 py-1 bg-nd-accent text-xs font-semibold text-nd-bg hover:opacity-90 transition"
            >
              Find Next
            </button>
            <button
              type="button"
              onClick={() => setFindOpen(false)}
              aria-label="Close find bar"
              className="rounded p-1 text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Diagnostics Panel Overlay */}
      {showDiagnostics && (
        <div className="absolute right-4 top-24 z-[999] w-96 rounded-2xl border border-nd-text-muted/15 bg-nd-bg/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 border-b border-nd-text-muted/10 pb-2">
            <h4 className="text-sm font-semibold text-nd-text flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-nd-accent" />
              <span>Diagnostics / Process Monitor</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowDiagnostics(false)}
              aria-label="Close diagnostics panel"
              className="text-nd-text-muted hover:text-nd-text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin text-xs">
            <button
              type="button"
              onClick={loadDiagnostics}
              className="px-2.5 py-1.5 rounded-lg bg-nd-surface text-nd-text hover:bg-nd-surface/80 transition text-center mb-1.5 font-semibold"
            >
              Refresh Diagnostics Report
            </button>
            {diagnosticsReport ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span className="text-nd-text-muted">Active Views:</span>
                  <span className="font-semibold">{diagnosticsReport.activeViewsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nd-text-muted">Profile Partitions:</span>
                  <span className="font-semibold">{diagnosticsReport.sessionsCount}</span>
                </div>
                {diagnosticsReport.tabs &&
                  diagnosticsReport.tabs.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-nd-surface/30 border border-nd-text-muted/10"
                    >
                      <div className="font-semibold text-nd-accent truncate">{t.title}</div>
                      <div className="text-[10px] text-nd-text-muted mt-1 truncate">ID: {t.id}</div>
                      <div className="text-[10px] text-nd-text-muted truncate">
                        Profile: {t.profileId}
                      </div>
                      <div className="text-[10px] text-nd-text-muted">State: {t.state}</div>
                      {t.pid && (
                        <div className="text-[10px] text-nd-success font-mono">
                          Process PID: {t.pid}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-nd-text-muted text-center py-4">
                Click Refresh to query details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Downloads Panel Overlay */}
      {showDownloadsMenu && (
        <div className="absolute right-4 top-24 z-[999] w-96 rounded-2xl border border-nd-text-muted/15 bg-nd-bg/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 border-b border-nd-text-muted/10 pb-2">
            <h4 className="text-sm font-semibold text-nd-text flex items-center gap-1.5">
              <Download className="h-4 w-4 text-nd-accent" />
              <span>Downloads Tracker</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowDownloadsMenu(false)}
              aria-label="Close downloads panel"
              className="text-nd-text-muted hover:text-nd-text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
            {downloads.length === 0 ? (
              <div className="text-xs text-nd-text-muted text-center py-8">
                No active or recent downloads.
              </div>
            ) : (
              downloads.map((d) => {
                const percent =
                  d.totalBytes > 0 ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0;
                return (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 text-xs flex flex-col gap-2"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold truncate text-nd-text">{d.filename}</span>
                      <span className="text-[10px] uppercase font-bold text-nd-accent shrink-0">
                        {d.state}
                      </span>
                    </div>
                    {d.state === "progressing" && (
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-nd-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-nd-accent transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-nd-text-muted">
                          <span>{percent}% Completed</span>
                          <span>
                            {(d.receivedBytes / 1024 / 1024).toFixed(1)} /{" "}
                            {(d.totalBytes / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end mt-1">
                      {d.state === "progressing" && (
                        <button
                          type="button"
                          onClick={() =>
                            window.neurodeck?.browser
                              ?.cancelDownload(d.id)
                              .then(() => loadDownloads())
                          }
                          className="px-2 py-1 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20 rounded text-[10px] font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                      {d.state === "completed" && (
                        <>
                          <button
                            type="button"
                            onClick={() => window.neurodeck?.browser?.openDownload(d.id)}
                            className="px-2 py-1 bg-nd-accent/10 text-nd-accent hover:bg-nd-accent/20 rounded text-[10px] font-semibold transition"
                          >
                            Open File
                          </button>
                          <button
                            type="button"
                            onClick={() => window.neurodeck?.browser?.showDownload(d.id)}
                            className="px-2 py-1 bg-nd-surface border border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text rounded text-[10px] transition"
                          >
                            Show in Folder
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {showVpnPanel && <BrowserVpnPanel visible={showVpnPanel} onClose={() => setShowVpnPanel(false)} />}

      {/* Main Viewport & Collapsible Sidebar Drawer */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Viewport Overlay */}
        <div
          ref={viewportRef}
          className={`flex-1 overflow-hidden relative ${
            visible &&
            activeTab &&
            activeTab.state !== "new" &&
            activeTab.state !== "error" &&
            activeTab.state !== "crashed" &&
            activeTab.state !== "blocked"
              ? ""
              : "hidden"
          }`}
          style={{ background: "transparent" }}
        />
        {!visible && (
          <div className="flex flex-1 items-center justify-center bg-nd-surface/10 border border-nd-text-muted/10 m-4 rounded-2xl">
            <div className="text-center p-6 flex flex-col items-center gap-3">
              <Globe className="h-10 w-10 text-nd-text-muted animate-pulse" />
              <p className="text-sm font-semibold text-nd-text">Viewport Suspended</p>
              <p className="text-xs text-nd-text-muted max-w-xs leading-relaxed">
                Guest frame process detached to save Steam Deck CPU / GPU / Battery resource. Tap
                the eye icon in toolbar to resume.
              </p>
              <button
                type="button"
                onClick={toggleVisibility}
                className="mt-2 px-4 py-2 bg-nd-accent text-xs font-semibold text-nd-bg rounded-xl hover:opacity-90 transition"
              >
                Resume Session View
              </button>
            </div>
          </div>
        )}

        {visible && activeTab && (
          <>
            {activeTab.state === "new" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-bg text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <Globe className="h-12 w-12 text-nd-accent animate-pulse" />
                  <div>
                    <h3 className="text-lg font-bold text-nd-text">New Session Tab</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      Start browsing by typing a URL or searching Google. Your session is fully isolated.
                    </p>
                  </div>

                  {/* Search / Navigate Bar */}
                  <div className="flex w-full items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 focus-within:border-nd-accent/40 focus-within:ring-2 focus-within:ring-nd-accent/25 transition">
                    <Search className="h-4 w-4 text-nd-text-muted" />
                    <input
                      id="new-tab-search-input"
                      type="text"
                      placeholder="Search Google or enter web address..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value;
                          if (val.trim()) navigate(val.trim());
                        }
                      }}
                      className="flex-1 bg-transparent text-xs text-nd-text outline-none animate-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("new-tab-search-input") as HTMLInputElement;
                        if (input && input.value.trim()) navigate(input.value.trim());
                      }}
                      className="rounded px-2.5 py-1 bg-nd-accent text-xs font-semibold text-nd-bg hover:opacity-90 transition"
                    >
                      Search
                    </button>
                  </div>

                  {/* Quick Links */}
                  <div className="w-full flex flex-col gap-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-nd-text-muted text-left">
                      Quick Access
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => navigate("https://github.com")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/25 p-3 hover:bg-nd-accent/10 hover:border-nd-accent/30 text-nd-text transition"
                      >
                        <Globe className="h-5 w-5 text-nd-accent" />
                        <span className="text-[10px] font-semibold">GitHub</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("https://stackoverflow.com")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/25 p-3 hover:bg-nd-accent/10 hover:border-nd-accent/30 text-nd-text transition"
                      >
                        <BookOpen className="h-5 w-5 text-nd-accent" />
                        <span className="text-[10px] font-semibold">StackOverflow</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("https://github.com/khaoticdev62/NEURODECK")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/25 p-3 hover:bg-nd-accent/10 hover:border-nd-accent/30 text-nd-text transition"
                      >
                        <Terminal className="h-5 w-5 text-nd-accent" />
                        <span className="text-[10px] font-semibold">Repository</span>
                      </button>
                    </div>
                  </div>

                  {/* Data Actions */}
                  <div className="w-full flex flex-col gap-2.5 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-nd-text-muted text-left">
                      Privacy Actions
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleClearData("currentTab")}
                        className="px-3 py-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/25 text-[10px] font-semibold text-nd-text hover:bg-nd-warning/10 hover:border-nd-warning/30 hover:text-nd-warning transition"
                      >
                        Clear Current Tab Data
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearData("all")}
                        className="px-3 py-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/25 text-[10px] font-semibold text-nd-text hover:bg-nd-danger/10 hover:border-nd-danger/30 hover:text-nd-danger transition"
                      >
                        Purge All Sessions Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-bg text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-danger/10 flex items-center justify-center border border-nd-danger/25">
                    <AlertTriangle className="h-6 w-6 text-nd-danger" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text">Failed to Load Page</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed truncate max-w-sm">
                      Could not establish connection to <code className="text-nd-accent font-mono text-[10px]">{activeTab.url}</code>
                    </p>
                  </div>

                  {/* Diagnostic Details */}
                  <div className="w-full border border-nd-text-muted/10 bg-nd-surface/10 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setErrorDetailsOpen(!errorDetailsOpen)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-nd-text font-semibold hover:bg-nd-surface/20 transition"
                    >
                      <span>Diagnostic Information</span>
                      <ChevronDown className={`h-4 w-4 text-nd-text-muted transition-transform ${errorDetailsOpen ? "rotate-180" : ""}`} />
                    </button>
                    {errorDetailsOpen && (
                      <div className="border-t border-nd-text-muted/10 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1.5 bg-nd-surface/5 max-h-40 overflow-y-auto scrollbar-thin">
                        <div><span className="text-nd-accent">Error Code:</span> {activeTab.diagnostics?.lastErrorCode || "ERR_CONNECTION_REFUSED"}</div>
                        <div><span className="text-nd-accent">Description:</span> {activeTab.diagnostics?.lastErrorMessage || "The server at the destination address refused the connection or DNS resolution failed."}</div>
                        <div><span className="text-nd-accent">Target:</span> {activeTab.url}</div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={!activeTab?.canGoBack}
                      className="px-4 py-2 bg-nd-surface border border-nd-text-muted/15 text-xs font-semibold text-nd-text rounded-xl hover:bg-nd-surface/80 transition disabled:opacity-40"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      className="px-4 py-2 bg-nd-accent text-xs font-semibold text-nd-bg rounded-xl hover:opacity-90 transition"
                    >
                      Retry Connection
                    </button>
                    <button
                      type="button"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                      className="px-4 py-2 bg-nd-surface/30 border border-nd-text-muted/10 text-xs font-semibold text-nd-text-muted hover:text-nd-text rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Open Externally</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "crashed" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-bg text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-warning/10 flex items-center justify-center border border-nd-warning/25 animate-pulse">
                    <Terminal className="h-6 w-6 text-nd-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text">Renderer Process Crashed</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      The sandboxed web page process has crashed. This can happen if the site uses excessive memory resources.
                    </p>
                  </div>

                  {/* Diagnostic Details */}
                  <div className="w-full p-3 border border-nd-warning/20 bg-nd-warning/5 rounded-xl text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
                    <div><span className="text-nd-warning">Status:</span> PROCESS_CRASHED</div>
                    <div><span className="text-nd-warning">Consecutive Crashes:</span> {activeTab.crashCount || 1}</div>
                    <div><span className="text-nd-warning">Location:</span> {activeTab.url}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => closeTab(activeTab.id, e)}
                      className="px-4 py-2 bg-nd-surface border border-nd-text-muted/15 text-xs font-semibold text-nd-text rounded-xl hover:bg-nd-surface/80 transition"
                    >
                      Close Tab
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      className="px-4 py-2 bg-nd-accent text-xs font-semibold text-nd-bg rounded-xl hover:opacity-90 transition"
                    >
                      Recover Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                      className="px-4 py-2 bg-nd-surface/30 border border-nd-text-muted/10 text-xs font-semibold text-nd-text-muted hover:text-nd-text rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Open Externally</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "blocked" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-bg text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-danger/10 flex items-center justify-center border border-nd-danger/25">
                    <Lock className="h-6 w-6 text-nd-danger" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text">Website Access Blocked</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      Access to this URL has been blocked in accordance with your security settings or local file access restrictions.
                    </p>
                  </div>

                  {/* Policy details */}
                  <div className="w-full p-3 border border-nd-text-muted/10 bg-nd-surface/10 rounded-xl text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
                    <div><span className="text-nd-accent">Policy Rule:</span> LOCAL_FILE_SYSTEM_ISOLATION</div>
                    <div><span className="text-nd-accent">Detail:</span> Accessing local machine files (file://) or system settings is disabled for browser security.</div>
                    <div><span className="text-nd-accent">Attempted URL:</span> {activeTab.url}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={!activeTab?.canGoBack}
                      className="px-4 py-2 bg-nd-surface border border-nd-text-muted/15 text-xs font-semibold text-nd-text rounded-xl hover:bg-nd-surface/80 transition disabled:opacity-40"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                      className="px-4 py-2 bg-nd-accent text-xs font-semibold text-nd-bg rounded-xl hover:opacity-90 transition flex items-center gap-1.5"
                    >
                      <span>Open in External Browser</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Sidebar Drawer */}
        {showSidebar && (
          <div className="w-80 border-l border-nd-text-muted/10 bg-nd-surface/20 flex flex-col shrink-0 animate-in slide-in-from-right duration-250 backdrop-blur-lg">
            <div className="flex items-center justify-between p-3 border-b border-nd-text-muted/10">
              <span className="text-xs font-bold uppercase tracking-wider text-nd-text">
                {showSidebar === "history" ? "History Log" : "Saved Bookmarks"}
              </span>
              <button
                type="button"
                onClick={() => setShowSidebar(null)}
                aria-label="Close sidebar"
                className="rounded p-1 text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Sidebar content list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
              {showSidebar === "history" ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-nd-danger/10 border border-nd-danger/20 text-nd-danger hover:bg-nd-danger/20 rounded-xl text-xs font-semibold transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Purge History</span>
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <div className="text-xs text-nd-text-muted text-center py-8">
                      No history recorded
                    </div>
                  ) : (
                    history.map((h) => (
                      <div
                        key={h.id}
                        onDoubleClick={() => navigate(h.url)}
                        className="group p-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 hover:border-nd-accent/20 cursor-pointer flex justify-between items-start gap-2 text-xs"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate text-nd-text group-hover:text-nd-accent transition">
                            {h.title || h.url}
                          </span>
                          <span className="text-[10px] text-nd-text-muted truncate mt-0.5">
                            {h.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteHistoryEntry(h.id)}
                          aria-label={`Delete history entry: ${h.title || h.url}`}
                          className="opacity-0 group-hover:opacity-100 p-1 text-nd-text-muted hover:text-nd-danger transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {bookmarks.length === 0 ? (
                    <div className="text-xs text-nd-text-muted text-center py-8">
                      No bookmarks saved
                    </div>
                  ) : (
                    bookmarks.map((b) => (
                      <div
                        key={b.id}
                        onDoubleClick={() => navigate(b.url)}
                        className="group p-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 hover:border-nd-accent/20 cursor-pointer flex justify-between items-start gap-2 text-xs"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate text-nd-text group-hover:text-nd-accent transition">
                            {b.title || b.url}
                          </span>
                          <span className="text-[10px] text-nd-text-muted truncate mt-0.5">
                            {b.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteBookmark(b.id)}
                          aria-label={`Remove bookmark: ${b.title || b.url}`}
                          className="opacity-0 group-hover:opacity-100 p-1 text-nd-text-muted hover:text-nd-danger transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gamepad / Navigation Hints Footer */}
      <div className="flex items-center justify-between border-t border-nd-text-muted/10 bg-nd-surface/10 px-4 py-2 text-[10px] font-semibold text-nd-text-muted shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">
              L2
            </span>{" "}
            Navigate Back
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">
              R2
            </span>{" "}
            Navigate Forward
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">
              Y
            </span>{" "}
            Focus Address Bar
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">
              X
            </span>{" "}
            Toggle Tab Strip
          </span>
        </div>
        <div>
          <span>NeuroBrowse Guest sandboxed isolation partition</span>
        </div>
      </div>
    </div>
  );
}
