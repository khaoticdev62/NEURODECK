import { Terminal as TerminalIcon, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { TerminalDiagnosticsPanel } from "./TerminalDiagnosticsPanel";
import { TerminalProfileSelector } from "./TerminalProfileSelector";
import type { PaneRuntime } from "./terminalUtils";
import type { TerminalTab } from "../../../shared/terminal/terminalContracts";
import type {
  TerminalDiagnosticsReport,
  TerminalEnvironmentReport,
} from "../../../shared/terminal/terminalDiagnosticsTypes";
import type {
  TerminalProfile,
  TerminalProfileAvailability,
} from "../../../shared/terminal/terminalProfiles";

export type TerminalSidebarProps = {
  profiles: TerminalProfileAvailability[];
  fallbackProfiles: TerminalProfile[];
  activeTabId: string;
  activePane: PaneRuntime | undefined;
  tabs: TerminalTab[];
  panes: Record<string, PaneRuntime>;
  diagnostics: TerminalDiagnosticsReport | null;
  environment: TerminalEnvironmentReport | null;
  terminalError: { message: string; onRetry?: () => void } | null;
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSwitchTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onToggleSessionManager: () => void;
  onClearError: () => void;
};

export function TerminalSidebar({
  profiles,
  fallbackProfiles,
  activeTabId,
  activePane,
  tabs,
  panes,
  diagnostics,
  environment,
  terminalError,
  selectedProfileId,
  onSelectProfile,
  onSwitchTab,
  onPinTab,
  onCloseTab,
  onToggleSessionManager,
  onClearError,
}: TerminalSidebarProps) {
  const profileList: TerminalProfileAvailability[] = profiles.length
    ? profiles
    : (fallbackProfiles.map((profile) => ({
        ...profile,
        shellAvailable: false,
        shellStatus: "unknown" as const,
        shellSafety: "unknown" as const,
      })) as TerminalProfileAvailability[]);

  return (
    <aside className="flex w-80 min-w-[18rem] max-w-[22rem] flex-col gap-3 overflow-hidden">
      <TerminalProfileSelector
        profiles={profileList}
        selectedProfileId={selectedProfileId}
        onSelect={onSelectProfile}
      />

      <TerminalDiagnosticsPanel
        diagnostics={diagnostics}
        environment={environment}
        activePane={activePane}
      />

      <section
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3"
        tabIndex={0}
        aria-label="Terminal output"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
              Session Manager
            </p>
            <h3 className="text-sm font-semibold text-nd-text-primary">Tabs and panes</h3>
          </div>
          <IconButton
            aria-label="Toggle session manager"
            variant="ghost"
            size="sm"
            onClick={onToggleSessionManager}
          >
            <TerminalIcon className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
        {terminalError && (
          <ErrorState
            title="Terminal error"
            message={terminalError.message}
            onRetry={terminalError.onRetry}
            onClose={onClearError}
          />
        )}
        <div className="space-y-2">
          {tabs.map((tab) => {
            const pane = panes[tab.activePaneId];
            return (
              <div
                key={tab.id}
                className={`rounded-2xl border p-2 transition ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08]" : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:bg-nd-surface-tertiary/60"}`}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab.id === activeTabId}
                    tabIndex={0}
                    onClick={() => onSwitchTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSwitchTab(tab.id);
                      }
                    }}
                    className="min-h-touch flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-nd-text-primary">
                        {tab.label}
                      </div>
                      <div className="truncate text-[11px] text-nd-text-muted">
                        {pane?.shell ?? "unknown shell"}
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="secondary"
                    size="xs"
                    aria-label={tab.pinned ? "Unpin tab" : "Pin tab"}
                    onClick={() => onPinTab(tab.id)}
                  >
                    {tab.pinned ? "Pinned" : "Pin"}
                  </Button>
                  <IconButton
                    aria-label="Close tab"
                    variant="danger"
                    size="sm"
                    onClick={() => void onCloseTab(tab.id)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
                <div className="mt-2 flex items-center gap-2 px-2 text-[11px] text-nd-text-muted">
                  <span>{tab.sessionIds.length} pane(s)</span>
                  <span>•</span>
                  <span>{tab.cwd || "workspace"}</span>
                </div>
              </div>
            );
          })}
          {tabs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-nd-text-muted/15 bg-nd-surface/20 p-3 text-sm text-nd-text-muted">
              No terminal tabs available.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
