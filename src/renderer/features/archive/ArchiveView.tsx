import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  FileText,
  History,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { bridgeInvoke } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { Badge } from "../../components/primitives/Badge";

export type ArchiveKind = "session" | "export";

export interface ArchivedItem {
  id: string;
  name: string;
  kind: ArchiveKind;
  archivedAt: string;
  sizeBytes?: number;
  messageCount?: number;
}

type FilterType = "all" | ArchiveKind;

function formatBytes(bytes = 0): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let scaled = bytes;
  let i = 0;
  while (scaled >= 1024 && i < units.length - 1) {
    scaled /= 1024;
    i += 1;
  }
  return `${scaled.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const filterOptions = [
  { value: "all", label: "All" },
  { value: "session", label: "Sessions" },
  { value: "export", label: "Exports" },
];

export function ArchiveView() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bridgeInvoke<ArchivedItem[]>("list_archived");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const totalSize = useMemo(
    () => items.reduce((sum, i) => sum + (i.sizeBytes ?? 0), 0),
    [items]
  );

  async function handleRestore(item: ArchivedItem) {
    setBusyId(item.id);
    try {
      await bridgeInvoke("unarchive", { id: item.id });
      await loadItems();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(item: ArchivedItem) {
    setBusyId(item.id);
    try {
      const file = await bridgeInvoke<string>("export_session_markdown", {
        session_id: item.id,
      });
      if (file) {
        // Best-effort download: Electron exposes save-dialog via preload in production.
        const neurodeck = (window as Window & { neurodeck?: Record<string, unknown> }).neurodeck;
        if (typeof neurodeck?.showSaveDialog === "function") {
          await (neurodeck.showSaveDialog as (opts: { defaultPath: string }) => Promise<void>)({
            defaultPath: item.name,
          });
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setBusyId(id);
    try {
      await bridgeInvoke("delete_archived", { id });
      await loadItems();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAll() {
    setConfirmDeleteAll(false);
    setLoading(true);
    try {
      await bridgeInvoke("delete_all_archived");
      await loadItems();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <div data-testid="archive-view" className="flex h-full min-h-0 flex-col gap-4">
      <Panel
        eyebrow="Sessions"
        title="Archive"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={History}
            onClick={() => void loadItems()}
            disabled={loading}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <div className="flex items-center gap-3 p-4">
          <Select
            label="Filter"
            value={filter}
            options={filterOptions}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="w-40"
          />
          <span className="ml-auto text-xs text-nd-text-muted">
            {filtered.length} archived item{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <ErrorState
              title="Could not load archived items"
              message={error}
              onRetry={() => void loadItems()}
              onClose={() => setError(null)}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 scrollbar-thin">
          {loading && items.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" count={3} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No archived items"
              description="Sessions can be archived from the Session Browser."
              variant="deck"
            />
          ) : (
            filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 focus-within:ring-2 focus-within:ring-nd-accent-primary/40"
                tabIndex={-1}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-border-subtle bg-nd-surface-secondary">
                    {item.kind === "session" ? (
                      <MessageSquare
                        className="h-5 w-5 text-nd-accent-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <FileText
                        className="h-5 w-5 text-nd-accent-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-nd-text-primary">
                        {item.name}
                      </h4>
                      <Badge tone="neutral" size="sm">
                        {item.kind === "session" ? "Session" : "Export"}
                      </Badge>
                      <StatusChip size="sm" tone="info">
                        Archived {formatRelative(item.archivedAt)}
                      </StatusChip>
                    </div>
                    <p className="mt-1 text-xs text-nd-text-muted">
                      {item.kind === "session" && item.messageCount !== undefined
                        ? `${item.messageCount} message${item.messageCount === 1 ? "" : "s"}`
                        : "Markdown export"}
                      {item.sizeBytes !== undefined && ` · ${formatBytes(item.sizeBytes)}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.kind === "session" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => void handleRestore(item)}
                      disabled={busyId === item.id}
                      loading={busyId === item.id}
                      aria-label={`Restore ${item.name}`}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Download}
                      onClick={() => void handleDownload(item)}
                      disabled={busyId === item.id}
                      loading={busyId === item.id}
                      aria-label={`Download ${item.name}`}
                    >
                      Download
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={busyId === item.id}
                    aria-label={`Delete ${item.name}`}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-nd-border-subtle p-4">
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setConfirmDeleteAll(true)}
              aria-label="Delete all archived items"
            >
              Delete All Archived
            </Button>
            <span className="text-xs text-nd-text-muted">
              {items.length} items · {formatBytes(totalSize)}
            </span>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && void handleDelete(confirmDeleteId)}
        title="Permanently delete archive?"
        message="This archive cannot be recovered after deletion."
        confirmLabel="Delete"
        destructive
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => void handleDeleteAll()}
        title="Permanently delete all archived items?"
        message={`This will permanently remove all ${items.length} archived items (${formatBytes(totalSize)}). This action cannot be undone.`}
        confirmLabel="Delete All"
        destructive
      />
    </div>
  );
}
