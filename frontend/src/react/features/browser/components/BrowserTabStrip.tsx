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
    <div className="flex items-center gap-2 flex-1 max-w-[70%]">
      <div
        role="tablist"
        aria-label="Browser tabs"
        className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 pr-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div key={tab.id} className="group relative shrink-0">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSwitchTab(tab.id)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && void onSwitchTab(tab.id)
                }
                className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-1.5 pr-8 text-xs transition cursor-pointer border outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
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
                <span className="max-w-[120px] truncate">
                  {tab.title || "New Tab"}
                </span>
                {tab.isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-nd-accent-primary shrink-0" />
                )}
                {tab.isMuted && (
                  <VolumeX className="h-3 w-3 text-nd-accent-error shrink-0" />
                )}
                {tab.isPinned && (
                  <Pin className="h-3 w-3 text-nd-accent-primary shrink-0 rotate-45" />
                )}
              </button>
              <button
                type="button"
                aria-label={`Close tab: ${tab.title || "New Tab"}`}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onCloseTab(tab.id, e);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1 text-nd-text-muted hover:bg-nd-surface-hover hover:text-nd-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
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
