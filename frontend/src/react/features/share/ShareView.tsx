import { useCallback, useEffect, useState } from 'react';
import { Share2, Users, ArrowUpDown, RefreshCw, Send } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import { TorrentView } from '../torrent/TorrentView';

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
  const [activePanel, setActivePanel] = useState<'lan' | 'torrent'>('lan');
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
    <div className="share-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Share2 className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="share-view-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Share</div>
          <h2 className="text-lg font-semibold text-nd-text">Share & Transfer</h2>
          <p className="text-xs text-nd-text-muted">LAN P2P, SFTP, FTP transfers</p>
        </div>
        <button type="button" aria-label="Refresh transfer status" onClick={load} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Inner Tabs */}
      <div className="share-inner-tabs mb-4">
        <button
          type="button"
          className={`share-inner-tab ${activePanel === 'lan' ? 'active' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40`}
          data-panel="lan"
          aria-selected={activePanel === 'lan'}
          onClick={() => setActivePanel('lan')}
        >
          LAN P2P
        </button>
        <button
          type="button"
          className={`share-inner-tab ${activePanel === 'torrent' ? 'active' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40`}
          data-panel="torrent"
          aria-selected={activePanel === 'torrent'}
          onClick={() => setActivePanel('torrent')}
        >
          Torrent
        </button>
      </div>

      {/* LAN Panel */}
      <div
        id="share-panel-lan"
        className={`share-panel-section ${activePanel === 'lan' ? 'active' : ''} flex min-h-0 flex-1 flex-col`}
        style={{ display: activePanel === 'lan' ? 'flex' : 'none' }}
      >
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="File path to send..."
            aria-label="File path to send"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <button type="button" onClick={sendFile} disabled={loading} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
            <Send className="h-4 w-4" aria-hidden="true" /> Send
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex w-64 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
              <Users className="h-3.5 w-3.5" /> Peers ({peers.length})
            </div>
            <div className="mt-2 space-y-2">
              {peers.map((peer) => (
                <div key={peer.id} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 p-2">
                  <p className="text-xs font-medium text-nd-text/90">{peer.name}</p>
                  <p className="text-[10px] font-mono text-nd-text-muted/70">{peer.address}</p>
                </div>
              ))}
              {!peers.length && <p className="py-4 text-center text-xs text-nd-text-muted/70">No peers discovered</p>}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
              <ArrowUpDown className="h-3.5 w-3.5" /> Active Transfers
            </div>
            <div className="mt-2 space-y-2">
              {transfers.map((t) => (
                <div key={t.id} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-nd-text/90">{t.filename}</span>
                    <span className="text-[10px] text-nd-text-muted">{t.status}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nd-text/10">
                    <div className="h-full rounded-full bg-nd-accent transition-all" style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              ))}
              {!transfers.length && <p className="py-4 text-center text-xs text-nd-text-muted/70">No active transfers</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Torrent Panel */}
      <div
        id="share-panel-torrent"
        className={`share-panel-section ${activePanel === 'torrent' ? 'active' : ''} flex min-h-0 flex-1 flex-col`}
        style={{ display: activePanel === 'torrent' ? 'flex' : 'none' }}
      >
        <TorrentView />
      </div>
    </div>
  );
}
