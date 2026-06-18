import { RefreshCw, Search, SplitSquareHorizontal, Trash2 } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { IconButton } from "../../components/primitives/IconButton";
import { TerminalViewport } from "./TerminalViewport";
import { classifyTerminalCommand } from "../../../../../src/shared/terminal/terminalCommandPolicy";
import type { PaneRuntime } from "./terminalUtils";
import type { TerminalTab } from "../../../../../src/shared/terminal/terminalContracts";
import type { TerminalCommandSafety } from "../../../../../src/shared/terminal/terminalSafetyTypes";
import type { TerminalEnvironmentReport } from "../../../../../src/shared/terminal/terminalDiagnosticsTypes";
import type { TerminalProfileAvailability } from "../../../../../src/shared/terminal/terminalProfiles";

type PanePatch = Partial<PaneRuntime>;

export type TerminalPanesGridProps = {
  activeTab: TerminalTab | null;
  activePaneId: string;
  panes: Record<string, PaneRuntime>;
  profiles: TerminalProfileAvailability[];
  environment: TerminalEnvironmentReport | null;
  onSetActivePaneId: (paneId: string) => void;
  onPatchPane: (paneId: string, patch: PanePatch) => void;
  onSetPaneOutput: (paneId: string, chunk: string) => void;
  onRecordHistory: (
    paneId: string,
    command: string,
    safety: TerminalCommandSafety,
    durationMs?: number
  ) => void;
  onRequestRestart: (paneId: string) => void;
  onRequestClear: (paneId: string) => void;
  onRequestClose: (paneId: string) => void;
  onSplitHorizontal: () => void;
  onToggleSearch: () => void;
};

export function TerminalPanesGrid({
  activeTab,
  activePaneId,
  panes,
  profiles,
  environment,
  onSetActivePaneId,
  onPatchPane,
  onSetPaneOutput,
  onRecordHistory,
  onRequestRestart,
  onRequestClear,
  onRequestClose,
  onSplitHorizontal,
  onToggleSearch,
}: TerminalPanesGridProps) {
  if (!activeTab) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center p-6 text-sm text-nd-text-muted">
        No active terminal tab.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 h-full flex-col">
      <div className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-nd-text-muted">
          <Badge tone="neutral" size="sm" variant="outline">
            {activeTab.layout}
          </Badge>
          <span>•</span>
          <span className="truncate max-w-[16rem]">
            {activeTab.cwd || environment?.cwd || "cwd unavailable"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label="Search terminal output"
            variant="ghost"
            size="sm"
            onClick={onToggleSearch}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Split pane horizontally"
            variant="ghost"
            size="sm"
            onClick={onSplitHorizontal}
          >
            <SplitSquareHorizontal className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Reset pane"
            variant="ghost"
            size="sm"
            onClick={() => void onRequestRestart(activePaneId)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Close pane"
            variant="danger"
            size="sm"
            onClick={() => void onRequestClose(activePaneId)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <div
          className={`grid h-full min-h-0 gap-2 ${activeTab.sessionIds.length <= 1 ? "grid-cols-1" : activeTab.layout === "split-horizontal" ? "grid-rows-2" : "grid-cols-2"}`}
        >
          {activeTab.sessionIds.map((paneId) => {
            const pane = panes[paneId];
            if (!pane) return null;
            const profile = profiles.find((item) => item.id === pane.profileId) ?? null;
            return (
              <div
                key={pane.id}
                className={`min-h-0 overflow-hidden rounded-2xl border ${pane.id === activePaneId ? "border-nd-accent-primary/30 bg-nd-surface-app/60" : "border-nd-border-subtle bg-nd-surface-app/40"}`}
              >
                <TerminalViewport
                  pane={pane}
                  profile={profile}
                  environment={environment}
                  active={pane.id === activePaneId}
                  onFocus={() => onSetActivePaneId(pane.id)}
                  onPanePatch={(patch) => onPatchPane(pane.id, patch)}
                  onPaneOutput={(chunk) => onSetPaneOutput(pane.id, chunk)}
                  onCommandSubmitted={(command) => {
                    const safety = classifyTerminalCommand(command, "user");
                    onRecordHistory(pane.id, command, safety);
                    onPatchPane(pane.id, {
                      commandCount: pane.commandCount + 1,
                      lastCommand: command,
                      lastActivityAt: new Date().toISOString(),
                      state: "busy",
                    });
                  }}
                  onRequestRestart={() => void onRequestRestart(pane.id)}
                  onRequestClear={() => onRequestClear(pane.id)}
                  onRequestClose={() => void onRequestClose(pane.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
