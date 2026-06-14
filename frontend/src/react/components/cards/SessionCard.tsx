import { MessageSquareText, Trash2, Edit2, Download } from "lucide-react";
import { Modal } from "../../../design-system";
import { TextInput } from "../../../design-system";
import { Button } from "../../../design-system";
import { IconButton } from "../../../design-system";
import { Panel } from "../../../design-system";
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
      <Panel className="transition hover:border-[rgba(var(--nd-cyan-rgb),0.25)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] text-[var(--nd-accent-agent)]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="truncate font-semibold text-[var(--nd-text-primary)]" title={displayName}>
                {displayName}
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--nd-text-muted)]">
                <span className="shrink-0">{formattedDate}</span>
                <span className="shrink-0">•</span>
                <span className="shrink-0">{node.message_count} messages</span>
              </div>
              {node.preview && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--nd-text-muted)]">
                  {node.preview}
                </p>
              )}
              {error && <p className="mt-2 text-xs text-[var(--nd-accent-error)]">{error}</p>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
            <IconButton
              label="Rename Session"
              icon={<Edit2 className="h-4 w-4" aria-hidden="true" />}
              variant="default"
              size="md"
              disabled={loading}
              onClick={() => {
                setRenameValue(node.name || "");
                setRenameOpen(true);
              }}
            />
            <IconButton
              label="Export Markdown"
              icon={<Download className="h-4 w-4" aria-hidden="true" />}
              variant="default"
              size="md"
              disabled={loading}
              onClick={handleExport}
            />
            <IconButton
              label="Delete Session"
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              variant="danger"
              size="md"
              disabled={loading}
              onClick={handleDelete}
            />
          </div>
        </div>
      </Panel>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename Session"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleRename()}
              disabled={!renameValue.trim() || loading}
            >
              Save
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[var(--nd-text-secondary)]">
          Update the saved session label.
        </p>
        <TextInput
          value={renameValue}
          onChange={setRenameValue}
          placeholder="Session name"
          className="w-full"
        />
      </Modal>
    </>
  );
}
