import { useCallback, useEffect, useState } from 'react';
import {
  Magnet, Plus, Pause, Play, Trash2, RefreshCw, ArrowDown, ArrowUp,
  FolderOpen, ArrowUpRight, Copy, Info
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { TorrentItem } from '../../services/bridgeAdapter';

function formatBytes(bytes?: number) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let scaled = value;
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  const precision = scaled >= 100 || unitIndex === 0 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(precision)} ${units[unitIndex]}`;
}

function formatRate(bps?: number) {
  return `${formatBytes(bps)}/s`;
}

function formatEta(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '—';
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  if (totalSeconds === 0) return 'done';
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return secs ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function torrentStatusKey(entry: TorrentItem) {
  if (!entry) return 'unknown';
  if (entry.completed && entry.paused) return 'paused-complete';
  if (entry.completed) return 'completed';
  if (entry.paused) return 'paused';
  if (!entry.metadata_known) return 'metadata';
  if (entry.status === 'waiting' && Number(entry.peers || 0) === 0) return 'stalled';
  if (entry.status === 'waiting') return 'waiting';
  return entry.status || 'running';
}

function torrentStatusLabel(entry: TorrentItem) {
  switch (torrentStatusKey(entry)) {
    case 'paused-complete': return 'paused complete';
    case 'completed': return 'completed';
    case 'paused': return 'paused';
    case 'metadata': return 'fetching metadata';
    case 'waiting': return 'waiting for peers';
    case 'stalled': return 'stalled';
    case 'running':
    default: return 'downloading';
  }
}

function torrentStatusColor(entry: TorrentItem) {
  const key = torrentStatusKey(entry);
  if (key === 'completed') return 'text-nd-success';
  if (key === 'paused' || key === 'paused-complete') return 'text-nd-text-muted';
  if (key === 'stalled' || key === 'metadata') return 'text-nd-warning';
  return 'text-nd-accent';
}

export function TorrentView() {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [downloadRoot, setDownloadRoot] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await neurodeckApi.torrent.getStatus();
      setTorrents(status.torrents || []);
      setDownloadRoot(status.download_root || '');
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
      if (t.paused) await neurodeckApi.torrent.resume(t.id);
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

  const selected = torrents.find((t) => t.id === selectedId) || null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Magnet className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Torrent</h2>
          <p className="text-xs text-nd-text-muted">BitTorrent downloads</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-nd-text-muted">
          <span className="flex items-center gap-1"><ArrowDown className="h-3.5 w-3.5 text-nd-success" /> {formatRate(torrents.reduce((sum, t) => sum + (t.download_rate_bps || 0), 0))}</span>
          <span className="flex items-center gap-1"><ArrowUp className="h-3.5 w-3.5 text-nd-accent" /> {formatRate(torrents.reduce((sum, t) => sum + (t.upload_rate_bps || 0), 0))}</span>
          <span>{torrents.filter((t) => !t.paused && !t.completed).length}/{torrents.length} active</span>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-3 flex gap-2">
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

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Torrent list */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-auto">
          {torrents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-nd-text-muted/70">
              <Magnet className="h-10 w-10 mb-3" />
              <p className="text-sm">No torrents active</p>
              <p className="text-xs mt-1">Add a magnet link or torrent file to start downloading</p>
            </div>
          )}
          {torrents.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedId === t.id
                  ? 'border-nd-accent/30 bg-nd-accent/[0.04]'
                  : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/20'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nd-text/90">{t.name || t.id}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-nd-text-muted">
                    <span className={torrentStatusColor(t)}>{torrentStatusLabel(t)}</span>
                    <span>{t.peers} peers · {t.trackers} trackers</span>
                    <span>{formatRate(t.download_rate_bps)} ↓ · {formatRate(t.upload_rate_bps)} ↑</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleTorrent(t); }}
                    className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-accent"
                  >
                    {t.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTorrent(t.id); }}
                    className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${t.completed ? 'bg-nd-success' : 'bg-nd-accent'}`}
                  style={{ width: `${Math.min(100, Math.max(0, t.progress_pct || 0))}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-nd-text-muted/60">
                <span>{t.progress_pct?.toFixed(1) ?? 0}% · {t.pieces_done}/{t.pieces_total} pieces</span>
                <span>ETA {formatEta(t.eta_seconds)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Inspector */}
        {selected && (
          <div className="hidden w-80 shrink-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 lg:flex">
            <h3 className="text-sm font-semibold text-nd-text">Torrent Inspector</h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                <p className="truncate text-xs font-medium text-nd-text/90">{selected.name || selected.id}</p>
                <p className="text-[10px] text-nd-text-muted">{selected.source_kind?.toUpperCase()} · {selected.source_display || selected.source_value}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs ${torrentStatusColor(selected)}`}>{torrentStatusLabel(selected)}</span>
                  <span className="text-xs font-semibold text-nd-text">{(selected.progress_pct || 0).toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <InspectorRow label="Progress" value={`${(selected.progress_pct || 0).toFixed(1)}%`} />
                <InspectorRow label="Pieces" value={`${selected.pieces_done}/${selected.pieces_total}`} />
                <InspectorRow label="Peers" value={String(selected.peers)} />
                <InspectorRow label="Trackers" value={String(selected.trackers)} />
                <InspectorRow label="Downloaded" value={formatBytes(selected.downloaded_bytes)} />
                <InspectorRow label="Uploaded" value={formatBytes(selected.uploaded_bytes)} />
                <InspectorRow label="Remaining" value={formatBytes(selected.bytes_remaining)} />
                <InspectorRow label="ETA" value={formatEta(selected.eta_seconds)} />
                <InspectorRow label="Info Hash" value={selected.info_hash || '—'} />
              </div>

              <div className="flex flex-wrap gap-1">
                <MiniBtn icon={Copy} label="Copy Hash" onClick={() => navigator.clipboard.writeText(selected.info_hash || '')} />
                <MiniBtn icon={FolderOpen} label="Open Root" onClick={() => neurodeckApi.torrent.openDownloadRoot().catch(() => {})} />
                <MiniBtn icon={ArrowUpRight} label="Reveal" onClick={() => neurodeckApi.torrent.openSavePath(selected.id).catch(() => {})} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-nd-text-muted">{label}</span>
      <span className="font-mono text-nd-text/80 truncate max-w-[140px]" title={value}>{value}</span>
    </div>
  );
}

function MiniBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-1 text-[10px] text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text"
      title={label}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
