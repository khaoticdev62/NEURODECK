import { Download } from "lucide-react";
import type { DownloadItem } from "../types";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import { BrowserOverlay } from "./BrowserOverlay";

interface DownloadsPanelProps {
  showDownloadsMenu: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onRefresh: () => void;
}

export function DownloadsPanel({
  showDownloadsMenu,
  onClose,
  downloads,
  onRefresh,
}: DownloadsPanelProps) {
  return (
    <BrowserOverlay
      active={showDownloadsMenu}
      onClose={onClose}
      title="Downloads Tracker"
      icon={Download}
      className="absolute right-4 top-24 z-[var(--z-dropdown)] w-96"
      ariaLabel="Downloads tracker"
    >
      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
        {downloads.length === 0 ? (
          <div className="text-xs text-nd-text-muted text-center py-8">
            No active or recent downloads.
          </div>
        ) : (
          downloads.map((d) => {
            const percent = d.totalBytes > 0 ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0;
            return (
              <div
                key={d.id}
                className="p-2.5 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 text-xs flex flex-col gap-2"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold truncate text-nd-text-primary">
                    {d.filename}
                  </span>
                  <Badge
                    tone={
                      d.state === "completed"
                        ? "success"
                        : d.state === "progressing"
                          ? "accent"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {d.state}
                  </Badge>
                </div>
                {d.state === "progressing" && (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 w-full bg-nd-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nd-accent-primary transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-nd-text-muted">
                      <span>{percent}% Completed</span>
                      <span>
                        {(d.receivedBytes / 1024 / 1024).toFixed(1)} /{" "}
                        {(d.totalBytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end mt-1">
                  {d.state === "progressing" && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() =>
                        window.neurodeck?.browser
                          ?.cancelDownload(d.id)
                          .then(() => onRefresh())
                      }
                    >
                      Cancel
                    </Button>
                  )}
                  {d.state === "completed" && (
                    <>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => window.neurodeck?.browser?.openDownload(d.id)}
                      >
                        Open File
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => window.neurodeck?.browser?.showDownload(d.id)}
                      >
                        Show in Folder
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </BrowserOverlay>
  );
}
