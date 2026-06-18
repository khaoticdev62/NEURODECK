import { Plus, ShieldCheck, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import type { TerminalTab } from "../../../shared/terminal/terminalContracts";

export type TerminalTabBarProps = {
  tabs: TerminalTab[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onCreateTab: () => void;
};

export function TerminalTabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onCreateTab,
}: TerminalTabBarProps) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-2">
      <div
        role="tablist"
        aria-label="Terminal sessions"
        className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`term-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            onClick={() => onSwitchTab(tab.id)}
            className={`inline-flex min-h-touch min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08] text-nd-text-primary" : "border-nd-border-subtle bg-nd-surface-secondary/40 text-nd-text-muted hover:bg-nd-surface-tertiary/60"}`}
          >
            <TerminalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{tab.label}</span>
            {tab.pinned && (
              <ShieldCheck className="h-3.5 w-3.5 text-nd-accent-success" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" icon={Plus} className="min-h-touch" onClick={onCreateTab}>
        Add Tab
      </Button>
    </div>
  );
}
