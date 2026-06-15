import { MessageSquareText, Trash2, Edit2, Download } from "lucide-react";
import { Modal } from "../primitives/Modal";
import type { SessionNode } from "../../types/neurodeck";
import { useState } from "react";
import { bridgeInvoke, neurodeckApi } from "../../services/bridgeAdapter";

interface SessionCardProps {
  node: SessionNode;
  onRefresh?: () => void;
}

export function SessionCard({ node, onRefresh }: SessionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name || "");

  const formattedDate = new Date(node.created_at).toLocaleString();
  const displayName = node.name || node.id;

  const handleDelete = async () => {
    if (!confirm(`Delete session "${displayName}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await neurodeckApi.sessions.delete(node.id);
      onRefresh?.();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  const handleRename = async () => {
    const newName = renameValue.trim();
    if (!newName) return;
    setLoading(true);
    setError(null);
    try {
      await neurodeckApi.sessions.rename(node.id, newName);
      setRenameOpen(false);
      onRefresh?.();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await bridgeInvoke<{ ok?: boolean; file?: string; error?: string }>(
        "export_session_markdown",
        { session_id: node.id }
      );
      if (result?.file) {
        alert(`Exported to: ${result.file}`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition-colors hover:border-nd-accent-primary/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 text-nd-accent-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="truncate font-semibold text-nd-text-primary" title={displayName}>
              {displayName}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-nd-text-muted/70">
              <span className="shrink-0">{formattedDate}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">{node.message_count} messages</span>
            </div>
            {node.preview && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-nd-text-muted">
                {node.preview}
              </p>
            )}
            {error && <p className="mt-2 text-xs text-nd-accent-error">{error}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
          <button
            type="button"
            onClick={() => {
              setRenameValue(node.name || "");
              setRenameOpen(true);
            }}
            disabled={loading}
            className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-accent-primary disabled:opacity-50"
            aria-label="Rename Session"
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-accent-primary disabled:opacity-50"
            aria-label="Export Markdown"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-accent-error/20 hover:text-nd-accent-error disabled:opacity-50"
            aria-label="Delete Session"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
    <Modal
      open={renameOpen}
      onClose={() => setRenameOpen(false)}
      title="Rename Session"
      description="Update the saved session label."
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={() => setRenameOpen(false)}
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleRename()}
            disabled={!renameValue.trim() || loading}
            className="rounded-xl border border-nd-accent-primary/25 bg-nd-accent-primary/10 px-3 py-2 text-sm font-semibold text-nd-accent-primary disabled:opacity-50"
          >
            Save
          </button>
        </>
      }
    >
      <input
        value={renameValue}
        onChange={(event) => setRenameValue(event.target.value)}
        placeholder="Session name"
        className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/60 px-3 py-2 text-sm text-nd-text-primary outline-none"
      />
    </Modal>
    </>
  );
}
