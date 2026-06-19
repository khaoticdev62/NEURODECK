import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  Archive,
  Database,
  Download,
  FileText,
  Pin,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  AlertTriangle,
  X,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

interface BackupEntry {
  name: string;
  size_bytes: number;
}

function formatUpdatedAt(raw: string | undefined): {
  display: string;
  dateTime: string | undefined;
} {
  if (!raw || raw === "local cache") return { display: raw ?? "", dateTime: undefined };
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return { display: raw, dateTime: undefined };
    return {
      display: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      dateTime: d.toISOString(),
    };
  } catch {
    return { display: raw, dateTime: undefined };
  }
}

export function MemoryView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const [query, setQuery] = useState("");
  const [newFact, setNewFact] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [backups, setBackups] = useState<BackupEntry[] | null>(null);
  const [showBackups, setShowBackups] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [restoreConfirmName, setRestoreConfirmName] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; retry?: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupsToggleBtnRef = useRef<HTMLButtonElement>(null);

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
    if (!q) {
      setSemanticMode(false);
      setSemanticResults(null);
      return;
    }
    setLoadError(null);
    setBusy("semantic");
    try {
      const res = await neurodeckApi.memory.searchSemantic(q, 10, 0.5);
      const items = res.results.map((r) => ({
        id: r.id,
        title: r.metadata?.title || r.content.slice(0, 40),
        body: r.content,
        scope: (r.metadata?.scope as any) || "Global",
        pinned: r.metadata?.pinned === "true",
        updatedAt: r.metadata?.updatedAt || "local cache",
        sourceFile: r.source_file || r.metadata?.path || undefined,
        namespace: r.metadata?.namespace || r.metadata?.source || undefined,
      }));
      setSemanticResults(items);
      setSemanticMode(true);
      showToast(`${res.method === "mmr" ? "MMR" : "Keyword"} search — ${items.length} results`);
    } catch (e) {
      setLoadError({ message: `Semantic search failed: ${e}`, retry: handleSemanticSearch });
    } finally {
      setBusy(null);
    }
  }, [query, showToast]);

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    void actions.addMemoryFact(newFact.trim());
    setNewFact("");
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setBusy("export");
    try {
      const res = await neurodeckApi.memory.exportAll();
      const envelope = {
        ndmem_version: "1.0",
        exported_at: new Date().toISOString(),
        record_count: res.count,
        records: JSON.parse(res.data),
      };
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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
  const handleImportFile = useCallback(
    async (file: File) => {
      setBusy("import");
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const records: unknown[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.records)
            ? parsed.records
            : null;
        if (!records)
          throw new Error("Unrecognised file format — expected a .ndmem or exported JSON array");
        const data = JSON.stringify(records);
        const res = await neurodeckApi.memory.importData(data);
        showToast(`Imported ${res.imported} / ${res.total} records`);
      } catch (e) {
        showToast(`Import failed: ${e}`, false);
      } finally {
        setBusy(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [showToast]
  );

  // ── Backup ─────────────────────────────────────────────────────────────────
  const handleBackup = useCallback(async () => {
    setBusy("backup");
    try {
      await neurodeckApi.memory.backup();
      showToast("Backup created");
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
      setRestoreConfirmName(null);
      return;
    }
    setLoadError(null);
    setBusy("list");
    try {
      const res = await neurodeckApi.memory.listBackups();
      setBackups(res.backups);
      setShowBackups(true);
    } catch (e) {
      setLoadError({ message: `Could not list backups: ${e}`, retry: handleToggleBackups });
    } finally {
      setBusy(null);
    }
  }, [showBackups]);

  // Return focus to the Backups toggle when the backup panel closes
  const prevShowBackups = useRef(showBackups);
  useEffect(() => {
    if (prevShowBackups.current && !showBackups) {
      backupsToggleBtnRef.current?.focus();
    }
    prevShowBackups.current = showBackups;
  }, [showBackups]);

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleConfirmRestore = useCallback(
    async (name: string) => {
      setRestoreConfirmName(null);
      setBusy("restore");
      try {
        await neurodeckApi.memory.restoreBackup(name);
        showToast(`Restored from ${name}`);
        setShowBackups(false);
      } catch (e) {
        showToast(`Restore failed: ${e}`, false);
      } finally {
        setBusy(null);
      }
    },
    [showToast]
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <Panel
      eyebrow="Memory Vault"
      title="Local-First Recall"
      className="memory-shell flex h-full flex-col overflow-hidden"
    >
      <div className="memory-kicker px-4 pt-4 text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
        Memory
      </div>

      {/* Export / Import / Backup toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <Button
          size="sm"
          variant="outline"
          icon={Download}
          disabled={busy !== null}
          aria-label="Export all memories to file"
          loading={busy === "export"}
          className="min-h-touch"
          onClick={() => void handleExport()}
        >
          Export
        </Button>

        <Button
          size="sm"
          variant="outline"
          icon={Upload}
          disabled={busy !== null}
          aria-label="Import memories from file"
          loading={busy === "import"}
          className="min-h-touch"
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </Button>
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

        <Button
          size="sm"
          variant="outline"
          icon={Archive}
          disabled={busy !== null}
          aria-label="Create a local backup snapshot"
          loading={busy === "backup"}
          className="min-h-touch"
          onClick={() => void handleBackup()}
        >
          Backup
        </Button>

        <Button
          ref={backupsToggleBtnRef}
          size="sm"
          variant={showBackups ? "soft" : "outline"}
          icon={RefreshCw}
          disabled={busy === "restore"}
          aria-expanded={showBackups}
          aria-label="View and restore backups"
          loading={busy === "list"}
          className="min-h-touch"
          onClick={() => void handleToggleBackups()}
        >
          Backups
        </Button>

        <Button
          size="sm"
          variant={semanticMode ? "soft" : "outline"}
          icon={Sparkles}
          disabled={busy === "semantic" || (!semanticMode && !query.trim())}
          aria-pressed={semanticMode}
          aria-label={
            semanticMode ? "Exit semantic search mode" : "Run MMR semantic search on current query"
          }
          loading={busy === "semantic"}
          className="min-h-touch"
          onClick={() => {
            if (semanticMode) {
              setSemanticMode(false);
              setSemanticResults(null);
            } else void handleSemanticSearch();
          }}
        >
          {semanticMode ? "MMR Active" : "Semantic"}
        </Button>

        {toast && (
          <span
            role="status"
            aria-live="polite"
            className={`ml-auto text-xs ${toast.ok ? "text-nd-accent-success" : "text-nd-accent-error"}`}
          >
            {toast.text}
          </span>
        )}
      </div>

      {loadError && (
        <div className="px-4 pt-2">
          <ErrorState
            title="Load failed"
            message={loadError.message}
            onRetry={loadError.retry}
            onClose={() => setLoadError(null)}
          />
        </div>
      )}

      {/* Backup restore panel */}
      {showBackups && (
        <div
          role="region"
          aria-label="Backup files"
          className="mx-4 mt-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20"
        >
          {!backups || backups.length === 0 ? (
            <p className="px-4 py-3 text-xs italic text-nd-text-muted/60">
              No backups yet — click Backup to create one.
            </p>
          ) : (
            <ul className="divide-y divide-nd-border-subtle/40">
              {backups.map((b) => (
                <li key={b.name} className="flex flex-col gap-2 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Archive
                      className="h-3.5 w-3.5 shrink-0 text-nd-text-muted/60"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-nd-text-primary/80">
                      {b.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-nd-text-muted/60">
                      {formatBytes(b.size_bytes)}
                    </span>
                    {restoreConfirmName === b.name ? (
                      <div
                        className="flex items-center gap-1.5"
                        role="group"
                        aria-label={`Confirm restore ${b.name}`}
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === "restore"}
                          className="min-h-touch"
                          onClick={() => void handleConfirmRestore(b.name)}
                        >
                          Confirm
                        </Button>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Cancel restore"
                          onClick={() => setRestoreConfirmName(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={RotateCcw}
                        disabled={busy === "restore"}
                        aria-label={`Restore backup ${b.name}`}
                        className="min-h-touch"
                        onClick={() => setRestoreConfirmName(b.name)}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                  {restoreConfirmName === b.name && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-nd-accent-warning/25 bg-nd-accent-warning/8 px-3 py-1.5 text-xs text-nd-accent-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      This will replace your current memory with this backup.
                    </p>
                  )}
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
          <Button type="submit" id="memory-fact-save-btn" className="min-h-touch">
            Add Fact
          </Button>
        </form>

        <div className="memory-search-shell flex flex-col justify-end">
          <TextInput
            id="memory-search-input"
            className="memory-search-input"
            label="Search Memory Vault"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (semanticMode) {
                setSemanticMode(false);
                setSemanticResults(null);
              }
            }}
            placeholder="Search memory... (use Semantic button for MMR)"
          />
        </div>
      </div>

      {/* Screen reader live region for search/semantic results */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="memory-search-status"
      >
        {semanticMode && semanticResults !== null
          ? `Found ${semanticResults.length} related memories via semantic search`
          : query.trim() && filtered.length !== state.memories.length
          ? `${filtered.length} memories match your search`
          : ""}
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
        <ul role="list" className="grid gap-4 lg:grid-cols-3" aria-label="Memory records">
          {filtered.map((memory, i) => {
            const ts = formatUpdatedAt(memory.updatedAt);
            const isConfirmingDelete = deleteConfirmId === memory.id;
            return (
              <li
                key={memory.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
              <article
                aria-label={memory.title ?? "(untitled)"}
                className={`rounded-2xl border p-4 transition ${
                  memory.pinned
                    ? "border-nd-accent-primary/40 bg-nd-accent-primary/[0.08]"
                    : "border-nd-border-subtle bg-nd-surface-secondary/20 hover:border-nd-accent-primary/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-nd-accent-primary text-nd-accent-primary font-black bg-nd-surface-secondary/20 shadow-[var(--nd-glow-brand-sm)]"
                    aria-hidden="true"
                  >
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton
                      type="button"
                      size="sm"
                      variant={memory.pinned ? "accent" : "outline"}
                      aria-label={memory.pinned ? "Unpin memory" : "Pin memory"}
                      aria-pressed={memory.pinned}
                      onClick={() => void actions.toggleMemoryPin(memory.id, !memory.pinned)}
                    >
                      <Pin className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    {isConfirmingDelete ? (
                      <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="Confirm delete memory"
                      >
                        <IconButton
                          type="button"
                          size="sm"
                          variant="accent"
                          aria-label="Confirm delete"
                          onClick={() => {
                            setDeleteConfirmId(null);
                            void actions.deleteMemory(memory.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Cancel delete"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      </div>
                    ) : (
                      <IconButton
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="Delete memory"
                        onClick={() => setDeleteConfirmId(memory.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    )}
                  </div>
                </div>
                {isConfirmingDelete && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-nd-accent-error/25 bg-nd-accent-error/8 px-3 py-1.5 text-xs text-nd-accent-error">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Permanently delete this memory?
                  </p>
                )}
                <h3 className="mt-4 font-semibold text-nd-text-primary">
                  {memory.title ?? "(untitled)"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-nd-text-muted">{memory.body}</p>
                {memory.sourceFile && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-nd-border-subtle/50 bg-nd-surface/40 px-2 py-1">
                    <FileText
                      className="h-3 w-3 shrink-0 text-nd-text-muted/60"
                      aria-hidden="true"
                    />
                    <span
                      className="truncate font-mono text-[10px] text-nd-text-muted/75"
                      title={memory.sourceFile}
                    >
                      {memory.sourceFile.split(/[\\/]/).pop() ?? memory.sourceFile}
                    </span>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Badge
                    tone={
                      memory.scope === "Global"
                        ? "accent"
                        : memory.scope === "Project"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {memory.scope}
                  </Badge>
                  {ts.dateTime ? (
                    <time dateTime={ts.dateTime} className="text-xs text-nd-text-muted/70">
                      {ts.display}
                    </time>
                  ) : (
                    <span className="text-xs text-nd-text-muted/70">{ts.display}</span>
                  )}
                </div>
              </article>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
