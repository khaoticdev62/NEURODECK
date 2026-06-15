import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Magnet, Plus, Pause, Play, Trash2, RefreshCw, ArrowDown, ArrowUp,
  FolderOpen, ArrowUpRight, Copy, Search, CheckSquare, Square as SquareIcon,
  PauseCircle, PlayCircle, Trash
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { TorrentItem } from '../../services/bridgeAdapter';
import { useToast } from '../../components/primitives/Toast';
import { EmptyState } from '../../components/primitives/EmptyState';
import { LoadingState } from '../../components/primitives/LoadingState';
import { Button } from '../../components/primitives/Button';
import { IconButton } from '../../components/primitives/IconButton';
import { Panel } from '../../components/primitives/Panel';
import { Modal } from '../../components/primitives/Modal';
import { Select } from '../../components/primitives/Select';
import { StatusChip } from '../../components/primitives/StatusChip';
import { TextInput } from '../../components/primitives/TextInput';

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

function torrentStatusTone(entry: TorrentItem): 'info' | 'success' | 'warning' | 'error' {
  const key = torrentStatusKey(entry);
  if (key === 'completed') return 'success';
  if (key === 'paused' || key === 'paused-complete') return 'warning';
  if (key === 'stalled' || key === 'metadata') return 'warning';
  return 'info';
}

type FilterKey = 'all' | 'running' | 'paused' | 'completed' | 'metadata' | 'stalled';
type SortKey = 'recent' | 'progress' | 'name' | 'peers' | 'status';

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'stalled', label: 'Stalled' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'progress', label: 'Progress' },
  { value: 'name', label: 'Name' },
  { value: 'peers', label: 'Peers' },
  { value: 'status', label: 'Status' },
];

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
    <Panel
      eyebrow="BitTorrent"
      title="Torrent Client"
      className={`h-full ${isDragging ? 'ring-2 ring-nd-accent-primary/50' : ''}`}
    >
      <div
        ref={containerRef}
        className="flex h-full flex-col"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Header stats */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-nd-text-muted">
            <span className="flex items-center gap-1">
              <ArrowDown className="h-3.5 w-3.5 text-nd-accent-success" aria-hidden="true" />
              {formatRate(torrents.reduce((sum, t) => sum + (t.download_rate_bps || 0), 0))}
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3.5 w-3.5 text-nd-accent-primary" aria-hidden="true" />
              {formatRate(torrents.reduce((sum, t) => sum + (t.upload_rate_bps || 0), 0))}
            </span>
            <span>{counts.running}/{counts.total} active</span>
          </div>
          <IconButton
            type="button"
            size="md"
            variant="subtle"
            aria-label="Refresh torrent list"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          </IconButton>
        </div>

        {/* Add bar */}
        <div className="mb-3 flex gap-2">
          <TextInput
            id="torrent-source-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTorrent()}
            placeholder="Magnet link or .torrent file path..."
            aria-label="Magnet link or torrent file path"
            fullWidth
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={Plus}
            loading={loading}
            disabled={loading}
            onClick={() => addTorrent()}
          >
            Add
          </Button>
        </div>

        {/* Search / Filter / Sort toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 focus-within:border-nd-accent-primary/40 focus-within:ring-2 focus-within:ring-nd-accent-primary/20 transition-shadow">
            <Search className="h-4 w-4 text-nd-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search torrents..."
              aria-label="Search torrents"
              className="min-w-0 flex-1 bg-transparent text-sm text-nd-text-primary outline-none placeholder:text-nd-text-muted"
            />
          </div>
          <Select
            aria-label="Filter torrents"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            options={FILTER_OPTIONS}
            className="w-32"
          />
          <Select
            aria-label="Sort torrents"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            options={SORT_OPTIONS}
            className="w-32"
          />
        </div>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/5 px-3 py-2">
            <span className="text-xs text-nd-text-muted">{selectedIds.size} selected</span>
            <Button type="button" size="xs" variant="secondary" icon={PauseCircle} onClick={pauseAll}>
              Pause All
            </Button>
            <Button type="button" size="xs" variant="secondary" icon={PlayCircle} onClick={resumeAll}>
              Resume All
            </Button>
            <Button
              type="button"
              size="xs"
              variant="danger"
              icon={Trash}
              onClick={() => setConfirmRemove({ ids: Array.from(selectedIds) })}
            >
              Remove Selected
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={deselectAll}
              className="ml-auto"
            >
              Clear
            </Button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 gap-3">
          {/* Torrent list */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-auto">
            {loading && <LoadingState label="Loading torrents…" />}
            {!loading && filteredTorrents.length === 0 && (
              <EmptyState
                icon={Magnet}
                title="No torrents"
                description="Add a magnet link, paste a torrent URL, or drag & drop a .torrent file."
                compact
              />
            )}
            {filteredTorrents.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                className={`rounded-xl border p-3 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
                  selectedId === t.id
                    ? 'border-nd-accent-primary/30 bg-nd-accent-primary/[0.05]'
                    : 'border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/25'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Checkbox for batch selection */}
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={selectedIds.has(t.id) ? `Deselect ${t.name || t.id}` : `Select ${t.name || t.id}`}
                    aria-pressed={selectedIds.has(t.id)}
                    onClick={(e) => { e.stopPropagation(); toggleSelection(t.id); }}
                  >
                    {selectedIds.has(t.id)
                      ? <CheckSquare className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                      : <SquareIcon className="h-4 w-4" aria-hidden="true" />}
                  </IconButton>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text-primary">{t.name || t.id}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-nd-text-muted">
                      <StatusChip size="sm" tone={torrentStatusTone(t)}>
                        {torrentStatusLabel(t)}
                      </StatusChip>
                      <span>{t.peers} peers · {t.trackers} trackers</span>
                      <span>{formatRate(t.download_rate_bps)} ↓ · {formatRate(t.upload_rate_bps)} ↑</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      type="button"
                      size="md"
                      variant="subtle"
                      aria-label={t.paused ? 'Resume torrent' : 'Pause torrent'}
                      onClick={(e) => { e.stopPropagation(); toggleTorrent(t); }}
                    >
                      {t.paused
                        ? <Play className="h-4 w-4" aria-hidden="true" />
                        : <Pause className="h-4 w-4" aria-hidden="true" />}
                    </IconButton>
                    <IconButton
                      type="button"
                      size="md"
                      variant="danger"
                      aria-label="Remove torrent"
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove({ id: t.id }); }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
                  <div
                    className={`h-full rounded-full transition-all duration-normal motion-reduce:transition-none ${t.completed ? 'bg-nd-accent-success' : 'bg-nd-accent-primary'}`}
                    style={{ width: `${Math.min(100, Math.max(0, t.progress_pct || 0))}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-nd-text-muted">
                  <span>{t.progress_pct?.toFixed(1) ?? 0}% · {t.pieces_done}/{t.pieces_total} pieces</span>
                  <span>ETA {formatEta(t.eta_seconds)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Inspector */}
          {selected && (
            <div className="hidden w-80 shrink-0 flex-col gap-3 overflow-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 lg:flex">
              <h3 className="text-sm font-semibold text-nd-text-primary">Torrent Inspector</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
                  <p className="truncate text-xs font-medium text-nd-text-primary">{selected.name || selected.id}</p>
                  <p className="text-[10px] text-nd-text-muted">{selected.source_kind?.toUpperCase()} · {selected.source_display || selected.source_value}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusChip size="sm" tone={torrentStatusTone(selected)}>
                      {torrentStatusLabel(selected)}
                    </StatusChip>
                    <span className="text-xs font-semibold text-nd-text-primary">{(selected.progress_pct || 0).toFixed(1)}%</span>
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
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 text-[11px] text-nd-text-muted">
          <span>Total <strong className="text-nd-text-primary">{counts.total}</strong></span>
          <span className="text-nd-text-muted/30">·</span>
          <span className="text-nd-accent-primary">Running <strong>{counts.running}</strong></span>
          <span className="text-nd-text-muted/30">·</span>
          <span className="text-nd-text-muted">Paused <strong>{counts.paused}</strong></span>
          <span className="text-nd-text-muted/30">·</span>
          <span className="text-nd-accent-success">Completed <strong>{counts.completed}</strong></span>
          {downloadRoot && (
            <span className="ml-auto truncate text-nd-text-muted/60">{downloadRoot}</span>
          )}
        </div>
      </div>

      {/* Remove confirmation modal */}
      <Modal
        open={confirmRemove !== null}
        onClose={() => { setConfirmRemove(null); setDeleteData(false); }}
        title={`Remove torrent${confirmRemove?.ids ? 's' : ''}?`}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setConfirmRemove(null); setDeleteData(false); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={async () => {
                if (confirmRemove?.id) await removeTorrent(confirmRemove.id, deleteData);
                else if (confirmRemove?.ids) await batchRemove(confirmRemove.ids, deleteData);
                setConfirmRemove(null);
                setDeleteData(false);
              }}
            >
              Remove
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-nd-text-secondary">
          <p>
            {confirmRemove?.id
              ? `Remove "${torrents.find((t) => t.id === confirmRemove.id)?.name || confirmRemove.id}"?`
              : `Remove ${confirmRemove?.ids?.length} selected torrents?`}
          </p>
          <label className="flex items-center gap-2 text-xs text-nd-text-muted">
            <input
              type="checkbox"
              checked={deleteData}
              onChange={(e) => setDeleteData(e.target.checked)}
              className="rounded border-nd-border-subtle bg-nd-surface-secondary accent-nd-accent-primary"
            />
            Also delete downloaded files
          </label>
        </div>
      </Modal>
    </Panel>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-nd-text-muted">{label}</span>
      <span className="truncate max-w-[140px] font-mono text-nd-text-secondary" title={value}>{value}</span>
    </div>
  );
}

function MiniBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 px-2 py-1 text-[10px] text-nd-text-muted transition-colors duration-fast hover:bg-nd-surface-secondary hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
      title={label}
    >
      <Icon className="h-3 w-3" aria-hidden="true" /> {label}
    </button>
  );
}
