import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Magnet, Plus, Pause, Play, Trash2, RefreshCw, ArrowDown, ArrowUp,
  FolderOpen, ArrowUpRight, Copy, Info, Search, CheckSquare, Square as SquareIcon,
  PauseCircle, PlayCircle, Trash, Filter, ArrowDownUp
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { TorrentItem } from '../../services/bridgeAdapter';
import { useToast } from '../../components/primitives/Toast';

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

type FilterKey = 'all' | 'running' | 'paused' | 'completed' | 'metadata' | 'stalled';
type SortKey = 'recent' | 'progress' | 'name' | 'peers' | 'status';

export function TorrentView() {
  const { toast } = useToast();
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [downloadRoot, setDownloadRoot] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [confirmRemove, setConfirmRemove] = useState<{ id?: string; ids?: string[] } | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const prevCompleted = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await neurodeckApi.torrent.getStatus();
      const list = status.torrents || [];
      setTorrents(list);
      setDownloadRoot(status.download_root || '');

      // Detect completions
      const nowCompleted = new Set(list.filter((t) => t.completed).map((t) => t.id));
      for (const id of nowCompleted) {
        if (!prevCompleted.current.has(id)) {
          const t = list.find((x) => x.id === id);
          if (t) toast(`Download complete: ${t.name || t.id}`, 'success', 6000);
        }
      }
      prevCompleted.current = nowCompleted;
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  // Paste handler for magnet links
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      if (text.startsWith('magnet:?')) {
        setInput(text);
        toast('Magnet link detected — press Add to start', 'info', 3000);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [toast]);

  const addTorrent = async (source?: string) => {
    const src = source || input.trim();
    if (!src) return;
    setLoading(true);
    try {
      await neurodeckApi.torrent.add(src);
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

  const removeTorrent = async (id: string, withData: boolean) => {
    try {
      await neurodeckApi.torrent.remove(id, withData);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (_) { /* ignore */ }
  };

  const pauseAll = async () => {
    try { await neurodeckApi.torrent.pauseAll(); await load(); } catch (_) {}
  };

  const resumeAll = async () => {
    try { await neurodeckApi.torrent.resumeAll(); await load(); } catch (_) {}
  };

  const batchRemove = async (ids: string[], withData: boolean) => {
    for (const id of ids) {
      try { await neurodeckApi.torrent.remove(id, withData); } catch (_) {}
    }
    setSelectedIds(new Set());
    await load();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredTorrents.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const filteredTorrents = useMemo(() => {
    let list = torrents;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => (t.name || t.id).toLowerCase().includes(q));
    }

    // Filter
    if (filter !== 'all') {
      list = list.filter((t) => {
        const key = torrentStatusKey(t);
        if (filter === 'running') return key === 'running' || key === 'waiting' || key === 'stalled';
        if (filter === 'paused') return key === 'paused' || key === 'paused-complete';
        if (filter === 'completed') return key === 'completed';
        if (filter === 'metadata') return key === 'metadata';
        if (filter === 'stalled') return key === 'stalled';
        return true;
      });
    }

    // Sort
    list = [...list];
    switch (sort) {
      case 'progress':
        list.sort((a, b) => (b.progress_pct || 0) - (a.progress_pct || 0));
        break;
      case 'name':
        list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        break;
      case 'peers':
        list.sort((a, b) => (b.peers || 0) - (a.peers || 0));
        break;
      case 'status':
        list.sort((a, b) => torrentStatusKey(a).localeCompare(torrentStatusKey(b)));
        break;
      case 'recent':
      default:
        list.sort((a, b) => new Date(b.added_at_utc).getTime() - new Date(a.added_at_utc).getTime());
        break;
    }

    return list;
  }, [torrents, searchQuery, filter, sort]);

  // Counts
  const counts = useMemo(() => {
    const total = torrents.length;
    const running = torrents.filter((t) => !t.paused && !t.completed).length;
    const paused = torrents.filter((t) => t.paused && !t.completed).length;
    const completed = torrents.filter((t) => t.completed).length;
    return { total, running, paused, completed };
  }, [torrents]);

  const selected = torrents.find((t) => t.id === selectedId) || null;

  // Drag and drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => { setIsDragging(false); };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData('text');
    if (text && (text.startsWith('magnet:?') || text.endsWith('.torrent'))) {
      await addTorrent(text);
      toast('Torrent added from drop', 'success', 3000);
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.name.endsWith('.torrent')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const content = ev.target?.result;
          if (typeof content === 'string') {
            // For file drops, we'd need a file path or content upload —
            // bridge doesn't support raw content upload yet, so show a message
            toast('File drop: use magnet links or paste file paths for now', 'warning', 4000);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex h-full flex-col ${isDragging ? 'ring-2 ring-nd-accent/50' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
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
          <span>{counts.running}/{counts.total} active</span>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Add bar */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTorrent()}
          placeholder="Magnet link or .torrent file path..."
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
        />
        <button type="button" onClick={() => addTorrent()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Search / Filter / Sort / Batch toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
          <Search className="h-4 w-4 text-nd-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search torrents..."
            className="flex-1 bg-transparent text-sm text-nd-text outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-1">
          <Filter className="h-3.5 w-3.5 text-nd-text-muted" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            className="bg-transparent text-xs text-nd-text outline-none"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="metadata">Metadata</option>
            <option value="stalled">Stalled</option>
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-1">
          <ArrowDownUp className="h-3.5 w-3.5 text-nd-text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-transparent text-xs text-nd-text outline-none"
          >
            <option value="recent">Recent</option>
            <option value="progress">Progress</option>
            <option value="name">Name</option>
            <option value="peers">Peers</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-nd-accent/20 bg-nd-accent/5 px-3 py-2">
          <span className="text-xs text-nd-text-muted">{selectedIds.size} selected</span>
          <button type="button" onClick={pauseAll} className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 px-2 py-1 text-xs text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
            <PauseCircle className="h-3.5 w-3.5" /> Pause All
          </button>
          <button type="button" onClick={resumeAll} className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 px-2 py-1 text-xs text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
            <PlayCircle className="h-3.5 w-3.5" /> Resume All
          </button>
          <button type="button" onClick={() => setConfirmRemove({ ids: Array.from(selectedIds) })} className="flex items-center gap-1 rounded-lg border border-nd-danger/25 px-2 py-1 text-xs text-nd-danger hover:bg-nd-danger/10">
            <Trash className="h-3.5 w-3.5" /> Remove Selected
          </button>
          <button type="button" onClick={deselectAll} className="ml-auto text-xs text-nd-text-muted hover:text-nd-text">
            Clear
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Torrent list */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-auto">
          {filteredTorrents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-nd-text-muted/70">
              <Magnet className="h-10 w-10 mb-3" />
              <p className="text-sm">No torrents match</p>
              <p className="text-xs mt-1">Add a magnet link, paste a torrent, or drag &amp; drop</p>
            </div>
          )}
          {filteredTorrents.map((t) => (
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
              <div className="flex items-center gap-2">
                {/* Checkbox for batch selection */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSelection(t.id); }}
                  className="shrink-0 text-nd-text-muted hover:text-nd-accent"
                >
                  {selectedIds.has(t.id) ? <CheckSquare className="h-4 w-4 text-nd-accent" /> : <SquareIcon className="h-4 w-4" />}
                </button>
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
                    aria-label={t.paused ? 'Resume torrent' : 'Pause torrent'}
                    className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    {t.paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmRemove({ id: t.id }); }}
                    aria-label="Remove torrent"
                    className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-text/10">
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

      {/* Count summary bar */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 text-[11px] text-nd-text-muted">
        <span>Total <strong className="text-nd-text">{counts.total}</strong></span>
        <span className="text-nd-text-muted/30">·</span>
        <span className="text-nd-accent">Running <strong>{counts.running}</strong></span>
        <span className="text-nd-text-muted/30">·</span>
        <span className="text-nd-text-muted">Paused <strong>{counts.paused}</strong></span>
        <span className="text-nd-text-muted/30">·</span>
        <span className="text-nd-success">Completed <strong>{counts.completed}</strong></span>
        {downloadRoot && (
          <>
            <span className="ml-auto truncate text-nd-text-muted/60">{downloadRoot}</span>
          </>
        )}
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nd-bg/70 backdrop-blur-sm">
          <div className="w-[360px] rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-nd-text">Remove torrent{confirmRemove.ids ? 's' : ''}?</h3>
            <p className="mt-2 text-xs leading-5 text-nd-text-muted">
              {confirmRemove.id
                ? `Remove "${torrents.find((t) => t.id === confirmRemove.id)?.name || confirmRemove.id}"?`
                : `Remove ${confirmRemove.ids?.length} selected torrents?`}
            </p>
            <label className="mt-3 flex items-center gap-2 text-xs text-nd-text-muted">
              <input
                type="checkbox"
                checked={deleteData}
                onChange={(e) => setDeleteData(e.target.checked)}
                className="rounded border-nd-text-muted/30"
              />
              Also delete downloaded files
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirmRemove(null); setDeleteData(false); }}
                className="rounded-xl border border-nd-text-muted/15 px-4 py-2 text-xs font-medium text-nd-text-muted hover:bg-nd-surface/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmRemove.id) await removeTorrent(confirmRemove.id, deleteData);
                  else if (confirmRemove.ids) await batchRemove(confirmRemove.ids, deleteData);
                  setConfirmRemove(null);
                  setDeleteData(false);
                }}
                className="rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-4 py-2 text-xs font-medium text-nd-danger hover:bg-nd-danger/15"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
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
