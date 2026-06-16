import { ExternalLink, Lock } from "lucide-react";
import type { BrowserTab } from "../../types";
import { Button } from "../../../../components/primitives/Button";

interface BlockedScreenProps {
  activeTab: BrowserTab;
  onGoBack: () => void;
}

export function BlockedScreen({ activeTab, onGoBack }: BlockedScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <div className="h-12 w-12 rounded-full bg-nd-accent-error/10 flex items-center justify-center border border-nd-accent-error/25">
          <Lock className="h-6 w-6 text-nd-accent-error" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-nd-text-primary">
            Website Access Blocked
          </h3>
          <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
            Access to this URL has been blocked in accordance with your security settings
            or local file access restrictions.
          </p>
        </div>

        <div className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1">
          <div>
            <span className="text-nd-accent-primary">Policy Rule:</span>{" "}
            LOCAL_FILE_SYSTEM_ISOLATION
          </div>
          <div>
            <span className="text-nd-accent-primary">Detail:</span> Accessing local
            machine files (file://) or system settings is disabled for browser security.
          </div>
          <div>
            <span className="text-nd-accent-primary">Attempted URL:</span> {activeTab.url}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onGoBack}
            disabled={!activeTab?.canGoBack}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={ExternalLink}
            iconPosition="right"
            onClick={() => window.electronAPI?.openExternal(activeTab.url)}
          >
            Open in External Browser
          </Button>
        </div>
      </div>
    </div>
  );
}
