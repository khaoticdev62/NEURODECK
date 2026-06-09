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
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Globe className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Browser</h2>
          <p className="text-xs text-slate-500">Embedded web browser</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={goForward} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={refresh} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => navigate('https://example.com')} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <Home className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(inputUrl)}
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none"
            placeholder="Enter URL..."
          />
          <button type="button" onClick={() => navigate(inputUrl)} className="text-xs font-medium text-neuro hover:text-neuro/80">
            Go
          </button>
        </div>
        <button type="button" onClick={toggleVisibility} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100" title={visible ? 'Hide' : 'Show'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={saveToMemory} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100" title="Save to Memory">
          <Save className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => window.open(url, '_blank')} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <div className={`flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white ${visible ? '' : 'hidden'}`}>
        <iframe
          ref={iframeRef}
          src={url}
          title="Browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="h-full w-full border-none"
        />
      </div>
      {!visible && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm text-slate-500">Browser hidden. Click the eye icon to show.</p>
        </div>
      )}
    </div>
  );
}
