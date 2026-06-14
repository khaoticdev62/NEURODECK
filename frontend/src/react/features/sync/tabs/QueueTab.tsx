import { ArrowDown, ArrowUp, ListChecks, RotateCcw, Trash2, X } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { StatusChip } from '../../../components/primitives/StatusChip';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { FileTransfer } from '../../../services/bridgeAdapter';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function transferTone(status: FileTransfer['status']): 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Completed') return 'success';
  if (status === 'Failed' || status === 'Cancelled' || status === 'Rejected') return 'error';
  if (status === 'Transferring') return 'info';
  return 'warning';
}

interface Props {
  transfers: FileTransfer[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearDone: () => void;
  onError: (msg: string) => void;
}

export function QueueTab({ transfers, onCancel, onRetry, onClearDone, onError }: Props) {
  const queue = transfers.filter((t) => ['Pending', 'Accepted', 'Transferring', 'Failed', 'Cancelled'].includes(t.status));
  const completedCount = transfers.filter((t) => ['Completed', 'Failed', 'Cancelled', 'Rejected'].includes(t.status)).length;

  const handleClearCompleted = async () => {
    try {
      await neurodeckApi.transfer.clearHistory(false);
      onClearDone();
    } catch (e) {
      onError(`Clear queue history failed: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Transfer Queue</h3>
          <p className="mt-1 text-xs text-nd-text-muted">
            Pause/resume is shown as protocol pending; cancel and retry are live backend actions.
          </p>
        </div>
        {completedCount > 0 && (
          <button
            type="button"
            onClick={() => void handleClearCompleted()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-nd-text-muted hover:bg-nd-danger/10 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear completed
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <EmptyState icon={ListChecks} title="Queue is empty" description="Active, pending, failed, and retryable transfers appear here." />
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {queue.map((t) => {
            const pct = Math.min(100, Math.round((t.progress / Math.max(t.size, 1)) * 100));
            return (
              <li key={t.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-nd-text-muted" aria-hidden="true">
                    {t.direction === 'Incoming' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-nd-text" title={t.filename}>{t.filename}</p>
                      <StatusChip tone={transferTone(t.status)} size="sm">{t.status}</StatusChip>
                    </div>
                    <p className="mt-0.5 text-xs text-nd-text-muted">
                      {t.direction} · {t.peer_name || t.peer_ip} · {formatBytes(t.progress)} / {formatBytes(t.size)}
                    </p>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-nd-surface"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Transfer progress for ${t.filename}`}
                    >
                      <div className="h-full rounded-full bg-nd-accent transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {t.status === 'Transferring' && (
                      <button
                        type="button"
                        onClick={() => onCancel(t.id)}
                        aria-label={`Cancel transfer of ${t.filename}`}
                        className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-danger/10 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    {(t.status === 'Failed' || t.status === 'Cancelled') && t.direction === 'Outgoing' && (
                      <button
                        type="button"
                        onClick={() => onRetry(t.id)}
                        aria-label={`Retry ${t.filename}`}
                        className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-accent/10 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
