import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BrowserTab,
  BrowserProfile,
  BrowserHistoryEntry,
  BrowserBookmark,
  DownloadItem,
  PermissionRequest,
  Notice,
} from "../types";
import { isAllowedNavigationUrl } from "../utils";

export function useBrowser() {
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
  const [diagnosticsReport, setDiagnosticsReport] = useState<unknown>(null);
  const [visible, setVisible] = useState(true);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [showDownloadsMenu, setShowDownloadsMenu] = useState(false);
  const [errorDetailsOpen, setErrorDetailsOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({});

  const viewportRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const showNotice = useCallback((kind: "ok" | "error", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  }, []);

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
      const list = (await window.neurodeck.browser.getTabs()) as BrowserTab[];
      setTabs(list);
      const active = (await window.neurodeck.browser.getActiveTab()) as BrowserTab | undefined;
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
      const list = (await window.neurodeck.browser.getHistory(profileId)) as BrowserHistoryEntry[];
      setHistory(list);
    } catch (_) {}
  }, [tabs, activeTabId]);

  const loadBookmarks = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || "default";
    try {
      const list = (await window.neurodeck.browser.getBookmarks(profileId)) as BrowserBookmark[];
      setBookmarks(list);
    } catch (_) {}
  }, [tabs, activeTabId]);

  const loadDownloads = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    try {
      const list = (await window.neurodeck.browser.getDownloads()) as DownloadItem[];
      setDownloads(list);
      const activeCount = list.filter((d) => d.state === "progressing").length;
      setActiveDownloadCount(activeCount);
    } catch (_) {}
  }, []);

  const createTab = useCallback(
    async (urlStr: string = "https://example.com") => {
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
    },
    [activeTabId, tabs, loadTabs, reportBounds, showNotice]
  );

  const closeTab = useCallback(
    async (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.neurodeck?.browser) return;
      try {
        await window.neurodeck.browser.closeTab(tabId);
        await loadTabs();
        setTimeout(reportBounds, 100);
      } catch (_) {}
    },
    [loadTabs, reportBounds]
  );

  const switchTab = useCallback(
    async (tabId: string) => {
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
    },
    [tabs, reportBounds]
  );

  const navigate = useCallback(
    async (targetUrl: string) => {
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
          const tab = (await window.neurodeck.browser.createTab("about:blank", profileId)) as
            | BrowserTab
            | undefined;
          if (!tab) return;
          tabId = tab.id;
          await loadTabs();
          reportBounds();
        }
        const { url } = await window.neurodeck.browser.normalizeUrl(targetUrl.trim());
        setUrlInput(url);
        await window.neurodeck.browser.navigate(tabId!, url);
      } catch (_) {}
    },
    [activeTabId, tabs, loadTabs, reportBounds, showNotice]
  );

  const goBack = useCallback(async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.goBack(activeTabId);
  }, [activeTabId]);

  const goForward = useCallback(async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.goForward(activeTabId);
  }, [activeTabId]);

  const refresh = useCallback(async () => {
    if (activeTabId && window.neurodeck?.browser)
      await window.neurodeck.browser.reload(activeTabId);
  }, [activeTabId]);

  const stop = useCallback(async () => {
    if (activeTabId && window.neurodeck?.browser) await window.neurodeck.browser.stop(activeTabId);
  }, [activeTabId]);

  const toggleVisibility = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    if (visible) {
      await window.neurodeck.browser.hide();
    } else {
      await window.neurodeck.browser.show();
      setTimeout(reportBounds, 100);
    }
    setVisible(!visible);
  }, [visible, reportBounds]);

  const saveToMemory = useCallback(async () => {
    if (window.neurodeck?.browser) {
      try {
        await window.neurodeck.browser.saveToMemory();
        showNotice("ok", "Page content captured and injected into vector memory.");
      } catch (err: unknown) {
        showNotice(
          "error",
          `Failed to save: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }, [showNotice]);

  const handleZoomIn = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      const current = zoomLevels[tab.id] ?? 1.0;
      const next = Math.min(3.0, parseFloat((current + 0.15).toFixed(2)));
      setZoomLevels((prev) => ({ ...prev, [tab.id]: next }));
      window.neurodeck.browser.setZoom(tab.id, next);
    }
  }, [activeTabId, tabs, zoomLevels]);

  const handleZoomOut = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      const current = zoomLevels[tab.id] ?? 1.0;
      const next = Math.max(0.5, parseFloat((current - 0.15).toFixed(2)));
      setZoomLevels((prev) => ({ ...prev, [tab.id]: next }));
      window.neurodeck.browser.setZoom(tab.id, next);
    }
  }, [activeTabId, tabs, zoomLevels]);

  const handleZoomReset = useCallback(() => {
    if (activeTabId && window.neurodeck?.browser) {
      setZoomLevels((prev) => ({ ...prev, [activeTabId]: 1.0 }));
      window.neurodeck.browser.setZoom(activeTabId, 1.0);
    }
  }, [activeTabId]);

  const handleFind = useCallback(() => {
    if (findOpen) {
      setFindOpen(false);
      setFindText("");
    } else {
      setFindOpen(true);
    }
  }, [findOpen]);

  const submitFind = useCallback(
    (next: boolean = false) => {
      if (activeTabId && findText.trim() && window.neurodeck?.browser) {
        window.neurodeck.browser.findInPage(activeTabId, findText.trim(), next);
      }
    },
    [activeTabId, findText]
  );

  const toggleBookmark = useCallback(async () => {
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
  }, [activeTabId, tabs, bookmarks, loadBookmarks]);

  const deleteBookmark = useCallback(
    async (id: string) => {
      if (window.neurodeck?.browser) {
        await window.neurodeck.browser.deleteBookmark(id);
        await loadBookmarks();
      }
    },
    [loadBookmarks]
  );

  const deleteHistoryEntry = useCallback(
    async (id: string) => {
      if (window.neurodeck?.browser) {
        await window.neurodeck.browser.deleteHistory(id);
        await loadHistory();
      }
    },
    [loadHistory]
  );

  const clearHistory = useCallback(async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || "default";
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.clearHistory(profileId);
      setHistory([]);
    }
  }, [activeTabId, tabs]);

  const handleToggleAdBlock = useCallback(async () => {
    if (window.electronAPI?.browserAdblockToggle) {
      const toggleRes = await window.electronAPI.browserAdblockToggle();
      setAdBlockEnabled(toggleRes.enabled);
    }
  }, []);

  const checkAdBlockStatus = useCallback(async () => {
    if (window.electronAPI?.browserAdblockStatus) {
      const res = await window.electronAPI.browserAdblockStatus();
      setAdBlockEnabled(res.enabled);
    }
  }, []);

  const changeProfile = useCallback(
    async (profileId: string) => {
      if (activeTabId && window.neurodeck?.browser) {
        await window.neurodeck.browser.setProfile(activeTabId, profileId);
        await loadTabs();
        setShowProfilesMenu(false);
        setTimeout(reportBounds, 150);
      }
    },
    [activeTabId, loadTabs, reportBounds]
  );

  const clearProfileData = useCallback(
    async (profileId: string) => {
      if (window.neurodeck?.browser) {
        await (
          window.neurodeck.browser as {
            clearData: (profileId: string, options: unknown) => Promise<unknown>;
          }
        ).clearData(profileId, {
          cookies: true,
          cache: true,
          localStorage: true,
        });
        setShowProfilesMenu(false);
        showNotice("ok", `Partition data purged for profile: ${profileId}`);
      }
    },
    [showNotice]
  );

  const handleClearData = useCallback(
    async (scope: "currentTab" | "all") => {
      if (window.neurodeck?.browser?.clearBrowserData) {
        try {
          const res = (await window.neurodeck.browser.clearBrowserData(scope)) as
            | { success?: boolean }
            | undefined;
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
    },
    [showNotice]
  );

  const openDevTools = useCallback(async () => {
    if (activeTabId && window.neurodeck?.browser) {
      await window.neurodeck.browser.openDevTools(activeTabId);
    }
  }, [activeTabId]);

  const respondToPermission = useCallback(async (requestId: string, decision: string) => {
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.respondToPermission(requestId, decision);
      setPermissions((prev) => prev.filter((p) => p.requestId !== requestId));
    }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    if (window.neurodeck?.browser) {
      const data = await window.neurodeck.browser.getDiagnostics();
      setDiagnosticsReport(data);
    }
  }, []);

  // Lifecycle listeners
  useEffect(() => {
    if (window.neurodeck?.browser) {
      window.neurodeck.browser.show();
      loadTabs();
      window.neurodeck.browser.getProfiles().then((list) => setProfiles(list as BrowserProfile[]));
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
    const unsubscribe = window.neurodeck.browser.onBrowserEvent(
      (data: { event: string; payload: Record<string, unknown> }) => {
        const { event, payload } = data;
        if (event === "tabs-updated") {
          setTabs((payload.tabs || []) as BrowserTab[]);
          if (payload.activeTabId) {
            setActiveTabId(payload.activeTabId as string);
          }
          setTimeout(reportBounds, 50);
        } else if (event === "permission-requested") {
          setPermissions((prev) => [...prev, payload as unknown as PermissionRequest]);
        } else if (event === "download-started") {
          loadDownloads();
        } else if (event === "download-progress") {
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === payload.id
                ? {
                    ...d,
                    receivedBytes: payload.receivedBytes as number,
                    state: payload.state as DownloadItem["state"],
                  }
                : d
            )
          );
        } else if (event === "download-complete") {
          loadDownloads();
        } else if (event === "did-navigate") {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          if (activeTab && activeTab.id === payload.tabId) {
            setUrlInput(payload.url as string);
          }
          loadTabs();
        }
      }
    );
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
  }, [
    activeTabId,
    tabs,
    loadTabs,
    createTab,
    refresh,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFind,
  ]);

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
  const isBookmarked = activeTab ? bookmarks.some((b) => b.url === activeTab.url) : false;
  const activeProfile = profiles.find((p) => p.id === activeTab?.profileId);

  return {
    // State
    tabs,
    activeTabId,
    activeTab,
    profiles,
    activeProfile,
    urlInput,
    findOpen,
    findText,
    showSidebar,
    history,
    bookmarks,
    downloads,
    permissions,
    showProfilesMenu,
    showDiagnostics,
    showVpnPanel,
    diagnosticsReport,
    visible,
    adBlockEnabled,
    activeDownloadCount,
    showDownloadsMenu,
    errorDetailsOpen,
    notice,
    zoomLevels,
    isBookmarked,
    // Refs
    viewportRef,
    urlInputRef,
    // Setters / simple actions
    setUrlInput,
    setFindOpen,
    setFindText,
    setShowSidebar,
    setShowProfilesMenu,
    setShowDiagnostics,
    setShowVpnPanel,
    setShowDownloadsMenu,
    setErrorDetailsOpen,
    setNotice,
    // Actions
    showNotice,
    reportBounds,
    loadTabs,
    loadHistory,
    loadBookmarks,
    loadDownloads,
    createTab,
    closeTab,
    switchTab,
    navigate,
    goBack,
    goForward,
    refresh,
    stop,
    toggleVisibility,
    saveToMemory,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFind,
    submitFind,
    toggleBookmark,
    deleteBookmark,
    deleteHistoryEntry,
    clearHistory,
    handleToggleAdBlock,
    checkAdBlockStatus,
    changeProfile,
    clearProfileData,
    handleClearData,
    openDevTools,
    respondToPermission,
    loadDiagnostics,
  };
}
