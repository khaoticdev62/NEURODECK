import { Terminal } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { BrowserOverlay } from "./BrowserOverlay";

interface DiagnosticsPanelProps {
  showDiagnostics: boolean;
  onClose: () => void;
  diagnosticsReport: unknown;
  onRefresh: () => void;
}

export function DiagnosticsPanel({
  showDiagnostics,
  onClose,
  diagnosticsReport,
  onRefresh,
}: DiagnosticsPanelProps) {
  const report = diagnosticsReport as {
    activeViewsCount?: number;
    sessionsCount?: number;
    tabs?: Array<{
      id: string;
      title: string;
      profileId: string;
      state: string;
      pid?: number;
    }>;
  } | null;

  return (
    <BrowserOverlay
      active={showDiagnostics}
      onClose={onClose}
      title="Diagnostics / Process Monitor"
      icon={Terminal}
      className="absolute right-4 top-24 z-[var(--z-dropdown)] w-96"
      ariaLabel="Browser diagnostics panel"
    >
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin text-xs">
        <Button variant="secondary" size="sm" fullWidth onClick={onRefresh}>
          Refresh Diagnostics Report
        </Button>
        {report ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-nd-text-muted">Active Views:</span>
              <span className="font-semibold">{report.activeViewsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nd-text-muted">Profile Partitions:</span>
              <span className="font-semibold">{report.sessionsCount}</span>
            </div>
            {report.tabs &&
              report.tabs.map((t) => (
                <div
                  key={t.id}
                  className="p-2 rounded-lg bg-nd-surface-secondary/40 border border-nd-border-subtle"
                >
                  <div className="font-semibold text-nd-accent-primary truncate">{t.title}</div>
                  <div className="text-[10px] text-nd-text-muted mt-1 truncate">ID: {t.id}</div>
                  <div className="text-[10px] text-nd-text-muted truncate">
                    Profile: {t.profileId}
                  </div>
                  <div className="text-[10px] text-nd-text-muted">State: {t.state}</div>
                  {t.pid && (
                    <div className="text-[10px] text-nd-accent-success font-mono">
                      Process PID: {t.pid}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-nd-text-muted text-center py-4">Click Refresh to query details</div>
        )}
      </div>
    </BrowserOverlay>
  );
}
