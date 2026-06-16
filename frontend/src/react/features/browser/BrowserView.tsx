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
  VolumeX,
  Lock,
  Unlock,
  Settings,
  AlertTriangle,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { BrowserVpnPanel } from "../browser-vpn/BrowserVpnPanel";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { StatusChip } from "../../components/primitives/StatusChip";

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

const ALLOWED_NAVIGATION_SCHEMES = ["http:", "https:"];

function isAllowedNavigationUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return ALLOWED_NAVIGATION_SCHEMES.includes(url.protocol);
  } catch {
    // No scheme means a search query; let the sidecar normalize it.
    return true;
  }
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
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({});

  const viewportRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (kind: "ok" | "error", text: string) => {
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
    if (!isAllowedNavigationUrl(urlStr)) {
      showNotice("error", "Blocked: only http/https URLs can be opened.");
      return;
    }
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

  const navigate = async (targetUrl: string) => {
    if (!targetUrl.trim() || !window.neurodeck?.browser) return;
    if (!isAllowedNavigationUrl(targetUrl)) {
      showNotice("error", "Blocked: only http/https URLs can be opened.");
      return;
    }
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
        showNotice("ok", "Page content captured and injected into vector memory.");
      } catch (err: unknown) {
        showNotice("error", `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
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
      showNotice("ok", `Partition data purged for profile: ${profileId}`);
    }
  };

  const handleClearData = async (scope: "currentTab" | "all") => {
    if (window.neurodeck?.browser?.clearBrowserData) {
      try {
        const res = await window.neurodeck.browser.clearBrowserData(scope);
        if (res?.success) {
          showNotice(
            "ok",
            scope === "currentTab" ? "Current session data cleared." : "All profile storage purged."
          );
        } else {
          showNotice("error", "Failed to clear data.");
        }
      } catch (err: unknown) {
        showNotice(
          "error",
          `Failed to clear data: ${err instanceof Error ? err.message : String(err)}`
        );
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
    <div
      className="browser-container flex h-full flex-col bg-nd-surface-app text-nd-text-primary select-none"
      data-controller-zone="browser"
    >
      {/* Inline notice (replaces alert() calls) */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute bottom-4 left-1/2 z-[var(--z-toast)] -translate-x-1/2 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-lg ${
            notice.kind === "ok"
              ? "border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success"
              : "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error"
          }`}
        >
          {notice.text}
        </div>
      )}
      {/* Permission Prompts Overlay */}
      {permissions.length > 0 && (
        <div className="absolute top-4 left-1/2 z-[var(--z-toast)] w-96 -translate-x-1/2 rounded-2xl border border-nd-accent-primary/30 bg-nd-surface-app/95 p-4 shadow-2xl flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-nd-accent-warning"
              aria-hidden="true"
            />
            <div>
              <h4 className="text-sm font-semibold text-nd-text-primary">Permission Request</h4>
              <p className="mt-1 text-xs leading-relaxed text-nd-text-muted">
                The site <code className="text-nd-accent-primary">{permissions[0].origin}</code>{" "}
                requests access to{" "}
                <code className="text-nd-accent-primary">{permissions[0].permission}</code>.
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="xs"
              fullWidth
              onClick={() => respondToPermission(permissions[0].requestId, "allow_once")}
            >
              Allow Once
            </Button>
            <Button
              variant="success"
              size="xs"
              fullWidth
              onClick={() => respondToPermission(permissions[0].requestId, "allow_always")}
            >
              Allow Always
            </Button>
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={() => respondToPermission(permissions[0].requestId, "block_once")}
            >
              Block Once
            </Button>
            <Button
              variant="danger"
              size="xs"
              fullWidth
              onClick={() => respondToPermission(permissions[0].requestId, "block_always")}
            >
              Block Always
            </Button>
          </div>
        </div>
      )}

      {/* Title / Tab Strip */}
      <div
        className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2 shrink-0"
        data-controller-zone="toolbar"
      >
        <div
          role="tablist"
          aria-label="Browser tabs"
          className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 max-w-[80%] pr-4"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => switchTab(tab.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && void switchTab(tab.id)}
                className={`group relative flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition cursor-pointer shrink-0 border outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
                  isActive
                    ? "bg-nd-surface-selected border-nd-accent-primary/40 text-nd-text-primary font-semibold"
                    : "bg-nd-surface-secondary/40 border-transparent text-nd-text-muted hover:bg-nd-surface-hover hover:text-nd-text-primary"
                }`}
              >
                {tab.isPrivate ? (
                  <Lock
                    className="h-3.5 w-3.5 text-nd-accent-warning shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Globe
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-nd-accent-primary" : "text-nd-text-muted"}`}
                    aria-hidden="true"
                  />
                )}
                <span className="max-w-[120px] truncate">{tab.title || "New Tab"}</span>
                {tab.isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-nd-accent-primary shrink-0" />
                )}
                {tab.isMuted && <VolumeX className="h-3 w-3 text-nd-accent-error shrink-0" />}
                {tab.isPinned && (
                  <Pin className="h-3 w-3 text-nd-accent-primary shrink-0 rotate-45" />
                )}
                <IconButton
                  aria-label={`Close tab: ${tab.title || "New Tab"}`}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => closeTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </IconButton>
              </div>
            );
          })}
          <IconButton
            aria-label="Open new tab"
            variant="subtle"
            size="md"
            onClick={() => createTab()}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <IconButton
              aria-label="Downloads"
              variant={showDownloadsMenu || activeDownloadCount > 0 ? "accent" : "subtle"}
              size="md"
              onClick={() => setShowDownloadsMenu((v) => !v)}
              aria-expanded={showDownloadsMenu}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            {activeDownloadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-nd-accent-primary text-[9px] font-bold text-nd-surface-app">
                {activeDownloadCount}
              </span>
            )}
          </div>

          <IconButton
            aria-label="Session diagnostics"
            variant={showDiagnostics ? "accent" : "subtle"}
            size="md"
            onClick={() => {
              setShowDiagnostics((v) => !v);
              if (!showDiagnostics) loadDiagnostics();
            }}
            aria-expanded={showDiagnostics}
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Browser VPN"
            variant={showVpnPanel ? "danger" : "subtle"}
            size="md"
            onClick={() => setShowVpnPanel((v) => !v)}
            aria-expanded={showVpnPanel}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {/* Navigation & Address Bar Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-nd-border-subtle bg-nd-surface-app/60 px-4 py-2 shrink-0"
        data-controller-zone="browser"
      >
        <div className="flex items-center gap-1">
          <IconButton
            aria-label="Back"
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={!activeTab?.canGoBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Forward"
            variant="ghost"
            size="md"
            onClick={goForward}
            disabled={!activeTab?.canGoForward}
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label={activeTab?.isLoading ? "Stop loading" : "Reload page"}
            variant="ghost"
            size="md"
            onClick={activeTab?.isLoading ? stop : refresh}
          >
            {activeTab?.isLoading ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            aria-label="Home"
            variant="ghost"
            size="md"
            onClick={() => navigate("https://example.com")}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        {/* Address Bar */}
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-1.5 focus-within:border-nd-accent-primary/40 focus-within:ring-2 focus-within:ring-nd-accent-primary/25 transition">
          {activeTab?.security === "secure" ? (
            <StatusChip tone="success" size="sm" icon={Lock}>
              Secure
            </StatusChip>
          ) : (
            <StatusChip tone="warning" size="sm" icon={Unlock}>
              Insecure
            </StatusChip>
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
            className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none"
            placeholder="Search or enter web URL..."
          />
          <Button variant="primary" size="xs" onClick={() => navigate(urlInput)}>
            Go
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            variant={isBookmarked ? "accent" : "subtle"}
            size="md"
            onClick={toggleBookmark}
            aria-pressed={isBookmarked}
          >
            <Star
              className="h-4 w-4"
              fill={isBookmarked ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </IconButton>

          <IconButton
            aria-label={adBlockEnabled ? "Disable ad blocker" : "Enable ad blocker"}
            variant={adBlockEnabled ? "accent" : "subtle"}
            size="md"
            onClick={handleToggleAdBlock}
            aria-pressed={adBlockEnabled}
          >
            {adBlockEnabled ? (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Shield className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>

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
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 text-xs font-semibold text-nd-text-muted transition hover:bg-nd-surface-hover hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeProfile?.name || "Profile"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>

            {showProfilesMenu && (
              <FocusTrapContainer
                active={showProfilesMenu}
                onEscape={() => setShowProfilesMenu(false)}
                className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-64 rounded-2xl border border-nd-border-subtle bg-nd-surface-app/98 p-3 shadow-2xl"
                role="dialog"
                aria-label="Switch browser profile"
              >
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
                      className={`flex w-full min-h-[40px] items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
                        isCurrent
                          ? "bg-nd-surface-selected text-nd-accent-primary font-semibold"
                          : "hover:bg-nd-surface-hover text-nd-text-primary/80 hover:text-nd-text-primary"
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
                            <Lock className="h-3 w-3 text-nd-accent-warning" aria-hidden="true" />
                          </span>
                        )}
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-nd-accent-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
                <div className="my-2 border-t border-nd-border-subtle" />
                {activeProfile && (
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    icon={Trash2}
                    onClick={() => clearProfileData(activeProfile.id)}
                  >
                    Clear Profile Storage
                  </Button>
                )}
              </FocusTrapContainer>
            )}
          </div>

          <IconButton
            aria-label="Find in page"
            variant={findOpen ? "accent" : "subtle"}
            size="md"
            onClick={handleFind}
            aria-pressed={findOpen}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="History"
            variant={showSidebar === "history" ? "accent" : "subtle"}
            size="md"
            onClick={() => {
              if (showSidebar === "history") setShowSidebar(null);
              else setShowSidebar("history");
            }}
            aria-pressed={showSidebar === "history"}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Bookmarks"
            variant={showSidebar === "bookmarks" ? "accent" : "subtle"}
            size="md"
            onClick={() => {
              if (showSidebar === "bookmarks") setShowSidebar(null);
              else setShowSidebar("bookmarks");
            }}
            aria-pressed={showSidebar === "bookmarks"}
          >
            <BookMarked className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Inspect (DevTools)"
            variant="subtle"
            size="md"
            onClick={openDevTools}
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label="Save page to memory fact"
            variant="subtle"
            size="md"
            onClick={saveToMemory}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            aria-label={visible ? "Hide viewport" : "Show viewport"}
            variant="subtle"
            size="md"
            onClick={toggleVisibility}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Find Bar */}
      {findOpen && (
        <FocusTrapContainer
          active={findOpen}
          onEscape={() => setFindOpen(false)}
          className="flex items-center gap-3 border-b border-nd-accent-primary/20 bg-nd-accent-primary/5 px-4 py-2 shrink-0"
          role="dialog"
          aria-label="Find in page"
        >
          <Search className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitFind(true)}
            placeholder="Search text in page..."
            aria-label="Find text in page"
            className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="xs" onClick={() => submitFind(false)}>
              Find Previous
            </Button>
            <Button variant="primary" size="xs" onClick={() => submitFind(true)}>
              Find Next
            </Button>
            <IconButton
              aria-label="Close find bar"
              variant="ghost"
              size="md"
              onClick={() => setFindOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
        </FocusTrapContainer>
      )}

      {/* Diagnostics Panel Overlay */}
      {showDiagnostics && (
        <FocusTrapContainer
          active={showDiagnostics}
          onEscape={() => setShowDiagnostics(false)}
          className="absolute right-4 top-24 z-[var(--z-dropdown)] w-96 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 p-4 shadow-2xl"
          role="dialog"
          aria-label="Browser diagnostics panel"
        >
          <div className="flex items-center justify-between mb-3 border-b border-nd-border-subtle pb-2">
            <h4 className="text-sm font-semibold text-nd-text-primary flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
              <span>Diagnostics / Process Monitor</span>
            </h4>
            <IconButton
              aria-label="Close diagnostics panel"
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin text-xs">
            <Button variant="secondary" size="sm" fullWidth onClick={loadDiagnostics}>
              Refresh Diagnostics Report
            </Button>
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
                      className="p-2 rounded-lg bg-nd-surface-secondary/40 border border-nd-border-subtle"
                    >
                      <div className="font-semibold text-nd-accent-primary truncate">{t.title}</div>
                      <div className="text-[10px] text-nd-text-muted mt-1 truncate">ID: {t.id}</div>
                      <div className="text-[10px] text-nd-text-muted truncate">
                        Profile: {t.profileId}
                      </div>
                      <div className="text-[10px] text-nd-text-muted">State: {t.state}</div>
                      {t.pid && (
                        <div className="text-[10px] text-nd-accent-success font-mono">
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
        </FocusTrapContainer>
      )}

      {/* Downloads Panel Overlay */}
      {showDownloadsMenu && (
        <FocusTrapContainer
          active={showDownloadsMenu}
          onEscape={() => setShowDownloadsMenu(false)}
          className="absolute right-4 top-24 z-[var(--z-dropdown)] w-96 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 p-4 shadow-2xl"
          role="dialog"
          aria-label="Downloads tracker"
        >
          <div className="flex items-center justify-between mb-3 border-b border-nd-border-subtle pb-2">
            <h4 className="text-sm font-semibold text-nd-text-primary flex items-center gap-1.5">
              <Download className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
              <span>Downloads Tracker</span>
            </h4>
            <IconButton
              aria-label="Close downloads panel"
              variant="ghost"
              size="sm"
              onClick={() => setShowDownloadsMenu(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
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
                    className="p-2.5 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 text-xs flex flex-col gap-2"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold truncate text-nd-text-primary">
                        {d.filename}
                      </span>
                      <Badge
                        tone={
                          d.state === "completed"
                            ? "success"
                            : d.state === "progressing"
                              ? "accent"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {d.state}
                      </Badge>
                    </div>
                    {d.state === "progressing" && (
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-nd-surface-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-nd-accent-primary transition-all duration-300"
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
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() =>
                            window.neurodeck?.browser
                              ?.cancelDownload(d.id)
                              .then(() => loadDownloads())
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      {d.state === "completed" && (
                        <>
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => window.neurodeck?.browser?.openDownload(d.id)}
                          >
                            Open File
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => window.neurodeck?.browser?.showDownload(d.id)}
                          >
                            Show in Folder
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </FocusTrapContainer>
      )}

      {showVpnPanel && (
        <FocusTrapContainer
          active={showVpnPanel}
          onEscape={() => setShowVpnPanel(false)}
          className="absolute inset-0 z-[var(--z-modal)] flex items-start justify-end bg-nd-bg/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="Browser VPN"
        >
          <BrowserVpnPanel visible={showVpnPanel} onClose={() => setShowVpnPanel(false)} />
        </FocusTrapContainer>
      )}

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
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 m-4">
            <div className="text-center p-6 flex flex-col items-center gap-3">
              <Globe className="h-10 w-10 text-nd-text-muted animate-pulse" aria-hidden="true" />
              <p className="text-sm font-semibold text-nd-text-primary">Viewport Suspended</p>
              <p className="text-xs text-nd-text-muted max-w-xs leading-relaxed">
                Guest frame process detached to save Steam Deck CPU / GPU / Battery resource. Tap
                the eye icon in toolbar to resume.
              </p>
              <Button variant="primary" size="sm" onClick={toggleVisibility} className="mt-2">
                Resume Session View
              </Button>
            </div>
          </div>
        )}

        {visible && activeTab && (
          <>
            {activeTab.state === "new" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <Globe
                    className="h-12 w-12 text-nd-accent-primary animate-pulse"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-nd-text-primary">New Session Tab</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      Start browsing by typing a URL or searching Google. Your session is fully
                      isolated.
                    </p>
                  </div>

                  {/* Search / Navigate Bar */}
                  <div className="flex w-full items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 focus-within:border-nd-accent-primary/40 focus-within:ring-2 focus-within:ring-nd-accent-primary/25 transition">
                    <Search className="h-4 w-4 text-nd-text-muted" aria-hidden="true" />
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
                      className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none animate-none"
                    />
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => {
                        const input = document.getElementById(
                          "new-tab-search-input"
                        ) as HTMLInputElement;
                        if (input && input.value.trim()) navigate(input.value.trim());
                      }}
                    >
                      Search
                    </Button>
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
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
                      >
                        <Globe className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
                        <span className="text-[10px] font-semibold">GitHub</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("https://stackoverflow.com")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
                      >
                        <BookOpen className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
                        <span className="text-[10px] font-semibold">StackOverflow</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("https://github.com/khaoticdev62/NEURODECK")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
                      >
                        <Terminal className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
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
                      <Button
                        variant="secondary"
                        size="xs"
                        fullWidth
                        onClick={() => handleClearData("currentTab")}
                      >
                        Clear Current Tab Data
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        fullWidth
                        onClick={() => handleClearData("all")}
                      >
                        Purge All Sessions Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-accent-error/10 flex items-center justify-center border border-nd-accent-error/25">
                    <AlertTriangle className="h-6 w-6 text-nd-accent-error" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text-primary">Failed to Load Page</h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed truncate max-w-sm">
                      Could not establish connection to{" "}
                      <code className="text-nd-accent-primary font-mono text-[10px]">
                        {activeTab.url}
                      </code>
                    </p>
                  </div>

                  {/* Diagnostic Details */}
                  <div className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setErrorDetailsOpen(!errorDetailsOpen)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-nd-text-primary transition hover:bg-nd-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
                    >
                      <span>Diagnostic Information</span>
                      <ChevronDown
                        className={`h-4 w-4 text-nd-text-muted transition-transform ${errorDetailsOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    {errorDetailsOpen && (
                      <div className="border-t border-nd-border-subtle bg-nd-surface-app/50 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                        <div>
                          <span className="text-nd-accent-primary">Error Code:</span>{" "}
                          {activeTab.diagnostics?.lastErrorCode || "ERR_CONNECTION_REFUSED"}
                        </div>
                        <div>
                          <span className="text-nd-accent-primary">Description:</span>{" "}
                          {activeTab.diagnostics?.lastErrorMessage ||
                            "The server at the destination address refused the connection or DNS resolution failed."}
                        </div>
                        <div>
                          <span className="text-nd-accent-primary">Target:</span> {activeTab.url}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goBack}
                      disabled={!activeTab?.canGoBack}
                    >
                      Go Back
                    </Button>
                    <Button variant="primary" size="sm" onClick={refresh}>
                      Retry Connection
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ExternalLink}
                      iconPosition="right"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                    >
                      Open Externally
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "crashed" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-accent-warning/10 flex items-center justify-center border border-nd-accent-warning/25 animate-pulse">
                    <Terminal className="h-6 w-6 text-nd-accent-warning" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text-primary">
                      Renderer Process Crashed
                    </h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      The sandboxed web page process has crashed. This can happen if the site uses
                      excessive memory resources.
                    </p>
                  </div>

                  {/* Diagnostic Details */}
                  <div className="w-full rounded-xl border border-nd-accent-warning/20 bg-nd-accent-warning/5 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
                    <div>
                      <span className="text-nd-accent-warning">Status:</span> PROCESS_CRASHED
                    </div>
                    <div>
                      <span className="text-nd-accent-warning">Consecutive Crashes:</span>{" "}
                      {activeTab.crashCount || 1}
                    </div>
                    <div>
                      <span className="text-nd-accent-warning">Location:</span> {activeTab.url}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => closeTab(activeTab.id, e)}
                    >
                      Close Tab
                    </Button>
                    <Button variant="primary" size="sm" onClick={refresh}>
                      Recover Tab
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ExternalLink}
                      iconPosition="right"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                    >
                      Open Externally
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab.state === "blocked" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
                <div className="max-w-md w-full flex flex-col items-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-nd-accent-error/10 flex items-center justify-center border border-nd-accent-error/25">
                    <Lock className="h-6 w-6 text-nd-accent-error" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nd-text-primary">
                      Website Access Blocked
                    </h3>
                    <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
                      Access to this URL has been blocked in accordance with your security settings
                      or local file access restrictions.
                    </p>
                  </div>

                  {/* Policy details */}
                  <div className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
                    <div>
                      <span className="text-nd-accent-primary">Policy Rule:</span>{" "}
                      LOCAL_FILE_SYSTEM_ISOLATION
                    </div>
                    <div>
                      <span className="text-nd-accent-primary">Detail:</span> Accessing local
                      machine files (file://) or system settings is disabled for browser security.
                    </div>
                    <div>
                      <span className="text-nd-accent-primary">Attempted URL:</span> {activeTab.url}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goBack}
                      disabled={!activeTab?.canGoBack}
                    >
                      Go Back
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ExternalLink}
                      iconPosition="right"
                      onClick={() => window.electronAPI?.openExternal(activeTab.url)}
                    >
                      Open in External Browser
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Sidebar Drawer */}
        {showSidebar && (
          <FocusTrapContainer
            active={Boolean(showSidebar)}
            onEscape={() => setShowSidebar(null)}
            className="flex w-80 shrink-0 flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/20 animate-in slide-in-from-right duration-250"
            role="dialog"
            aria-label={showSidebar === "history" ? "History Log" : "Saved Bookmarks"}
          >
            <div className="flex items-center justify-between border-b border-nd-border-subtle p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-nd-text-primary">
                {showSidebar === "history" ? "History Log" : "Saved Bookmarks"}
              </span>
              <IconButton
                aria-label="Close sidebar"
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>

            {/* Sidebar content list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
              {showSidebar === "history" ? (
                <>
                  <div className="mb-2 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      icon={Trash2}
                      onClick={clearHistory}
                    >
                      Purge History
                    </Button>
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
                        className="group flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-2 text-xs transition hover:border-nd-accent-primary/30"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-nd-text-primary transition group-hover:text-nd-accent-primary">
                            {h.title || h.url}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] text-nd-text-muted">
                            {h.url}
                          </span>
                        </div>
                        <IconButton
                          aria-label={`Delete history entry: ${h.title || h.url}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHistoryEntry(h.id)}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
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
                        className="group flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-2 text-xs transition hover:border-nd-accent-primary/30"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-nd-text-primary transition group-hover:text-nd-accent-primary">
                            {b.title || b.url}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] text-nd-text-muted">
                            {b.url}
                          </span>
                        </div>
                        <IconButton
                          aria-label={`Remove bookmark: ${b.title || b.url}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBookmark(b.id)}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </FocusTrapContainer>
        )}
      </div>

      {/* Gamepad / Navigation Hints Footer */}
      <div className="flex items-center justify-between border-t border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2 text-[10px] font-semibold text-nd-text-muted shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
              L2
            </span>{" "}
            Navigate Back
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
              R2
            </span>{" "}
            Navigate Forward
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
              Y
            </span>{" "}
            Focus Address Bar
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
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
