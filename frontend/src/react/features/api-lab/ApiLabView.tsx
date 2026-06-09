import { useState } from 'react';
import { Webhook, Send, Copy, Plus, Trash2 } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { ApiRequest, ApiResponse } from '../../services/bridgeAdapter';

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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Webhook className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">API Lab</h2>
          <p className="text-xs text-slate-500">HTTP request builder and tester</p>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-slate-100 outline-none"
        >
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="https://api.example.com/v1/resource"
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
        />
        <button type="button" onClick={send} disabled={loading} className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50">
          {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>

      <div className="mb-3 flex gap-1">
        {(['headers', 'body', 'response'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${activeTab === tab ? 'bg-neuro/10 text-neuro' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {activeTab === 'headers' && (
          <div className="space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(i, e.target.value, h.value)}
                  placeholder="Header"
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(i, h.key, e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <button type="button" onClick={() => removeHeader(i)} className="text-slate-500 hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addHeader} className="flex items-center gap-1 text-xs text-neuro hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add header
            </button>
          </div>
        )}

        {activeTab === 'body' && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="h-full w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-sm text-slate-100 outline-none"
          />
        )}

        {activeTab === 'response' && (
          <div className="space-y-3">
            {response ? (
              <>
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${response.status >= 200 && response.status < 300 ? 'bg-success/10 text-success' : response.status >= 400 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                    {response.status} {response.statusText}
                  </span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(response.body)} className="text-slate-500 hover:text-slate-300">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <pre className="overflow-auto rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-300">{response.body}</pre>
              </>
            ) : (
              <p className="text-sm text-slate-600">Send a request to see the response here.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
