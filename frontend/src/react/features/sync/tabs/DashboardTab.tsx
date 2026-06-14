import { ArrowDown, ArrowUp, RefreshCw, X, RotateCcw } from 'lucide-react';
import { MetricCard } from '../../../components/primitives/MetricCard';
import { StatusChip } from '../../../components/primitives/StatusChip';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import type { FileTransfer, TransferPeer } from '../../../services/bridgeAdapter';

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
  peers: TransferPeer[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRefresh: () => void;
}

export function DashboardTab({ transfers, peers, onCancel, onRetry, onRefresh }: Props) {
  const active = transfers.filter((t) => t.status === 'Transferring').length;
  const completed = transfers.filter((t) => t.status === 'Completed').length;

  return (
    <Panel
      eyebrow="Overview"
      title="Sync Dashboard"
      action={
        <IconButton
          type="button"
          size="md"
          variant="subtle"
          aria-label="Refresh transfers"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      }
      className="h-full"
    >
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Active" value={active} icon={RefreshCw} hint="In-progress transfers" />
          <MetricCard label="Peers" value={peers.length} icon={ArrowUp} hint="Discovered LAN peers" />
          <MetricCard label="Completed" value={completed} icon={ArrowDown} hint="Finished this session" />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
          Transfer Queue
        </h3>

        {transfers.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No transfers"
            description="Send a file or wait for an incoming request."
            compact
          />
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {transfers.map((t) => {
              const pct = Math.min(100, Math.round((t.progress / Math.max(t.size, 1)) * 100));
              const isTransferring = t.status === 'Transferring';
              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 transition-colors duration-fast hover:border-nd-accent-primary/25"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-nd-text-muted" aria-hidden="true">
                      {t.direction === 'Incoming' ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nd-text-primary" title={t.filename}>
                        {t.filename}
                      </p>
                      <p className="text-xs text-nd-text-muted">
                        {t.direction} · {t.peer_name || t.peer_ip} · {formatBytes(t.size)}
                      </p>
                      {isTransferring && (
                        <div
                          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-nd-surface-tertiary/60"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Transfer progress for ${t.filename}`}
                        >
                          <div
                            className="h-full rounded-full bg-nd-accent-primary transition-all duration-normal motion-reduce:transition-none"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusChip tone={transferTone(t.status)} size="sm" pulse={isTransferring}>
                        {t.status}
                      </StatusChip>
                      {isTransferring && (
                        <IconButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Cancel transfer of ${t.filename}`}
                          onClick={() => onCancel(t.id)}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      )}
                      {(t.status === 'Failed' || t.status === 'Cancelled') && t.direction === 'Outgoing' && (
                        <IconButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Retry transfer of ${t.filename}`}
                          onClick={() => onRetry(t.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
