import { useEffect } from "react";
import { BookOpen, FolderOpen, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Panel } from "../../../components/primitives/Panel";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";

export function KnowledgeSettingsPanel() {
  const {
    indexedDirs,
    kbBusy,
    kbStatus,
    loadKbDirs,
    handleRemoveKbDir,
    handleReindexAll,
  } = useKnowledgeBase();

  useEffect(() => {
    if (indexedDirs === null && kbBusy === null) {
      void loadKbDirs();
    }
  }, [indexedDirs, kbBusy, loadKbDirs]);

  return (
    <div id="sp-knowledge" className="settings-panel active space-y-4">
      <Panel eyebrow="Knowledge Base" title="Indexed Directories">
        <div className="space-y-3 p-4">
          <p className="text-xs text-nd-text-muted leading-5">
            Directories indexed into the vector memory via the Docs tab. Click{" "}
            <strong className="text-nd-text-primary">Re-index All</strong> to re-chunk all
            directories with fresh embeddings (monitors via WebSocket{" "}
            <code className="font-mono text-nd-accent-primary">doc_index_done</code> event).
          </p>

          {kbStatus && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                kbStatus.ok
                  ? "border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success"
                  : "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error"
              }`}
            >
              {kbStatus.text}
            </div>
          )}

          {kbBusy === "load" ? (
            <div className="flex items-center gap-2 py-4 text-xs text-nd-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading indexed directories…
            </div>
          ) : !indexedDirs || indexedDirs.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No indexed directories"
              description="Use Settings → Docs or the index_directory command to add directories to the vector memory."
            />
          ) : (
            <ul className="divide-y divide-nd-text-muted/10 rounded-xl border border-nd-text-muted/15 overflow-hidden">
              {indexedDirs.map((d) => (
                <li key={d.path} className="flex items-center gap-3 bg-nd-surface/30 px-4 py-3">
                  <FolderOpen
                    className="h-4 w-4 shrink-0 text-nd-accent-primary/70"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-mono text-xs text-nd-text-primary"
                      title={d.path}
                    >
                      {d.path}
                    </p>
                    <p className="text-[10px] text-nd-text-muted mt-0.5">
                      {d.doc_count} chunk{d.doc_count !== 1 ? "s" : ""} indexed
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="xs"
                    icon={Trash2}
                    disabled={kbBusy !== null}
                    aria-label={`Remove ${d.path} from index list`}
                    onClick={() => void handleRemoveKbDir(d.path)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCcw}
              disabled={kbBusy !== null}
              onClick={() => void loadKbDirs()}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={kbBusy === "reindex" ? Loader2 : BookOpen}
              disabled={kbBusy !== null || !indexedDirs?.length}
              onClick={() => void handleReindexAll()}
            >
              Re-index All
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
