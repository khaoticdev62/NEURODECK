import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCcw, Home, ExternalLink, Eye, EyeOff, Save } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

export function BrowserView() {
  const [url, setUrl] = useState('https://example.com');
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [activeUrl, setActiveUrl] = useState('');
  const [visible, setVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    let normalized = targetUrl.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    setUrl(normalized);
    setInputUrl(normalized);
    try {
      await neurodeckApi.browser.navigate(normalized);
    } catch (_) { /* ignore */ }
  }, []);

  const goBack = async () => {
    try { await neurodeckApi.browser.back(); } catch (_) { /* ignore */ }
    iframeRef.current?.contentWindow?.history.back();
  };

  const goForward = async () => {
    try { await neurodeckApi.browser.forward(); } catch (_) { /* ignore */ }
    iframeRef.current?.contentWindow?.history.forward();
  };

  const refresh = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  const toggleVisibility = async () => {
    try {
      if (visible) await neurodeckApi.browser.hide();
      else await neurodeckApi.browser.show();
      setVisible(!visible);
    } catch (_) { /* ignore */ }
  };

  const saveToMemory = async () => {
    try { await neurodeckApi.browser.saveToMemory(); } catch (_) { /* ignore */ }
  };

  useEffect(() => {
    neurodeckApi.browser.getUrl().then((r) => {
      if (r.url) { setUrl(r.url); setInputUrl(r.url); }
    }).catch(() => {});
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

      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={goForward} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={refresh} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => navigate('https://example.com')} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
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
        <button type="button" onClick={toggleVisibility} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text" title={visible ? 'Hide' : 'Show'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={saveToMemory} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text" title="Save to Memory">
          <Save className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => window.open(url, '_blank')} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <div className={`flex-1 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-white ${visible ? '' : 'hidden'}`}>
        <iframe
          ref={iframeRef}
          src={url}
          title="Browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="h-full w-full border-none"
        />
      </div>
      {!visible && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
          <p className="text-sm text-nd-text-muted">Browser hidden. Click the eye icon to show.</p>
        </div>
      )}
    </div>
  );
}
