import { useEffect, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { StatusChip } from "../../components/primitives/StatusChip";
import { listenBridge } from "../../services/bridgeAdapter";

interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  sizeMb?: number;
  progressPct: number;
  status: "queued" | "downloading" | "complete" | "error";
  error?: string;
  savedPath?: string;
}

interface DownloadManagerProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_TONE: Record<DownloadItem["status"], "success" | "error" | "warning" | "info"> = {
  queued: "info",
  downloading: "warning",
  complete: "success",
  error: "error",
};

export function DownloadManager({ open, onClose }: DownloadManagerProps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const unsub1 = listenBridge("download:progress", (data: unknown) => {
      const ev = data as {
        id: string;
        filename: string;
        url: string;
        progressPct: number;
        sizeMb?: number;
      };
      setDownloads((prev) => {
        const exists = prev.find((d) => d.id === ev.id);
        if (exists) {
          return prev.map((d) =>
            d.id === ev.id ? { ...d, progressPct: ev.progressPct, status: "downloading" } : d
          );
        }
        return [...prev, { ...ev, status: "downloading" }];
      });
    });
    const unsub2 = listenBridge("download:complete", (data: unknown) => {
      const ev = data as { id: string; savedPath: string };
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === ev.id
            ? { ...d, status: "complete", progressPct: 100, savedPath: ev.savedPath }
            : d
        )
      );
    });
    const unsub3 = listenBridge("download:error", (data: unknown) => {
      const ev = data as { id: string; error: string };
      setDownloads((prev) =>
        prev.map((d) => (d.id === ev.id ? { ...d, status: "error", error: ev.error } : d))
      );
    });
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [open]);

  const handleClear = (id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  if (!open) return null;

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
          aria-label="Download Manager"
          className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-nd-border-subtle p-5">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-nd-accent-primary" aria-hidden />
              <h2 className="font-black text-nd-text-primary">Downloads</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              aria-label="Close downloads"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {downloads.length === 0 ? (
              <EmptyState
                icon={Download}
                title="No downloads"
                description="Downloads from the browser appear here."
                variant="compact"
              />
            ) : (
              <div className="flex flex-col gap-3" role="list" aria-label="Downloads">
                {downloads.map((dl) => (
                  <div
                    key={dl.id}
                    role="listitem"
                    className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-nd-text-primary">
                          {dl.filename}
                        </p>
                        {dl.sizeMb != null && (
                          <p className="text-xs text-nd-text-muted">{dl.sizeMb.toFixed(1)} MB</p>
                        )}
                        {dl.savedPath && (
                          <p className="mt-0.5 truncate font-mono text-xs text-nd-text-muted">
                            {dl.savedPath}
                          </p>
                        )}
                        {dl.error && (
                          <p className="mt-0.5 text-xs text-nd-status-error">{dl.error}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <StatusChip tone={STATUS_TONE[dl.status]} size="sm">
                          {dl.status}
                        </StatusChip>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleClear(dl.id)}
                          aria-label={`Remove ${dl.filename} from list`}
                        />
                      </div>
                    </div>

                    {dl.status === "downloading" && (
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-surface-secondary"
                        role="progressbar"
                        aria-valuenow={dl.progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${dl.progressPct}%`}
                      >
                        <div
                          className="h-full bg-nd-accent-primary transition-all"
                          style={{ width: `${dl.progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {downloads.length > 0 && (
            <div className="border-t border-nd-border-subtle px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDownloads((prev) => prev.filter((d) => d.status === "downloading"))
                }
                aria-label="Clear completed downloads"
              >
                Clear completed
              </Button>
            </div>
          )}
        </div>
      </FocusTrapContainer>
    </div>
  );
}
