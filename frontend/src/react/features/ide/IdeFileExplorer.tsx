import { FolderOpen } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { FileEntry, getLangIcon, getLanguage } from "./ideUtils";

interface IdeFileExplorerProps {
  files: FileEntry[];
  currentPath: string;
  activeTab: string | null;
  onNavigateUp: () => void;
  onLoadDirectory: (path: string) => void;
  onOpenFile: (path: string, name: string) => void;
}

export function IdeFileExplorer({
  files,
  currentPath,
  activeTab,
  onNavigateUp,
  onLoadDirectory,
  onOpenFile,
}: IdeFileExplorerProps) {
  return (
    <Panel
      className="flex w-52 flex-col"
      eyebrow="Explorer"
      title="Workspace"
      bodyClassName="flex flex-1 flex-col min-h-0 p-0"
    >
      <div className="min-h-0 flex-1 overflow-auto space-y-0.5">
        {currentPath && (
          <Button
            variant="ghost"
            size="xs"
            fullWidth
            icon={FolderOpen}
            className="justify-start"
            onClick={onNavigateUp}
          >
            ..
          </Button>
        )}
        <div className="px-2 py-1 text-[10px] text-nd-text-muted/60 truncate">
          {currentPath || "workspace"}
        </div>
        {files.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-nd-text-muted/50 italic">No files</div>
        )}
        {files.map((f) => (
          <button
            key={f.path}
            type="button"
            onClick={() => (f.is_dir ? onLoadDirectory(f.path) : onOpenFile(f.path, f.name))}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 ${
              activeTab === f.path
                ? "bg-nd-accent-primary/10 text-nd-accent-primary"
                : "text-nd-text-muted hover:bg-nd-surface-secondary"
            }`}
          >
            {f.is_dir ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <span className="shrink-0 text-xs">{getLangIcon(getLanguage(f.name))}</span>
            )}
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
