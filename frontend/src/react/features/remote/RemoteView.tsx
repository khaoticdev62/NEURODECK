import { useCallback, useEffect, useState } from 'react';
import { Power, PowerOff, Radio, Copy, Users } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import { PlaceholderView } from '../../components/primitives/PlaceholderView';

export function RemoteView() {
  const [status, setStatus] = useState<{ running: boolean; url?: string; clients?: number }>({ running: false });
  const [port, setPort] = useState(9090);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const info = await neurodeckApi.remote.getInfo();
      setStatus(info);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (status.running) {
        await neurodeckApi.remote.stop();
      } else {
        await neurodeckApi.remote.start(port);
      }
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (status.url) navigator.clipboard.writeText(status.url);
  };

  return (
    <div className="remote-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${status.running ? 'border-nd-success/30 bg-nd-success/10' : 'border-nd-accent/20 bg-nd-accent/10'}`}>
          <Radio className={`h-5 w-5 ${status.running ? 'text-nd-success' : 'text-nd-accent'}`} />
        </div>
        <div>
          <div className="remote-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text0">Remote</div>
          <h2 className="text-lg font-semibold text-nd-text">Remote Control</h2>
          <p className="text-xs text-nd-text0">Mobile-friendly web remote server</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-6">
        <div id="remote-status-badge" className="flex items-center gap-4 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-4">
          <div className={`h-3 w-3 rounded-full ${status.running ? 'bg-nd-success shadow-[0_0_8px_rgba(124,255,178,0.5)]' : 'text-nd-text-muted/40'}`} />
          <span className="text-sm font-medium text-nd-text/90">
            {status.running ? 'Server Running' : 'Server Offline'}
          </span>
          {status.clients !== undefined && status.running && (
            <span className="ml-auto flex items-center gap-1 text-xs text-nd-text0">
              <Users className="h-3.5 w-3.5" /> {status.clients} client{status.clients === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-nd-text-muted">Server Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            disabled={status.running || loading}
            className="w-32 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
            status.running
              ? 'border border-nd-danger/30 bg-nd-danger/10 text-nd-danger hover:bg-danger/20'
              : 'border border-nd-success/30 bg-nd-success/10 text-nd-success hover:bg-nd-success/20'
          }`}
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : status.running ? (
            <><PowerOff className="h-4 w-4" /> Stop Server</>
          ) : (
            <><Power className="h-4 w-4" /> Start Server</>
          )}
        </button>

        {status.url && (
          <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-nd-text0">Remote URL</span>
              <button type="button" onClick={copyUrl} className="text-nd-accent hover:text-nd-accent/80">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-sm text-nd-text/80">{status.url}</p>
          </div>
        )}
      </div>
    </div>
  );
}
