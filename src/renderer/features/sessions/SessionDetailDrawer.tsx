import { useCallback, useState } from "react";
import { Archive, Download, Trash2, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";

interface SessionMeta {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  persona?: string;
  archived?: boolean;
  model?: string;
}

interface SessionDetailDrawerProps {
  session: SessionMeta | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onArchived: (id: string) => void;
}

export function SessionDetailDrawer({
  session,
  open,
  onClose,
  onDeleted,
  onArchived,
}: SessionDetailDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = useCallback(async () => {
    if (!session) return;
    try {
      await (neurodeckApi.sessions as unknown as { exportMarkdown?: (a: { session_id: string; format: string }) => Promise<unknown> }).exportMarkdown?.({ session_id: session.id, format: "markdown" });
    } catch {
      /* toast handles */
    }
  }, [session]);

  const handleDelete = useCallback(async () => {
    if (!session) return;
    try {
      await neurodeckApi.sessions.delete(session.id);
      onDeleted(session.id);
      onClose();
    } catch {
      /* toast handles */
    } finally {
      setShowDeleteConfirm(false);
    }
  }, [session, onDeleted, onClose]);

  const handleArchive = useCallback(async () => {
    if (!session) return;
    try {
      await (
        neurodeckApi.sessions as { archiveSession?: (id: string) => Promise<unknown> }
      ).archiveSession?.(session.id);
      onArchived(session.id);
      onClose();
    } catch {
      /* toast handles */
    }
  }, [session, onArchived, onClose]);

  if (!open || !session) return null;

  const displayTitle = session.title ?? "Untitled session";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-nd-surface-bg/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Session: ${displayTitle}`}
          className="relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Session Detail
              </p>
              <h2 className="mt-1 text-lg font-black text-nd-text-primary">{displayTitle}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              aria-label="Close session detail"
            />
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* Metadata */}
            <section aria-label="Session metadata">
              <dl className="space-y-3">
                {[
                  { label: "Created", value: new Date(session.createdAt).toLocaleString() },
                  { label: "Updated", value: new Date(session.updatedAt).toLocaleString() },
                  { label: "Messages", value: String(session.messageCount) },
                  { label: "Persona", value: session.persona ?? "Default" },
                  ...(session.model ? [{ label: "Model", value: session.model }] : []),
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <dt className="text-sm text-nd-text-muted">{row.label}</dt>
                    <dd className="text-sm font-medium text-nd-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {session.archived && (
                <StatusChip tone="info" size="sm" className="mt-3">
                  Archived
                </StatusChip>
              )}
            </section>

            <hr className="border-nd-border-subtle" />

            {/* Actions */}
            <section aria-label="Session actions">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Actions
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() => void handleExport()}
                  fullWidth
                >
                  Export as Markdown
                </Button>
                {!session.archived && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Archive}
                    onClick={() => void handleArchive()}
                    fullWidth
                  >
                    Archive Session
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setShowDeleteConfirm(true)}
                  fullWidth
                >
                  Delete Session
                </Button>
              </div>
            </section>
          </div>
        </div>
      </FocusTrapContainer>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Session"
        message={`Permanently delete "${displayTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
