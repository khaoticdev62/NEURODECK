import { useState } from 'react';
import { Webhook, Send, Copy, Plus, Trash2 } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { ApiResponse } from '../../services/bridgeAdapter';
import { EmptyState } from '../../components/primitives/EmptyState';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function ApiLabView() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'response'>('response');

  const send = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => { if (h.key) headerObj[h.key] = h.value; });
      const res = await neurodeckApi.apiLab.sendRequest({
        method,
        url: url.trim(),
        headers: headerObj,
        body: body.trim() || undefined,
      });
      setResponse(res);
      setActiveTab('response');
    } catch (e) {
      setResponse({ status: 0, statusText: 'Error', headers: {}, body: String(e) });
    }
    setLoading(false);
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (i: number, key: string, value: string) => {
    const next = [...headers];
    next[i] = { key, value };
    setHeaders(next);
  };
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Webhook className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">API Lab</h2>
          <p className="text-xs text-nd-text-muted">HTTP request builder and tester</p>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label="HTTP method"
          className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-medium text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="https://api.example.com/v1/resource"
          aria-label="Request URL"
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
        />
        <button type="button" onClick={send} disabled={loading} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
          {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Send
        </button>
      </div>

      <div role="tablist" aria-label="Request sections" className="mb-3 flex gap-1">
        {(['headers', 'body', 'response'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${activeTab === tab ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:text-nd-text/80'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        {activeTab === 'headers' && (
          <div className="space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(i, e.target.value, h.value)}
                  placeholder="Header"
                  className="flex-1 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(i, h.key, e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                />
                <button type="button" onClick={() => removeHeader(i)} aria-label="Remove header" className="text-nd-text-muted hover:text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40 rounded">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addHeader} className="flex items-center gap-1 text-xs text-nd-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add header
            </button>
          </div>
        )}

        {activeTab === 'body' && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="h-full w-full resize-none rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 p-3 font-mono text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
        )}

        {activeTab === 'response' && (
          <div className="space-y-3">
            {response ? (
              <>
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${response.status >= 200 && response.status < 300 ? 'bg-nd-success/10 text-nd-success' : response.status >= 400 ? 'bg-nd-danger/10 text-nd-danger' : 'bg-nd-warning/10 text-nd-warning'}`}>
                    {response.status} {response.statusText}
                  </span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(response.body)} aria-label="Copy response" className="text-nd-text-muted hover:text-nd-text/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded">
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <pre className="overflow-auto rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 p-3 font-mono text-xs text-nd-text/80">{response.body}</pre>
              </>
            ) : (
              <EmptyState icon={Send} title="No response yet" description="Configure your request and press Send to see the response here." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
