import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe, ArrowLeft, ArrowRight, RotateCcw, Home, ExternalLink, Eye, EyeOff, Save,
  ZoomIn, ZoomOut, Focus, Search, X
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

export function BrowserView() {
  const [url, setUrl] = useState('https://example.com');
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [visible, setVisible] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

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

  const goBack = async () => {
    await neurodeckApi.browser.back();
  };

  const goForward = async () => {
    await neurodeckApi.browser.forward();
  };

  const refresh = () => {
    neurodeckApi.browser.reload();
  };

  const toggleVisibility = async () => {
    if (visible) {
      await neurodeckApi.browser.hide();
    } else {
      await neurodeckApi.browser.show();
      reportBounds();
    }
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
    if (findText.trim()) {
      neurodeckApi.browser.find(findText.trim());
    }
  };

  // Show browser on mount, hide on unmount (tab switching)
  useEffect(() => {
    neurodeckApi.browser.show();
    reportBounds();
    neurodeckApi.browser.getUrl().then((r) => {
      if (r.url && r.url !== '') { setUrl(r.url); setInputUrl(r.url); }
    }).catch(() => {});
    // Open initial URL if nothing loaded yet
    neurodeckApi.browser.open('https://example.com');
    return () => {
      neurodeckApi.browser.hide();
    };
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

  // Listen for browser events from main process (URL changes, history state)
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
    });
    return unsubscribe;
  }, []);

  return (
    <div className="browser-container flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Globe className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="browser-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Browser</div>
          <h2 className="text-lg font-semibold text-nd-text">Browser</h2>
          <p className="text-xs text-nd-text-muted">Embedded web browser</p>
        </div>
      </div>

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
        <span className="browser-home-kicker rounded-full border border-nd-text-muted/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-nd-text-muted">Home</span>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
          <input
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

      <div
        ref={viewportRef}
        className={`flex-1 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-white ${visible ? '' : 'hidden'}`}
      />
      {!visible && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
          <p className="text-sm text-nd-text-muted">Browser hidden. Click the eye icon to show.</p>
        </div>
      )}
    </div>
  );
}
