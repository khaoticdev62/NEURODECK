import { useState } from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { ConfirmDialog } from '../../../components/primitives/ConfirmDialog';
import { StatusChip } from '../../../components/primitives/StatusChip';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import { Button } from '../../../components/primitives/Button';
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
  return 'warning';
}

interface Props {
  transfers: FileTransfer[];
  onRetry: (id: string) => void;
  onClearDone: () => void;
}

export function HistoryTab({ transfers, onRetry, onClearDone }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);

  const history = transfers.filter((t) =>
    ['Completed', 'Failed', 'Cancelled', 'Rejected'].includes(t.status)
  );

  const handleClear = async () => {
    await neurodeckApi.transfer.clearHistory();
    setConfirmClear(false);
    onClearDone();
  };

  return (
    <Panel
      eyebrow="History"
      title="Transfer History"
      action={
        history.length > 0 ? (
          <Button
            type="button"
            size="xs"
            variant="danger"
            icon={Trash2}
            onClick={() => setConfirmClear(true)}
          >
            Clear
          </Button>
        ) : undefined
      }
      className="h-full"
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto">
        {history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No history yet"
            description="Completed, failed, and cancelled transfers appear here."
            compact
          />
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {history.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3 transition-colors duration-fast hover:border-nd-accent-primary/25"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nd-text-primary">{t.filename}</p>
                  <p className="text-xs text-nd-text-muted">
                    {t.direction} · {t.peer_name || t.peer_ip} · {formatBytes(t.size)}
                  </p>
                </div>
                <StatusChip tone={transferTone(t.status)} size="sm">
                  {t.status}
                </StatusChip>
                {(t.status === 'Failed' || t.status === 'Cancelled') && t.direction === 'Outgoing' && (
                  <IconButton
                    type="button"
                    size="md"
                    variant="subtle"
                    aria-label={`Retry ${t.filename}`}
                    onClick={() => onRetry(t.id)}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear transfer history?"
        message="This removes all completed, failed, and cancelled transfer records. Active transfers are not affected."
        confirmLabel="Clear History"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => void handleClear()}
        onCancel={() => setConfirmClear(false)}
      />
    </Panel>
  );
}
