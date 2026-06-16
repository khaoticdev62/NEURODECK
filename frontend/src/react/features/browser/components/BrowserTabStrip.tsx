import type { MouseEvent } from "react";
import { Globe, Lock, Pin, Plus, RefreshCw, VolumeX, X } from "lucide-react";
import type { BrowserTab } from "../types";
import { IconButton } from "../../../components/primitives/IconButton";

interface BrowserTabStripProps {
  tabs: BrowserTab[];
  activeTabId: string | null;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onCreateTab: () => void;
}

export function BrowserTabStrip({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onCreateTab,
}: BrowserTabStripProps) {
  return (
    <div
      role="tablist"
      aria-label="Browser tabs"
      className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 max-w-[80%] pr-4"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSwitchTab(tab.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && void onSwitchTab(tab.id)}
            className={`group relative flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition cursor-pointer shrink-0 border outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
              isActive
                ? "bg-nd-surface-selected border-nd-accent-primary/40 text-nd-text-primary font-semibold"
                : "bg-nd-surface-secondary/40 border-transparent text-nd-text-muted hover:bg-nd-surface-hover hover:text-nd-text-primary"
            }`}
          >
            {tab.isPrivate ? (
              <Lock
                className="h-3.5 w-3.5 text-nd-accent-warning shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Globe
                className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-nd-accent-primary" : "text-nd-text-muted"}`}
                aria-hidden="true"
              />
            )}
            <span className="max-w-[120px] truncate">{tab.title || "New Tab"}</span>
            {tab.isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-nd-accent-primary shrink-0" />
            )}
            {tab.isMuted && <VolumeX className="h-3 w-3 text-nd-accent-error shrink-0" />}
            {tab.isPinned && (
              <Pin className="h-3 w-3 text-nd-accent-primary shrink-0 rotate-45" />
            )}
            <IconButton
              aria-label={`Close tab: ${tab.title || "New Tab"}`}
              variant="ghost"
              size="sm"
              onClick={(e: MouseEvent) => onCloseTab(tab.id, e)}
              className="opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </IconButton>
          </div>
        );
      })}
      <IconButton
        aria-label="Open new tab"
        variant="subtle"
        size="md"
        onClick={onCreateTab}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
