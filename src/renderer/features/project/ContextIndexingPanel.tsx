import { useEffect, useState } from "react";
import { CheckCircle2, FileSearch, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { listenBridge } from "../../services/bridgeAdapter";

interface IndexingProgress {
  current: number;
  total: number;
  currentFile?: string;
  status: "running" | "complete" | "error";
  errors?: string[];
}

interface ContextIndexingPanelProps {
  projectPath: string;
  open: boolean;
  onClose: () => void;
}

export function ContextIndexingPanel({ projectPath, open, onClose }: ContextIndexingPanelProps) {
  const [progress, setProgress] = useState<IndexingProgress>({
    current: 0,
    total: 0,
    status: "running",
  });

  useEffect(() => {
    if (!open) return;
    setProgress({ current: 0, total: 0, status: "running" });

    const unsub1 = listenBridge("index:progress", (data: unknown) => {
      const ev = data as { current: number; total: number; currentFile?: string };
      setProgress((prev) => ({ ...prev, ...ev, status: "running" }));
    });
    const unsub2 = listenBridge("index:complete", (data: unknown) => {
      const ev = data as { total: number; errors?: string[] };
      setProgress({ current: ev.total, total: ev.total, status: "complete", errors: ev.errors });
    });
    const unsub3 = listenBridge("index:error", (data: unknown) => {
      const ev = data as { error: string };
      setProgress((prev) => ({ ...prev, status: "error", errors: [ev.error] }));
    });

    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [open]);

  if (!open) return null;

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isDone = progress.status === "complete" || progress.status === "error";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <div className="absolute inset-0 bg-nd-bg/60 backdrop-blur-sm" onClick={isDone ? onClose : undefined} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Context Indexing"
        aria-live="polite"
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 shadow-2xl backdrop-blur sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-nd-border-subtle px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-nd-accent-primary" aria-hidden />
            <h2 className="font-black text-nd-text-primary">Indexing Project</h2>
          </div>
          {isDone && (
            <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close indexing panel" />
          )}
        </div>

        <div className="p-5 space-y-4">
          <p className="truncate font-mono text-xs text-nd-text-muted">{projectPath}</p>

          <div
            className="h-2 overflow-hidden rounded-full bg-nd-surface-secondary"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Indexing ${pct}%`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                progress.status === "error"
                  ? "bg-nd-status-error"
                  : progress.status === "complete"
                  ? "bg-nd-status-success"
                  : "bg-nd-accent-primary animate-pulse"
              }`}
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-nd-text-muted">
            <span>
              {progress.current} / {progress.total || "?"} files
            </span>
            <span>{pct}%</span>
          </div>

          {progress.currentFile && progress.status === "running" && (
            <p className="truncate font-mono text-xs text-nd-text-muted">
              Indexing: {progress.currentFile}
            </p>
          )}

          {progress.status === "complete" && (
            <div className="flex items-center gap-2 text-nd-status-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span className="text-sm font-medium">Indexing complete</span>
            </div>
          )}

          {progress.status === "error" && progress.errors && (
            <div className="rounded-xl border border-nd-status-error/30 bg-nd-status-error/5 p-3">
              {progress.errors.map((err, i) => (
                <p key={i} className="text-xs text-nd-status-error">{err}</p>
              ))}
            </div>
          )}

          {isDone && (
            <Button variant="secondary" size="sm" onClick={onClose} fullWidth>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
