import { InboxIcon, FolderOpen } from "lucide-react";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Panel } from "../../../components/primitives/Panel";
import { Badge } from "../../../components/primitives/Badge";
import type { FileTransfer } from "../../../services/bridgeAdapter";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

interface Props {
  inboxPath: string;
  transfers: FileTransfer[];
}

export function InboxTab({ inboxPath, transfers }: Props) {
  const received = transfers.filter((t) => t.direction === "Incoming" && t.status === "Completed");
  const pending = transfers.filter((t) => t.direction === "Incoming" && t.status === "Pending");

  return (
    <Panel eyebrow="Inbox" title="Incoming Transfers" className="h-full">
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        {/* Pending incoming (shown but respond happens via the root ConfirmDialog) */}
        {pending.length > 0 && (
          <section aria-label="Pending incoming transfers">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-accent-warning">
              Awaiting Your Decision
            </h3>
            <ul role="list" className="flex flex-col gap-2">
              {pending.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-nd-accent-warning/25 bg-nd-accent-warning/5 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-accent-warning/20 bg-nd-accent-warning/10">
                      <InboxIcon className="h-4 w-4 text-nd-accent-warning" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nd-text-primary">
                        {t.filename}
                      </p>
                      <p className="text-xs text-nd-text-muted">
                        {formatBytes(t.size)} from {t.peer_name || t.peer_ip}
                      </p>
                      <p className="mt-1 text-xs text-nd-text-muted">
                        A confirmation dialog should have appeared. If not, dismiss and try again.
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Inbox path */}
        <section aria-label="Received files location">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Receive Folder
          </h3>
          <div className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
              <FolderOpen className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
            </div>
            <p className="break-all text-xs text-nd-text-secondary font-mono">
              {inboxPath || "Loading…"}
            </p>
          </div>
        </section>

        {/* Received files */}
        <section aria-label="Received files" className="min-h-0 flex-1">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Received This Session
          </h3>
          {received.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="No files received yet"
              description="Accepted incoming transfers will appear here."
              compact
            />
          ) : (
            <ul role="list" className="flex flex-col gap-2">
              {received.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-nd-accent-success/20 bg-nd-accent-success/5 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-accent-success/20 bg-nd-accent-success/10">
                    <InboxIcon className="h-4 w-4 text-nd-accent-success" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text-primary">
                      {t.filename}
                    </p>
                    <p className="text-xs text-nd-text-muted">
                      {formatBytes(t.size)} from {t.peer_name || t.peer_ip}
                    </p>
                  </div>
                  <Badge tone="success" variant="outline" size="sm">
                    Received
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
