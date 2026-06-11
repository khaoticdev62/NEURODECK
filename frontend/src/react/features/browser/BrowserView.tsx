import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe, ArrowLeft, ArrowRight, RotateCcw, Home, ExternalLink, Eye, EyeOff, Save,
  ZoomIn, ZoomOut, Focus, Search, X, Star, BookOpen, Shield, ShieldCheck,
  Download, Clock, Trash2, BookMarked, ChevronDown
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

interface Bookmark {
  title: string;
  url: string;
  createdAt: number;
}

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface DownloadItem {
  id: string;
  filename: string;
  state: string;
  receivedBytes: number;
  totalBytes: number;
}

export function BrowserView() {
  const [url, setUrl] = useState('https://example.com');
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [visible, setVisible] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [readerContent, setReaderContent] = useState<{ title: string; text: string; url: string } | null>(null);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const reportBounds = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !window.electronAPI?.browserSetBounds) return;
    const rect = el.getBoundingClientRect();
    window.electronAPI.browserSetBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, []);

  const navigate = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    let normalized = targetUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    setUrl(normalized);
    setInputUrl(normalized);
    await neurodeckApi.browser.navigate(normalized);
    reportBounds();
  }, [reportBounds]);

  const goBack = async () => { await neurodeckApi.browser.back(); };
  const goForward = async () => { await neurodeckApi.browser.forward(); };
  const refresh = () => { neurodeckApi.browser.reload(); };

  const toggleVisibility = async () => {
    if (visible) { await neurodeckApi.browser.hide(); }
    else { await neurodeckApi.browser.show(); reportBounds(); }
    setVisible(!visible);
  };

  const saveToMemory = async () => {
    try { await neurodeckApi.browser.saveToMemory(); } catch (_) { /* ignore */ }
  };

  const handleZoomIn = () => neurodeckApi.browser.zoomIn();
  const handleZoomOut = () => neurodeckApi.browser.zoomOut();
  const handleZoomReset = () => neurodeckApi.browser.zoomReset();

  const handleFind = () => {
    if (findOpen) {
      neurodeckApi.browser.stopFind();
      setFindOpen(false);
      setFindText('');
    } else {
      setFindOpen(true);
    }
  };

  const submitFind = () => {
    if (findText.trim()) neurodeckApi.browser.find(findText.trim());
  };

  // Bookmarks
  const loadBookmarks = async () => {
    const res = await neurodeckApi.browser.listBookmarks();
    setBookmarks(res.bookmarks);
  };

  const addBookmark = async () => {
    await neurodeckApi.browser.addBookmark(document.title || url, url);
    await loadBookmarks();
  };

  const removeBookmark = async (bookmarkUrl: string) => {
    await neurodeckApi.browser.removeBookmark(bookmarkUrl);
    await loadBookmarks();
  };

  // History
  const loadHistory = async () => {
    const res = await neurodeckApi.browser.listHistory();
    setHistory(res.history);
  };

  const clearHistory = async () => {
    await neurodeckApi.browser.clearHistory();
    setHistory([]);
  };

  // Reader mode
  const activateReaderMode = async () => {
    const res = await neurodeckApi.browser.readerMode();
    if (res.success) setReaderContent({ title: res.title, text: res.text, url: res.url });
  };

  // Ad blocker
  const toggleAdBlock = async () => {
    const res = await neurodeckApi.browser.toggleAdblock();
    setAdBlockEnabled(res.enabled);
  };

  const checkAdBlockStatus = async () => {
    const res = await neurodeckApi.browser.getAdblockStatus();
    setAdBlockEnabled(res.enabled);
  };

  // Show browser on mount, hide on unmount (tab switching)
  useEffect(() => {
    neurodeckApi.browser.show();
    reportBounds();
    neurodeckApi.browser.getUrl().then((r) => {
      if (r.url && r.url !== '') { setUrl(r.url); setInputUrl(r.url); }
    }).catch(() => {});
    neurodeckApi.browser.open('https://example.com');
    loadBookmarks();
    checkAdBlockStatus();
    return () => { neurodeckApi.browser.hide(); };
  }, [reportBounds]);

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
  }, [visible, reportBounds]);

  // Listen for browser events from main process
  useEffect(() => {
    const unsubscribe = neurodeckApi.browser.onBrowserEvent((data) => {
      if (data.event === 'did-navigate' && data.payload.url) {
        setUrl(data.payload.url as string);
        setInputUrl(data.payload.url as string);
      }
      if (data.event === 'history-state') {
        setCanGoBack(!!data.payload.canGoBack);
        setCanGoForward(!!data.payload.canGoForward);
      }
      if (data.event === 'reader-mode' && data.payload.text) {
        setReaderContent({
          title: (data.payload.title as string) || '',
          text: (data.payload.text as string) || '',
          url: (data.payload.url as string) || '',
        });
      }
      if (data.event === 'download-started') {
        setDownloads((prev) => [...prev, {
          id: data.payload.id as string,
          filename: data.payload.filename as string,
          state: 'progressing',
          receivedBytes: 0,
          totalBytes: (data.payload.totalBytes as number) || 0,
        }]);
      }
      if (data.event === 'download-progress') {
        setDownloads((prev) => prev.map((d) =>
          d.id === data.payload.id
            ? { ...d, receivedBytes: (data.payload.receivedBytes as number) || 0, state: data.payload.state as string }
            : d
        ));
      }
      if (data.event === 'download-complete') {
        setDownloads((prev) => prev.map((d) =>
          d.id === data.payload.id ? { ...d, state: data.payload.state as string } : d
        ));
        setTimeout(() => {
          setDownloads((prev) => prev.filter((d) => d.id !== data.payload.id));
        }, 5000);
      }
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
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
  }, [findOpen]);

  const isBookmarked = bookmarks.some((b) => b.url === url);

  return (
    <div className="browser-container flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Globe className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="browser-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Browser</div>
          <h2 className="text-lg font-semibold text-nd-text">Browser</h2>
          <p className="text-xs text-nd-text-muted">Embedded web browser</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={goBack} disabled={!canGoBack} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={goForward} disabled={!canGoForward} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={refresh} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => navigate('https://example.com')} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text">
          <Home className="h-4 w-4" />
        </button>

        {/* Bookmark star */}
        <button
          type="button"
          onClick={isBookmarked ? () => removeBookmark(url) : addBookmark}
          className={`rounded-lg border p-2 transition hover:bg-nd-surface/50 ${isBookmarked ? 'border-nd-accent/40 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text'}`}
          title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Star className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>

        {/* Bookmarks dropdown */}
        <div className="relative">
          <button type="button" onClick={() => { setBookmarksOpen((v) => !v); setHistoryOpen(false); setDownloadsOpen(false); }} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Bookmarks">
            <BookMarked className="h-4 w-4" />
          </button>
          {bookmarksOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-nd-text-muted/15 bg-nd-bg/96 p-2 shadow-xl backdrop-blur-xl">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-nd-text">Bookmarks</span>
                <button type="button" onClick={() => setBookmarksOpen(false)} className="text-nd-text-muted hover:text-nd-text"><X className="h-3 w-3" /></button>
              </div>
              {bookmarks.length === 0 && <div className="px-2 py-2 text-xs text-nd-text-muted">No bookmarks yet.</div>}
              {bookmarks.map((b) => (
                <div key={b.url} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-nd-surface/50">
                  <button type="button" onClick={() => { navigate(b.url); setBookmarksOpen(false); }} className="min-w-0 flex-1 truncate text-left text-xs text-nd-text/80">
                    {b.title}
                  </button>
                  <button type="button" onClick={() => removeBookmark(b.url)} className="shrink-0 text-nd-text-muted hover:text-nd-danger"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History dropdown */}
        <div className="relative">
          <button type="button" onClick={() => { setHistoryOpen((v) => !v); loadHistory(); setBookmarksOpen(false); setDownloadsOpen(false); }} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="History">
            <Clock className="h-4 w-4" />
          </button>
          {historyOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-nd-text-muted/15 bg-nd-bg/96 p-2 shadow-xl backdrop-blur-xl">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-nd-text">History</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={clearHistory} className="text-nd-text-muted hover:text-nd-danger" title="Clear history"><Trash2 className="h-3 w-3" /></button>
                  <button type="button" onClick={() => setHistoryOpen(false)} className="text-nd-text-muted hover:text-nd-text"><X className="h-3 w-3" /></button>
                </div>
              </div>
              {history.length === 0 && <div className="px-2 py-2 text-xs text-nd-text-muted">No history yet.</div>}
              {history.slice(0, 20).map((h) => (
                <button key={h.timestamp} type="button" onClick={() => { navigate(h.url); setHistoryOpen(false); }} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs text-nd-text/80 hover:bg-nd-surface/50">
                  {h.title || h.url}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Downloads dropdown */}
        <div className="relative">
          <button type="button" onClick={() => { setDownloadsOpen((v) => !v); setBookmarksOpen(false); setHistoryOpen(false); }} className="relative rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Downloads">
            <Download className="h-4 w-4" />
            {downloads.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-nd-accent" />}
          </button>
          {downloadsOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-nd-text-muted/15 bg-nd-bg/96 p-2 shadow-xl backdrop-blur-xl">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-nd-text">Downloads</span>
                <button type="button" onClick={() => setDownloadsOpen(false)} className="text-nd-text-muted hover:text-nd-text"><X className="h-3 w-3" /></button>
              </div>
              {downloads.length === 0 && <div className="px-2 py-2 text-xs text-nd-text-muted">No active downloads.</div>}
              {downloads.map((d) => (
                <div key={d.id} className="rounded-lg px-2 py-1.5 text-xs">
                  <div className="truncate text-nd-text/80">{d.filename}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-nd-surface">
                      <div className="h-1 rounded-full bg-nd-accent transition-all" style={{ width: `${d.totalBytes > 0 ? (d.receivedBytes / d.totalBytes) * 100 : 0}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] text-nd-text-muted">{d.state}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reader mode */}
        <button type="button" onClick={activateReaderMode} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Reader mode">
          <BookOpen className="h-4 w-4" />
        </button>

        {/* Ad blocker toggle */}
        <button type="button" onClick={toggleAdBlock} className={`rounded-lg border p-2 transition hover:bg-nd-surface/50 ${adBlockEnabled ? 'border-nd-success/40 bg-nd-success/10 text-nd-success' : 'border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text'}`} title={adBlockEnabled ? 'Ad blocker on' : 'Ad blocker off'}>
          {adBlockEnabled ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
        </button>

        {/* URL bar */}
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
          <input
            ref={urlInputRef}
            id="browser-url-input"
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(inputUrl)}
            className="flex-1 bg-transparent text-sm text-nd-text outline-none"
            placeholder="Enter URL..."
          />
          <button type="button" onClick={() => navigate(inputUrl)} className="text-xs font-medium text-nd-accent hover:text-nd-accent/80">
            Go
          </button>
        </div>

        <button type="button" onClick={handleFind} className={`rounded-lg border p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text ${findOpen ? 'border-nd-accent/40 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15'}`} title="Find in page">
          {findOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
        <button type="button" onClick={handleZoomOut} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button type="button" onClick={handleZoomReset} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Reset zoom">
          <Focus className="h-4 w-4" />
        </button>
        <button type="button" onClick={handleZoomIn} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button type="button" onClick={toggleVisibility} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title={visible ? 'Hide' : 'Show'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={saveToMemory} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text" title="Save to Memory">
          <Save className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => window.open(url, '_blank')} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:bg-nd-surface/50 hover:text-nd-text">
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      {/* Find bar */}
      {findOpen && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-nd-accent/20 bg-nd-accent/5 px-3 py-2">
          <Search className="h-4 w-4 text-nd-accent" />
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitFind()}
            placeholder="Find in page..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-nd-text outline-none"
          />
          <button type="button" onClick={submitFind} className="text-xs font-medium text-nd-accent hover:text-nd-accent/80">
            Find
          </button>
        </div>
      )}

      {/* Reader mode overlay */}
      {readerContent && (
        <div className="mb-3 flex max-h-[50vh] flex-col rounded-2xl border border-nd-accent/20 bg-nd-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-nd-accent">{readerContent.title || 'Reader Mode'}</h3>
            <button type="button" onClick={() => setReaderContent(null)} className="rounded-lg border border-nd-text-muted/15 p-1 text-nd-text-muted hover:text-nd-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <p className="whitespace-pre-wrap text-sm leading-6 text-nd-text/80">{readerContent.text}</p>
          </div>
        </div>
      )}

      {/* Viewport */}
      <div
        ref={viewportRef}
        className={`flex-1 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-bg ${visible ? '' : 'hidden'}`}
      />
      {!visible && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
          <p className="text-sm text-nd-text-muted">Browser hidden. Click the eye icon to show.</p>
        </div>
      )}
    </div>
  );
}
