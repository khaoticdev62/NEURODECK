import { useCallback, useEffect, useState } from 'react';
import { Magnet, Plus, Pause, Play, Trash2, RefreshCw, ArrowDown, ArrowUp, Users } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { TorrentItem } from '../../services/bridgeAdapter';

export function TorrentView() {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [status, setStatus] = useState<{ active: number; total: number; download_speed: string; upload_speed: string } | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stat] = await Promise.all([
        neurodeckApi.torrent.list(),
        neurodeckApi.torrent.getStatus(),
      ]);
      setTorrents(list);
      setStatus(stat);
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const addTorrent = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      await neurodeckApi.torrent.add(input.trim());
      setInput('');
      await load();
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  const toggleTorrent = async (t: TorrentItem) => {
    try {
      if (t.status === 'paused') await neurodeckApi.torrent.resume(t.id);
      else await neurodeckApi.torrent.pause(t.id);
      await load();
    } catch (_) { /* ignore */ }
  };

  const removeTorrent = async (id: string) => {
    try {
      await neurodeckApi.torrent.remove(id);
      await load();
    } catch (_) { /* ignore */ }
  };

  const statusColor = (s: TorrentItem['status']) => {
    switch (s) {
      case 'downloading': return 'text-nd-success';
      case 'seeding': return 'text-nd-accent';
      case 'paused': return 'text-nd-text0';
      case 'error': return 'text-nd-danger';
      default: return 'text-nd-warning';
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Magnet className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Torrent</h2>
          <p className="text-xs text-nd-text0">BitTorrent downloads</p>
        </div>
        {status && (
          <div className="flex items-center gap-3 text-xs text-nd-text0">
            <span className="flex items-center gap-1"><ArrowDown className="h-3.5 w-3.5 text-nd-success" /> {status.download_speed}</span>
            <span className="flex items-center gap-1"><ArrowUp className="h-3.5 w-3.5 text-nd-accent" /> {status.upload_speed}</span>
            <span>{status.active}/{status.total} active</span>
          </div>
        )}
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTorrent()}
          placeholder="Magnet link or .torrent file path..."
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
        />
        <button type="button" onClick={addTorrent} disabled={loading} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {torrents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-nd-text-muted/70">
            <Magnet className="h-10 w-10 mb-3" />
            <p className="text-sm">No torrents active</p>
            <p className="text-xs mt-1">Add a magnet link or torrent file to start downloading</p>
          </div>
        )}
        {torrents.map((t) => (
          <div key={t.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-nd-text/90">{t.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-nd-text0">
                  <span className={statusColor(t.status)}>{t.status}</span>
                  <span>{t.size}</span>
                  <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {t.downloadSpeed}</span>
                  <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> {t.uploadSpeed}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.peers}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => toggleTorrent(t)} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-accent">
                  {t.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => removeTorrent(t.id)} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${t.status === 'error' ? 'bg-nd-danger' : t.status === 'paused' ? 'text-nd-text-muted/40' : 'bg-nd-success'}`}
                style={{ width: `${t.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
