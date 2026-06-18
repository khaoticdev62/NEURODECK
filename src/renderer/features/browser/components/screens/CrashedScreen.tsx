import type { MouseEvent } from "react";
import { ExternalLink, Terminal } from "lucide-react";
import type { BrowserTab } from "../../types";
import { Button } from "../../../../components/primitives/Button";

interface CrashedScreenProps {
  activeTab: BrowserTab;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
}

export function CrashedScreen({ activeTab, onCloseTab, onRefresh }: CrashedScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <div className="h-12 w-12 rounded-full bg-nd-accent-warning/10 flex items-center justify-center border border-nd-accent-warning/25 animate-pulse">
          <Terminal className="h-6 w-6 text-nd-accent-warning" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-nd-text-primary">
            Renderer Process Crashed
          </h3>
          <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
            The sandboxed web page process has crashed. This can happen if the site uses
            excessive memory resources.
          </p>
        </div>

        <div className="w-full rounded-xl border border-nd-accent-warning/20 bg-nd-accent-warning/5 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
          <div>
            <span className="text-nd-accent-warning">Status:</span> PROCESS_CRASHED
          </div>
          <div>
            <span className="text-nd-accent-warning">Consecutive Crashes:</span>{" "}
            {activeTab.crashCount || 1}
          </div>
          <div>
            <span className="text-nd-accent-warning">Location:</span> {activeTab.url}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e: MouseEvent) => onCloseTab(activeTab.id, e)}
          >
            Close Tab
          </Button>
          <Button variant="primary" size="sm" onClick={onRefresh}>
            Recover Tab
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={ExternalLink}
            iconPosition="right"
            onClick={() => window.electronAPI?.openExternal(activeTab.url)}
          >
            Open Externally
          </Button>
        </div>
      </div>
    </div>
  );
}
