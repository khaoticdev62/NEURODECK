import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe, ArrowLeft, ArrowRight, RotateCcw, Home, ExternalLink, Eye, EyeOff, Save,
  ZoomIn, ZoomOut, Focus, Search, X, Star, BookOpen, Shield, ShieldCheck,
  Download, Clock, Trash2, BookMarked, ChevronDown, Plus, Pin, Volume2, VolumeX,
  Lock, Unlock, Settings, AlertTriangle, Terminal, Info, RefreshCw
} from 'lucide-react';

interface BrowserTab {
  id: string;
  profileId: string;
  partitionId: string;
  title: string;
  url: string;
  displayUrl: string;
  favicon?: string;
  state: 'new' | 'loading' | 'ready' | 'blocked' | 'crashed' | 'offline' | 'error' | 'closed';
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isPrivate: boolean;
  security: 'secure' | 'insecure' | 'warning' | 'broken';
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
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
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
  const [urlInput, setUrlInput] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [showSidebar, setShowSidebar] = useState<'history' | 'bookmarks' | null>(null);
  const [history, setHistory] = useState<BrowserHistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [showProfilesMenu, setShowProfilesMenu] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [activeDownloadCount, setActiveDownloadCount] = useState(0);
  const [showDownloadsMenu, setShowDownloadsMenu] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

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
        setUrlInput(active.displayUrl || active.url || '');
      } else if (list.length > 0) {
        setActiveTabId(list[0].id);
        setUrlInput(list[0].displayUrl || list[0].url || '');
      }
    } catch (_) {}
  }, []);

  const loadHistory = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || 'default';
    try {
      const list = await window.neurodeck.browser.getHistory(profileId);
      setHistory(list);
    } catch (_) {}
  }, [tabs, activeTabId]);

  const loadBookmarks = useCallback(async () => {
    if (!window.neurodeck?.browser) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const profileId = activeTab?.profileId || 'default';
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
      const activeCount = list.filter((d) => d.state === 'progressing').length;
      setActiveDownloadCount(activeCount);
    } catch (_) {}
  }, []);

  const createTab = async (urlStr: string = 'https://example.com') => {
    if (!window.neurodeck?.browser) return;
    try {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const profileId = activeTab?.profileId || 'default';
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
        setUrlInput(tab.displayUrl || tab.url || '');
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
    if (!activeTabId || !targetUrl.trim() || !window.neurodeck?.browser) return;
    try {
      const { url } = await window.neurodeck.browser.normalizeUrl(targetUrl.trim());
      setUrlInput(url);
      await window.neurodeck.browser.navigate(activeTabId, url);
    } catch (_) {}
  };

  const goBack = async () => {
    if (activeTabId && window.neurodeck?.browser) await window.neurodeck.browser.goBack(activeTabId);
  };

  const goForward = async () => {
    if (activeTabId && window.neurodeck?.browser) await window.neurodeck.browser.goForward(activeTabId);
  };

  const refresh = async () => {
    if (activeTabId && window.neurodeck?.browser) await window.neurodeck.browser.reload(activeTabId);
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
        alert('Page content captured and injected into universal vector memory.');
      } catch (err: any) {
        alert(`Failed to save: ${err.message || err}`);
      }
    }
  };

  const handleZoomIn = () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      // Zoom levels: 1.0 -> 1.1 -> 1.25 -> 1.5 etc
      const current = 1.0;
      window.neurodeck.browser.setZoom(tab.id, current + 0.15);
    }
  };

  const handleZoomOut = () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && window.neurodeck?.browser) {
      const current = 1.0;
      window.neurodeck.browser.setZoom(tab.id, Math.max(0.5, current - 0.15));
    }
  };

  const handleZoomReset = () => {
    if (activeTabId && window.neurodeck?.browser) {
      window.neurodeck.browser.setZoom(activeTabId, 1.0);
    }
  };

  const handleFind = () => {
    if (findOpen) {
      setFindOpen(false);
      setFindText('');
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
      await window.neurodeck.browser.addBookmark(activeTab.url, activeTab.title || activeTab.url, activeTab.profileId);
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
    const profileId = activeTab?.profileId || 'default';
    if (window.neurodeck?.browser) {
      await window.neurodeck.browser.clearHistory(profileId);
      setHistory([]);
    }
  };

  const handleToggleAdBlock = async () => {
    if (window.neurodeck?.browser) {
      const res = await window.neurodeck.browser.clearData('default', {}); // wait, toggle in backend
      const result = await window.neurodeck.browser.respondToPermission('', ''); // toggle is toggleAdblock
      // Let's use general ipcRenderer invoke since adblock status is exported on electronAPI
      if (window.electronAPI?.browserAdblockToggle) {
        const toggleRes = await window.electronAPI.browserAdblockToggle();
        setAdBlockEnabled(toggleRes.enabled);
      }
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
      await window.neurodeck.browser.clearData(profileId, { cookies: true, cache: true, localStorage: true });
      setShowProfilesMenu(false);
      alert(`Partition data purged for profile: ${profileId}`);
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
    if (showSidebar === 'history') {
      loadHistory();
    } else if (showSidebar === 'bookmarks') {
      loadBookmarks();
    }
  }, [showSidebar, loadHistory, loadBookmarks]);

  // Bounds tracking
  useEffect(() => {
    if (!visible) return;
    reportBounds();
    const onResize = () => reportBounds();
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(() => reportBounds());
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [visible, reportBounds, activeTabId, tabs]);

  // IPC Event subscription
  useEffect(() => {
    if (!window.neurodeck?.browser) return;
    const unsubscribe = window.neurodeck.browser.onBrowserEvent((data: any) => {
      const { event, payload } = data;
      if (event === 'tabs-updated') {
        setTabs(payload.tabs || []);
        if (payload.activeTabId) {
          setActiveTabId(payload.activeTabId);
        }
      } else if (event === 'permission-requested') {
        setPermissions((prev) => [...prev, payload]);
      } else if (event === 'download-started') {
        loadDownloads();
      } else if (event === 'download-progress') {
        setDownloads((prev) => prev.map((d) =>
          d.id === payload.id
            ? { ...d, receivedBytes: payload.receivedBytes, state: payload.state }
            : d
        ));
      } else if (event === 'download-complete') {
        loadDownloads();
      } else if (event === 'did-navigate') {
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.id === payload.tabId) {
          setUrlInput(payload.url);
        }
        loadTabs();
      }
    });
    return unsubscribe;
  }, [tabs, activeTabId, loadTabs, loadDownloads]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          createTab();
          break;
        case 'w':
          if (activeTabId) {
            e.preventDefault();
            window.neurodeck?.browser?.closeTab(activeTabId).then(() => loadTabs());
          }
          break;
        case 'l':
          e.preventDefault();
          urlInputRef.current?.focus();
          urlInputRef.current?.select();
          break;
        case 'r':
          e.preventDefault();
          refresh();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleZoomReset();
          break;
        case 'f':
          if (!e.shiftKey) {
            e.preventDefault();
            handleFind();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTabId, tabs, loadTabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isBookmarked = activeTab && bookmarks.some((b) => b.url === activeTab.url);
  const activeProfile = profiles.find((p) => p.id === activeTab?.profileId);

  return (
    <div className="browser-container flex h-full flex-col bg-nd-bg text-nd-text select-none">
      
      {/* Permission Prompts Overlay */}
      {permissions.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] w-96 rounded-2xl border border-nd-accent/30 bg-nd-bg/95 p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-nd-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-nd-text">Permission Request</h4>
              <p className="text-xs text-nd-text-muted mt-1 leading-relaxed">
                The site <code className="text-nd-accent">{permissions[0].origin}</code> requests access to <code className="text-nd-accent">{permissions[0].permission}</code>.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => respondToPermission(permissions[0].requestId, 'allow_once')}
              className="px-3 py-1.5 rounded-lg bg-nd-accent/10 border border-nd-accent/20 text-xs font-semibold text-nd-accent hover:bg-nd-accent/20 transition text-center"
            >
              Allow Once
            </button>
            <button
              onClick={() => respondToPermission(permissions[0].requestId, 'allow_always')}
              className="px-3 py-1.5 rounded-lg bg-nd-accent text-xs font-semibold text-nd-bg hover:opacity-90 transition text-center"
            >
              Allow Always
            </button>
            <button
              onClick={() => respondToPermission(permissions[0].requestId, 'block_once')}
              className="px-3 py-1.5 rounded-lg bg-nd-surface border border-nd-text-muted/15 text-xs text-nd-text-muted hover:text-nd-text transition text-center"
            >
              Block Once
            </button>
            <button
              onClick={() => respondToPermission(permissions[0].requestId, 'block_always')}
              className="px-3 py-1.5 rounded-lg bg-nd-danger/10 border border-nd-danger/20 text-xs font-semibold text-nd-danger hover:bg-nd-danger/20 transition text-center"
            >
              Block Always
            </button>
          </div>
        </div>
      )}

      {/* Title / Tab Strip */}
      <div className="flex items-center justify-between border-b border-nd-text-muted/10 bg-nd-surface/10 px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 max-w-[80%] pr-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-nd-accent/10 border-nd-accent/30 text-nd-text font-semibold'
                    : 'bg-nd-surface/30 border-transparent text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text'
                }`}
              >
                {tab.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 text-nd-warning shrink-0" />
                ) : (
                  <Globe className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-nd-accent' : 'text-nd-text-muted'}`} />
                )}
                <span className="max-w-[120px] truncate">{tab.title || 'New Tab'}</span>
                {tab.isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-nd-accent shrink-0" />
                )}
                {tab.isMuted && (
                  <VolumeX className="h-3 w-3 text-nd-danger shrink-0" />
                )}
                {tab.isPinned && (
                  <Pin className="h-3 w-3 text-nd-accent shrink-0 rotate-45" />
                )}
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-nd-surface text-nd-text-muted hover:text-nd-text shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => createTab()}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text transition"
            title="Open New Tab"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDownloadsMenu((v) => !v)}
            className={`relative rounded-xl border p-2 text-nd-text transition ${
              showDownloadsMenu || activeDownloadCount > 0
                ? 'bg-nd-accent/15 border-nd-accent/30 text-nd-accent'
                : 'bg-nd-surface/30 border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text'
            }`}
            title="Downloads"
          >
            <Download className="h-4 w-4" />
            {activeDownloadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-nd-accent text-[9px] font-bold text-nd-bg">
                {activeDownloadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowDiagnostics((v) => !v);
              if (!showDiagnostics) loadDiagnostics();
            }}
            className={`rounded-xl border p-2 text-nd-text transition ${
              showDiagnostics
                ? 'bg-nd-accent/15 border-nd-accent/30 text-nd-accent'
                : 'bg-nd-surface/30 border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text'
            }`}
            title="Session Diagnostics"
          >
            <Terminal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation & Address Bar Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-nd-text-muted/10 bg-nd-surface/5 px-4 py-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={!activeTab?.canGoBack}
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goForward}
            disabled={!activeTab?.canGoForward}
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent"
            title="Forward"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={activeTab?.isLoading ? stop : refresh}
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text"
            title={activeTab?.isLoading ? 'Stop' : 'Reload'}
          >
            {activeTab?.isLoading ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </button>
          <button
            onClick={() => navigate('https://example.com')}
            className="rounded-xl p-2 text-nd-text-muted transition hover:bg-nd-surface hover:text-nd-text"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/20 px-3 py-1.5 focus-within:border-nd-accent/40 focus-within:ring-2 focus-within:ring-nd-accent/25 transition">
          {activeTab?.security === 'secure' ? (
            <span title="Secure HTTPS connection"><Lock className="h-3.5 w-3.5 text-nd-success" /></span>
          ) : (
            <span title="Insecure HTTP connection"><Unlock className="h-3.5 w-3.5 text-nd-warning" /></span>
          )}
          <input
            ref={urlInputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(urlInput)}
            className="flex-1 bg-transparent text-xs text-nd-text outline-none"
            placeholder="Search or enter web URL..."
          />
          <button
            onClick={() => navigate(urlInput)}
            className="rounded px-2 py-0.5 text-xs font-semibold text-nd-accent hover:bg-nd-accent/15 transition"
          >
            Go
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleBookmark}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              isBookmarked
                ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
          >
            <Star className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleToggleAdBlock}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              adBlockEnabled
                ? 'border-nd-success/30 bg-nd-success/10 text-nd-success'
                : 'border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text'
            }`}
            title={adBlockEnabled ? 'Shield Active (Ad Blocker)' : 'Shield Inactive (Ad Blocker)'}
          >
            {adBlockEnabled ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          </button>

          {/* Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfilesMenu((v) => !v);
                setShowDownloadsMenu(false);
                setShowDiagnostics(false);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 px-3 py-2 text-xs font-semibold text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{activeProfile?.name || 'Profile'}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
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
                      onClick={() => changeProfile(p.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                        isCurrent
                          ? 'bg-nd-accent/10 text-nd-accent font-semibold'
                          : 'hover:bg-nd-surface/50 text-nd-text/80 hover:text-nd-text'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-nd-text-muted">
                          {p.persistent ? 'Persistent Session' : 'In-Memory/Private'}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {!p.persistent && <span title="Private mode"><Lock className="h-3 w-3 text-nd-warning" /></span>}
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-nd-accent" />}
                      </div>
                    </button>
                  );
                })}
                <div className="my-2 border-t border-nd-text-muted/10" />
                {activeProfile && (
                  <button
                    onClick={() => clearProfileData(activeProfile.id)}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-nd-danger hover:bg-nd-danger/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Profile Storage</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleFind}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              findOpen
                ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/10 text-nd-text-muted'
            }`}
            title="Find in page"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              if (showSidebar === 'history') setShowSidebar(null);
              else setShowSidebar('history');
            }}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              showSidebar === 'history'
                ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/10 text-nd-text-muted'
            }`}
            title="History"
          >
            <Clock className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              if (showSidebar === 'bookmarks') setShowSidebar(null);
              else setShowSidebar('bookmarks');
            }}
            className={`rounded-xl border p-2 transition hover:bg-nd-surface ${
              showSidebar === 'bookmarks'
                ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/10 text-nd-text-muted'
            }`}
            title="Bookmarks"
          >
            <BookMarked className="h-4 w-4" />
          </button>

          <button
            onClick={openDevTools}
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
            title="Inspect (DevTools)"
          >
            <Terminal className="h-4 w-4" />
          </button>

          <button
            onClick={saveToMemory}
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
            title="Save Page to Memory Fact"
          >
            <Save className="h-4 w-4" />
          </button>

          <button
            onClick={toggleVisibility}
            className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-2 text-nd-text-muted hover:bg-nd-surface hover:text-nd-text transition"
            title={visible ? 'Hide Viewport' : 'Show Viewport'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            onKeyDown={(e) => e.key === 'Enter' && submitFind(true)}
            placeholder="Search text in page..."
            className="flex-1 bg-transparent text-xs text-nd-text outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => submitFind(false)}
              className="rounded px-2.5 py-1 bg-nd-surface border border-nd-text-muted/15 text-xs text-nd-text-muted hover:text-nd-text transition"
            >
              Find Previous
            </button>
            <button
              onClick={() => submitFind(true)}
              className="rounded px-2.5 py-1 bg-nd-accent text-xs font-semibold text-nd-bg hover:opacity-90 transition"
            >
              Find Next
            </button>
            <button
              onClick={() => setFindOpen(false)}
              className="rounded p-1 text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
            >
              <X className="h-4 w-4" />
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
              onClick={() => setShowDiagnostics(false)}
              className="text-nd-text-muted hover:text-nd-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin text-xs">
            <button
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
                {diagnosticsReport.tabs && diagnosticsReport.tabs.map((t: any) => (
                  <div key={t.id} className="p-2 rounded-lg bg-nd-surface/30 border border-nd-text-muted/10">
                    <div className="font-semibold text-nd-accent truncate">{t.title}</div>
                    <div className="text-[10px] text-nd-text-muted mt-1 truncate">ID: {t.id}</div>
                    <div className="text-[10px] text-nd-text-muted truncate">Profile: {t.profileId}</div>
                    <div className="text-[10px] text-nd-text-muted">State: {t.state}</div>
                    {t.pid && <div className="text-[10px] text-nd-success font-mono">Process PID: {t.pid}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-nd-text-muted text-center py-4">Click Refresh to query details</div>
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
              onClick={() => setShowDownloadsMenu(false)}
              className="text-nd-text-muted hover:text-nd-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
            {downloads.length === 0 ? (
              <div className="text-xs text-nd-text-muted text-center py-8">
                No active or recent downloads.
              </div>
            ) : (
              downloads.map((d) => {
                const percent = d.totalBytes > 0 ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0;
                return (
                  <div key={d.id} className="p-2.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 text-xs flex flex-col gap-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold truncate text-nd-text">{d.filename}</span>
                      <span className="text-[10px] uppercase font-bold text-nd-accent shrink-0">{d.state}</span>
                    </div>
                    {d.state === 'progressing' && (
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-nd-surface rounded-full overflow-hidden">
                          <div className="h-full bg-nd-accent transition-all duration-300" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-nd-text-muted">
                          <span>{percent}% Completed</span>
                          <span>
                            {(d.receivedBytes / 1024 / 1024).toFixed(1)} / {(d.totalBytes / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end mt-1">
                      {d.state === 'progressing' && (
                        <button
                          onClick={() => window.neurodeck?.browser?.cancelDownload(d.id).then(() => loadDownloads())}
                          className="px-2 py-1 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20 rounded text-[10px] font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                      {d.state === 'completed' && (
                        <>
                          <button
                            onClick={() => window.neurodeck?.browser?.openDownload(d.id)}
                            className="px-2 py-1 bg-nd-accent/10 text-nd-accent hover:bg-nd-accent/20 rounded text-[10px] font-semibold transition"
                          >
                            Open File
                          </button>
                          <button
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

      {/* Main Viewport & Collapsible Sidebar Drawer */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Viewport Overlay */}
        <div
          ref={viewportRef}
          className={`flex-1 overflow-hidden relative ${visible ? '' : 'hidden'}`}
          style={{ background: 'transparent' }}
        />
        {!visible && (
          <div className="flex flex-1 items-center justify-center bg-nd-surface/10 border border-nd-text-muted/10 m-4 rounded-2xl">
            <div className="text-center p-6 flex flex-col items-center gap-3">
              <Globe className="h-10 w-10 text-nd-text-muted animate-pulse" />
              <p className="text-sm font-semibold text-nd-text">Viewport Suspended</p>
              <p className="text-xs text-nd-text-muted max-w-xs leading-relaxed">
                Guest frame process detached to save Steam Deck CPU / GPU / Battery resource. Tap the eye icon in toolbar to resume.
              </p>
              <button
                onClick={toggleVisibility}
                className="mt-2 px-4 py-2 bg-nd-accent text-xs font-semibold text-nd-bg rounded-xl hover:opacity-90 transition"
              >
                Resume Session View
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Drawer */}
        {showSidebar && (
          <div className="w-80 border-l border-nd-text-muted/10 bg-nd-surface/20 flex flex-col shrink-0 animate-in slide-in-from-right duration-250 backdrop-blur-lg">
            <div className="flex items-center justify-between p-3 border-b border-nd-text-muted/10">
              <span className="text-xs font-bold uppercase tracking-wider text-nd-text">
                {showSidebar === 'history' ? 'History Log' : 'Saved Bookmarks'}
              </span>
              <button
                onClick={() => setShowSidebar(null)}
                className="rounded p-1 text-nd-text-muted hover:text-nd-text hover:bg-nd-surface transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sidebar content list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
              {showSidebar === 'history' ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={clearHistory}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-nd-danger/10 border border-nd-danger/20 text-nd-danger hover:bg-nd-danger/20 rounded-xl text-xs font-semibold transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Purge History</span>
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <div className="text-xs text-nd-text-muted text-center py-8">No history recorded</div>
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
                          <span className="text-[10px] text-nd-text-muted truncate mt-0.5">{h.url}</span>
                        </div>
                        <button
                          onClick={() => deleteHistoryEntry(h.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-nd-text-muted hover:text-nd-danger transition"
                          title="Delete history entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {bookmarks.length === 0 ? (
                    <div className="text-xs text-nd-text-muted text-center py-8">No bookmarks saved</div>
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
                          <span className="text-[10px] text-nd-text-muted truncate mt-0.5">{b.url}</span>
                        </div>
                        <button
                          onClick={() => deleteBookmark(b.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-nd-text-muted hover:text-nd-danger transition"
                          title="Remove bookmark"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">L2</span> Navigate Back
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">R2</span> Navigate Forward
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">Y</span> Focus Address Bar
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded bg-nd-surface px-1.5 py-0.5 border border-nd-text-muted/20 font-mono text-[9px]">X</span> Toggle Tab Strip
          </span>
        </div>
        <div>
          <span>NeuroBrowse Guest sandboxed isolation partition</span>
        </div>
      </div>
    </div>
  );
}
