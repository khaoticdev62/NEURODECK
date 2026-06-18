import {
  LayoutGrid,
  Plus,
  RefreshCw,
  SplitSquareVertical,
  Terminal as TerminalIcon,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { PaneRuntime } from "./terminalUtils";
import type { TerminalTab } from "../../../shared/terminal/terminalContracts";
import type { TerminalProfileAvailability } from "../../../shared/terminal/terminalProfiles";
import type { TerminalEnvironmentReport } from "../../../shared/terminal/terminalDiagnosticsTypes";

export type TerminalHeaderProps = {
  statusLevel: "running" | "blocked" | "error" | "exited";
  statusMessage: string;
  activeTab: TerminalTab | null;
  activePane: PaneRuntime | undefined;
  activeProfile: TerminalProfileAvailability | null;
  activeProjectPath: string;
  environment: TerminalEnvironmentReport | null;
  onCreateTab: () => void;
  onSplitVertical: () => void;
  onOpenPalette: () => void;
  onRefreshDiagnostics: () => void;
};

export function TerminalHeader({
  statusLevel,
  statusMessage,
  activeTab,
  activeProfile,
  activePane,
  activeProjectPath,
  environment,
  onCreateTab,
  onSplitVertical,
  onOpenPalette,
  onRefreshDiagnostics,
}: TerminalHeaderProps) {
  const shellLabel = activeProfile?.shellAvailable
    ? activeProfile.shellPath
    : "missing_shell_binary";

  return (
    <header className="flex items-start justify-between gap-4 border-b border-nd-text-muted/15 px-4 py-3">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/10 text-nd-accent-primary">
          <TerminalIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            Terminal Workspace
          </div>
          <h2 className="truncate text-lg font-semibold text-nd-text-primary">NeuroShell</h2>
          <div className="truncate text-xs text-nd-text-muted">{statusMessage}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip
          tone={
            statusLevel === "running" ? "success" : statusLevel === "blocked" ? "error" : "warning"
          }
          size="sm"
        >
          {statusLevel}
        </StatusChip>
        <Badge tone="neutral" size="sm" variant="outline">
          {activeTab?.label ?? "No tab"}
        </Badge>
        <Badge tone="neutral" size="sm" variant="outline">
          {shellLabel}
        </Badge>
        <Badge tone="neutral" size="sm" variant="outline" className="max-w-[12rem] truncate">
          {activePane?.cwd || activeProjectPath || environment?.cwd || "cwd unavailable"}
        </Badge>
        <Button
          id="terminal-new-tab-btn"
          variant="secondary"
          size="sm"
          icon={Plus}
          className="min-h-touch"
          onClick={onCreateTab}
        >
          New Tab
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={SplitSquareVertical}
          className="min-h-touch"
          onClick={onSplitVertical}
        >
          Split
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={LayoutGrid}
          className="min-h-touch"
          onClick={onOpenPalette}
        >
          Palette
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          className="min-h-touch"
          onClick={() => void onRefreshDiagnostics()}
        >
          Refresh
        </Button>
      </div>
    </header>
  );
}
