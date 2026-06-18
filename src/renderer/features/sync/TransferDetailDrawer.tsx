import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { StatusChip } from "../../components/primitives/StatusChip";
import { listenBridge } from "../../services/bridgeAdapter";

interface Transfer {
  id: string;
  fileName: string;
  fileSizeMb: number;
  direction: "send" | "receive";
  peer: string;
  status: "queued" | "active" | "completed" | "error";
  progressPct: number;
  speedMbps?: number;
  etaSeconds?: number;
  sha256?: string;
}

interface TransferDetailDrawerProps {
  transfer: Transfer | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_TONE: Record<Transfer["status"], "success" | "error" | "warning" | "info"> = {
  queued: "info",
  active: "warning",
  completed: "success",
  error: "error",
};

export function TransferDetailDrawer({ transfer, open, onClose }: TransferDetailDrawerProps) {
  const [live, setLive] = useState<Transfer | null>(transfer);

  useEffect(() => {
    setLive(transfer);
  }, [transfer]);

  useEffect(() => {
    if (!open || !transfer) return;
    const unsub = listenBridge("transfer:progress", (data: unknown) => {
      const ev = data as {
        id: string;
        progressPct: number;
        speedMbps: number;
        etaSeconds: number;
      };
      if (ev.id === transfer.id) {
        setLive((prev) => (prev ? { ...prev, ...ev, status: "active" } : prev));
      }
    });
    const unsub2 = listenBridge("transfer:complete", (data: unknown) => {
      const ev = data as { id: string; sha256: string };
      if (ev.id === transfer.id) {
        setLive((prev) =>
          prev
            ? { ...prev, status: "completed", progressPct: 100, sha256: ev.sha256 }
            : prev
        );
      }
    });
    const unsub3 = listenBridge("transfer:error", (data: unknown) => {
      const ev = data as { id: string };
      if (ev.id === transfer.id) {
        setLive((prev) => (prev ? { ...prev, status: "error" } : prev));
      }
    });
    return () => {
      unsub?.();
      unsub2?.();
      unsub3?.();
    };
  }, [open, transfer]);

  if (!open || !live) return null;

  const etaMins = live.etaSeconds != null ? Math.ceil(live.etaSeconds / 60) : null;

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
          aria-label={`Transfer: ${live.fileName}`}
          className="relative z-10 flex h-full w-full max-w-[480px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Transfer Detail
              </p>
              <h2 className="mt-1 truncate font-mono text-lg font-black text-nd-text-primary">
                {live.fileName}
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close" />
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* Status */}
            <div className="flex items-center gap-2">
              <StatusChip tone={STATUS_TONE[live.status]} size="sm">
                {live.status}
              </StatusChip>
              <span className="text-sm capitalize text-nd-text-muted">{live.direction}</span>
            </div>

            {/* Progress */}
            {(live.status === "active" || live.status === "queued") && (
              <section aria-label="Transfer progress">
                <div
                  className="h-2 overflow-hidden rounded-full bg-nd-surface-secondary"
                  role="progressbar"
                  aria-valuenow={live.progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${live.progressPct}% transferred`}
                >
                  <div
                    className="h-full bg-nd-accent-primary transition-all duration-300"
                    style={{ width: `${live.progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-nd-text-muted">
                  <span>{live.progressPct}%</span>
                  {live.speedMbps != null && <span>{live.speedMbps.toFixed(1)} MB/s</span>}
                  {etaMins != null && <span>~{etaMins}m left</span>}
                </div>
              </section>
            )}

            {/* Completed integrity */}
            {live.status === "completed" && live.sha256 && (
              <section
                aria-label="Transfer integrity"
                className="rounded-2xl border border-nd-status-success/30 bg-nd-status-success/5 p-4"
              >
                <div className="flex items-center gap-2 text-nd-status-success">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  <span className="font-bold">Transfer complete — SHA-256 verified</span>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-nd-text-muted">{live.sha256}</p>
              </section>
            )}

            {/* Metadata */}
            <section aria-label="Transfer metadata">
              <dl className="space-y-3">
                {[
                  { label: "File", value: live.fileName },
                  { label: "Size", value: `${live.fileSizeMb.toFixed(1)} MB` },
                  { label: "Peer", value: live.peer },
                  { label: "Direction", value: live.direction },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-3">
                    <dt className="text-sm text-nd-text-muted">{row.label}</dt>
                    <dd className="font-mono text-sm text-nd-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
