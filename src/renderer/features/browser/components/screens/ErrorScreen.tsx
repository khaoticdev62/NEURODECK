import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import type { BrowserTab } from "../../types";
import { Button } from "../../../../components/primitives/Button";

interface ErrorScreenProps {
  activeTab: BrowserTab;
  onGoBack: () => void;
  onRefresh: () => void;
  errorDetailsOpen: boolean;
  onToggleErrorDetails: () => void;
}

export function ErrorScreen({
  activeTab,
  onGoBack,
  onRefresh,
  errorDetailsOpen,
  onToggleErrorDetails,
}: ErrorScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <div className="h-12 w-12 rounded-full bg-nd-accent-error/10 flex items-center justify-center border border-nd-accent-error/25">
          <AlertTriangle className="h-6 w-6 text-nd-accent-error" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-nd-text-primary">Failed to Load Page</h3>
          <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed truncate max-w-sm">
            Could not establish connection to{" "}
            <code className="text-nd-accent-primary font-mono text-[10px]">
              {activeTab.url}
            </code>
          </p>
        </div>

        <div className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 overflow-hidden">
          <button
            type="button"
            onClick={onToggleErrorDetails}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-nd-text-primary transition hover:bg-nd-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
          >
            <span>Diagnostic Information</span>
            <ChevronDown
              className={`h-4 w-4 text-nd-text-muted transition-transform ${errorDetailsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {errorDetailsOpen && (
            <div className="border-t border-nd-border-subtle bg-nd-surface-app/50 p-3 text-left font-mono text-[10px] text-nd-text-muted flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              <div>
                <span className="text-nd-accent-primary">Error Code:</span>{" "}
                {activeTab.diagnostics?.lastErrorCode || "ERR_CONNECTION_REFUSED"}
              </div>
              <div>
                <span className="text-nd-accent-primary">Description:</span>{" "}
                {activeTab.diagnostics?.lastErrorMessage ||
                  "The server at the destination address refused the connection or DNS resolution failed."}
              </div>
              <div>
                <span className="text-nd-accent-primary">Target:</span> {activeTab.url}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onGoBack} disabled={!activeTab?.canGoBack}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" onClick={onRefresh}>
            Retry Connection
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
