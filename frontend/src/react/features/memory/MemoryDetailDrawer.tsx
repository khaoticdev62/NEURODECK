import { useCallback } from "react";
import { Pin, Trash2, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";

interface MemoryRecord {
  id: string;
  content: string;
  source?: string;
  createdAt: string;
  pinned?: boolean;
  hasEmbedding?: boolean;
  tags?: string[];
}

interface MemoryDetailDrawerProps {
  record: MemoryRecord | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onPinToggled: (id: string, pinned: boolean) => void;
}

export function MemoryDetailDrawer({
  record,
  open,
  onClose,
  onDeleted,
  onPinToggled,
}: MemoryDetailDrawerProps) {
  const handleDelete = useCallback(async () => {
    if (!record) return;
    try {
      await neurodeckApi.memory.delete(record.id);
      onDeleted(record.id);
      onClose();
    } catch {
      /* toast handles */
    }
  }, [record, onDeleted, onClose]);

  const handlePinToggle = useCallback(async () => {
    if (!record) return;
    try {
      await neurodeckApi.memory.pin?.(record.id, !record.pinned);
      onPinToggled(record.id, !record.pinned);
    } catch {
      /* toast handles */
    }
  }, [record, onPinToggled]);

  if (!open || !record) return null;

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
          aria-label="Memory Record Detail"
          className="relative z-10 flex h-full w-full max-w-[480px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Memory Record
              </p>
              <h2 className="mt-1 text-lg font-black text-nd-text-primary">Detail</h2>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                icon={Pin}
                onClick={() => void handlePinToggle()}
                aria-label={record.pinned ? "Unpin memory" : "Pin memory"}
                aria-pressed={record.pinned}
                className={record.pinned ? "text-nd-accent-primary" : ""}
              />
              <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close" />
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Content */}
            <section aria-label="Memory content">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                Content
              </p>
              <div className="break-words whitespace-pre-wrap rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 text-sm text-nd-text-secondary">
                {record.content}
              </div>
            </section>

            {/* Metadata */}
            <section aria-label="Memory metadata">
              <dl className="space-y-3">
                <div className="flex justify-between gap-3">
                  <dt className="text-sm text-nd-text-muted">Created</dt>
                  <dd className="text-sm text-nd-text-primary">
                    {new Date(record.createdAt).toLocaleString()}
                  </dd>
                </div>
                {record.source && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-sm text-nd-text-muted">Source</dt>
                    <dd className="text-sm text-nd-text-primary">{record.source}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-sm text-nd-text-muted">Embedding</dt>
                  <dd>
                    <StatusChip tone={record.hasEmbedding ? "success" : "info"} size="sm">
                      {record.hasEmbedding ? "Indexed" : "Not indexed"}
                    </StatusChip>
                  </dd>
                </div>
                {record.pinned && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-sm text-nd-text-muted">Pinned</dt>
                    <dd>
                      <StatusChip tone="info" size="sm">
                        Pinned
                      </StatusChip>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Tags */}
            {record.tags && record.tags.length > 0 && (
              <section aria-label="Memory tags">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {record.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-nd-border-subtle bg-nd-surface-secondary/40 px-2 py-0.5 text-xs text-nd-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Embedding warning */}
            {!record.hasEmbedding && (
              <div className="rounded-xl border border-nd-status-warning/30 bg-nd-status-warning/5 p-3 text-xs text-nd-status-warning">
                No embedding — this record is excluded from RAG context search. Facts added via
                memory_add_fact have empty embedding vectors.
              </div>
            )}
          </div>

          <div className="border-t border-nd-border-subtle p-4">
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => void handleDelete()}
              fullWidth
            >
              Delete Memory Record
            </Button>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
