import { useCallback, useEffect, useState } from 'react';
import { Share2, Users, ArrowUpDown, RefreshCw, Send } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

interface Peer {
  id: string;
  name: string;
  address: string;
}

interface Transfer {
  id: string;
  filename: string;
  progress: number;
  status: string;
}

export function ShareView() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        neurodeckApi.share.getPeers(),
        neurodeckApi.share.getActiveTransfers(),
      ]);
      setPeers(p);
      setTransfers(t);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const sendFile = async () => {
    if (!filePath.trim()) return;
    setLoading(true);
    try {
      await neurodeckApi.share.startTransfer(filePath.trim());
      setFilePath('');
      await load();
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Share2 className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Share & Transfer</h2>
          <p className="text-xs text-slate-500">LAN P2P, SFTP, FTP transfers</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="File path to send..."
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
        />
        <button type="button" onClick={sendFile} disabled={loading} className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20">
          <Send className="h-4 w-4" /> Send
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Users className="h-3.5 w-3.5" /> Peers ({peers.length})
          </div>
          <div className="mt-2 space-y-2">
            {peers.map((peer) => (
              <div key={peer.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                <p className="text-xs font-medium text-slate-200">{peer.name}</p>
                <p className="text-[10px] font-mono text-slate-600">{peer.address}</p>
              </div>
            ))}
            {!peers.length && <p className="py-4 text-center text-xs text-slate-600">No peers discovered</p>}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" /> Active Transfers
          </div>
          <div className="mt-2 space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">{t.filename}</span>
                  <span className="text-[10px] text-slate-500">{t.status}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-neuro transition-all" style={{ width: `${t.progress}%` }} />
                </div>
              </div>
            ))}
            {!transfers.length && <p className="py-4 text-center text-xs text-slate-600">No active transfers</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
