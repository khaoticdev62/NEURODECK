import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import {
  Archive, Database, Download, FileText, Pin, RefreshCw, RotateCcw,
  Search, Sparkles, Trash2, Upload,
} from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Button } from '../../components/primitives/Button';
import { EmptyState } from '../../components/primitives/EmptyState';
import { IconButton } from '../../components/primitives/IconButton';
import { Panel } from '../../components/primitives/Panel';
import { TextInput } from '../../components/primitives/TextInput';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from '../../types/neurodeck';

interface BackupEntry {
  name: string;
  size_bytes: number;
}

export function MemoryView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [query, setQuery] = useState('');
  const [newFact, setNewFact] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [backups, setBackups] = useState<BackupEntry[] | null>(null);
  const [showBackups, setShowBackups] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [semanticResults, setSemanticResults] = useState<typeof state.memories | null>(null);

  const filtered = useMemo(() => {
    if (semanticMode && semanticResults) return semanticResults;
    const q = query.trim().toLowerCase();
    if (!q) return state.memories;
    return state.memories.filter((memory) =>
      `${memory.title} ${memory.body}`.toLowerCase().includes(q)
    );
  }, [query, state.memories, semanticMode, semanticResults]);

  const handleSemanticSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) { setSemanticMode(false); setSemanticResults(null); return; }
    setBusy('semantic');
    try {
      const res = await neurodeckApi.memory.searchSemantic(q, 10, 0.5);
      const items = res.results.map((r) => ({
        id: r.id,
        title: r.metadata?.title || r.content.slice(0, 40),
        body: r.content,
        scope: (r.metadata?.scope as any) || 'Global',
        pinned: r.metadata?.pinned === 'true',
        updatedAt: r.metadata?.updatedAt || 'local cache',
        sourceFile: r.source_file || r.metadata?.path || undefined,
        namespace: r.metadata?.namespace || r.metadata?.source || undefined,
      }));
      setSemanticResults(items);
      setSemanticMode(true);
      showToast(`${res.method === 'mmr' ? 'MMR' : 'Keyword'} search — ${items.length} results`);
    } catch (e) {
      showToast(`Semantic search failed: ${e}`, false);
    } finally {
      setBusy(null);
    }
  }, [query, showToast]);

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    void actions.addMemoryFact(newFact.trim());
    setNewFact('');
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setBusy('export');
    try {
      const res = await neurodeckApi.memory.exportAll();
      const envelope = {
        ndmem_version: '1.0',
        exported_at: new Date().toISOString(),
        record_count: res.count,
        records: JSON.parse(res.data),
      };
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neurodeck-memory-${new Date().toISOString().slice(0, 10)}.ndmem`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${res.count} memories`);
    } catch (e) {
      showToast(`Export failed: ${e}`, false);
    } finally {
      setBusy(null);
    }
  }, [showToast]);

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImportFile = useCallback(async (file: File) => {
    setBusy('import');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Accept either a raw array or the NdmemEnvelope wrapper format
      const records: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.records)
          ? parsed.records
          : null;
      if (!records) throw new Error('Unrecognised file format — expected a .ndmem or exported JSON array');
      const data = JSON.stringify(records);
      const res = await neurodeckApi.memory.importData(data);
      showToast(`Imported ${res.imported} / ${res.total} records`);
    } catch (e) {
      showToast(`Import failed: ${e}`, false);
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showToast]);

  // ── Backup ─────────────────────────────────────────────────────────────────
  const handleBackup = useCallback(async () => {
    setBusy('backup');
    try {
      await neurodeckApi.memory.backup();
      showToast('Backup created');
      // Refresh backup list if the panel is open
      if (showBackups) {
        const res = await neurodeckApi.memory.listBackups();
        setBackups(res.backups);
      }
    } catch (e) {
      showToast(`Backup failed: ${e}`, false);
    } finally {
      setBusy(null);
    }
  }, [showToast, showBackups]);

  // ── Backup list ─────────────────────────────────────────────────────────────
  const handleToggleBackups = useCallback(async () => {
    if (showBackups) {
      setShowBackups(false);
      return;
    }
    setBusy('list');
    try {
      const res = await neurodeckApi.memory.listBackups();
      setBackups(res.backups);
      setShowBackups(true);
    } catch (e) {
      showToast(`Could not list backups: ${e}`, false);
    } finally {
      setBusy(null);
    }
  }, [showBackups, showToast]);

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = useCallback(async (name: string) => {
    if (!confirm(`Restore backup "${name}"? This will replace your current memory with the backup.`)) return;
    setBusy('restore');
    try {
      await neurodeckApi.memory.restoreBackup(name);
      showToast(`Restored from ${name}`);
      setShowBackups(false);
    } catch (e) {
      showToast(`Restore failed: ${e}`, false);
    } finally {
      setBusy(null);
    }
  }, [showToast]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <Panel eyebrow="Memory Vault" title="Local-First Recall" className="memory-shell !flex-col h-full overflow-hidden">
      <div className="memory-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Memory</div>

      {/* Export / Import / Backup toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={busy !== null}
          aria-label="Export all memories to file"
          className="flex items-center gap-1.5 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-xs text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          {busy === 'export' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Download className="h-3 w-3" aria-hidden="true" />
          )}
          Export
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
          aria-label="Import memories from file"
          className="flex items-center gap-1.5 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-xs text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          {busy === 'import' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Upload className="h-3 w-3" aria-hidden="true" />
          )}
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ndmem,.json"
          aria-hidden="true"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
          }}
        />

        <button
          type="button"
          onClick={() => void handleBackup()}
          disabled={busy !== null}
          aria-label="Create a local backup snapshot"
          className="flex items-center gap-1.5 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-xs text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          {busy === 'backup' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Archive className="h-3 w-3" aria-hidden="true" />
          )}
          Backup
        </button>

        <button
          type="button"
          onClick={() => void handleToggleBackups()}
          disabled={busy === 'restore'}
          aria-expanded={showBackups}
          aria-label="View and restore backups"
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
            showBackups
              ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
              : 'border-nd-text-muted/15 bg-nd-surface/40 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text'
          }`}
        >
          {busy === 'list' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
          )}
          Backups
        </button>

        <button
          type="button"
          onClick={() => {
            if (semanticMode) { setSemanticMode(false); setSemanticResults(null); }
            else void handleSemanticSearch();
          }}
          disabled={busy === 'semantic' || (!semanticMode && !query.trim())}
          aria-pressed={semanticMode}
          aria-label={semanticMode ? 'Exit semantic search mode' : 'Run MMR semantic search on current query'}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
            semanticMode
              ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
              : 'border-nd-text-muted/15 bg-nd-surface/40 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text'
          }`}
        >
          {busy === 'semantic' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3 w-3" aria-hidden="true" />
          )}
          {semanticMode ? 'MMR Active' : 'Semantic'}
        </button>

        {toast && (
          <span
            role="status"
            aria-live="polite"
            className={`ml-auto text-xs ${toast.ok ? 'text-nd-success' : 'text-nd-danger'}`}
          >
            {toast.text}
          </span>
        )}
      </div>

      {/* Backup restore panel */}
      {showBackups && (
        <div
          role="region"
          aria-label="Backup files"
          className="mx-4 mt-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40"
        >
          {!backups || backups.length === 0 ? (
            <p className="px-4 py-3 text-xs text-nd-text-muted/60 italic">
              No backups yet — click Backup to create one.
            </p>
          ) : (
            <ul className="divide-y divide-nd-text-muted/10">
              {backups.map((b) => (
                <li key={b.name} className="flex items-center gap-3 px-4 py-2.5">
                  <Archive className="h-3.5 w-3.5 shrink-0 text-nd-text-muted/60" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-nd-text/80">{b.name}</span>
                  <span className="shrink-0 text-[10px] text-nd-text-muted/60">{formatBytes(b.size_bytes)}</span>
                  <button
                    type="button"
                    onClick={() => void handleRestore(b.name)}
                    disabled={busy === 'restore'}
                    aria-label={`Restore backup ${b.name}`}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-nd-warning/30 bg-nd-warning/10 px-2.5 py-1 text-[11px] text-nd-warning hover:bg-nd-warning/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-warning/40"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 px-4 pt-3 md:grid-cols-2">
        <form onSubmit={handleAddFact} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextInput
              id="new-memory-fact"
              className="memory-fact-input"
              label="Add Fact to Memory"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Type a new fact to persist..."
            />
          </div>
          <Button type="submit" id="memory-fact-save-btn">Add Fact</Button>
        </form>

        <div className="memory-search-shell flex flex-col justify-end">
          <TextInput
            id="memory-search-input"
            className="memory-search-input"
            label="Search Memory Vault"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (semanticMode) { setSemanticMode(false); setSemanticResults(null); }
            }}
            placeholder="Search memory... (use Semantic button for MMR)"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
        {filtered.length === 0 && state.memories.length === 0 && (
          <EmptyState
            icon={Database}
            title="Memory vault is empty."
            description="Conversations and facts will appear here as the agent builds context."
          />
        )}
        {filtered.length === 0 && state.memories.length > 0 && (
          <EmptyState
            icon={Search}
            title="No matches found"
            description={`No memories match "${query}". Try a different search term.`}
          />
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          {filtered.map((memory) => (
            <article
              key={memory.id}
              className={`rounded-3xl border p-4 transition ${
                memory.pinned
                  ? 'border-nd-accent/30 bg-nd-accent/[0.055]'
                  : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 text-nd-accent">
                  <Database className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <IconButton
                    type="button"
                    size="sm"
                    variant={memory.pinned ? 'accent' : 'outline'}
                    aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory'}
                    aria-pressed={memory.pinned}
                    onClick={() => void actions.toggleMemoryPin(memory.id, !memory.pinned)}
                  >
                    <Pin className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Delete memory"
                    onClick={() => void actions.deleteMemory(memory.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              <h3 className="mt-4 font-semibold text-nd-text">{memory.title ?? '(untitled)'}</h3>
              <p className="mt-2 text-sm leading-6 text-nd-text-muted">{memory.body}</p>
              {memory.sourceFile && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-nd-text-muted/10 bg-nd-bg/40 px-2 py-1">
                  <FileText className="h-3 w-3 shrink-0 text-nd-text-muted/60" aria-hidden="true" />
                  <span
                    className="truncate font-mono text-[10px] text-nd-text-muted/75"
                    title={memory.sourceFile}
                  >
                    {memory.sourceFile.split(/[\\/]/).pop() ?? memory.sourceFile}
                  </span>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <Badge tone={memory.scope === 'Global' ? 'accent' : memory.scope === 'Project' ? 'success' : 'neutral'}>
                  {memory.scope}
                </Badge>
                <span className="text-xs text-nd-text-muted/70">{memory.updatedAt}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}
