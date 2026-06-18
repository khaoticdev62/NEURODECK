import { X } from "lucide-react";
import { IconButton } from "../../components/primitives/IconButton";
import { OpenTab, getLangIcon } from "./ideUtils";

interface IdeTabBarProps {
  tabs: OpenTab[];
  activeTab: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function IdeTabBar({ tabs, activeTab, onSelect, onClose }: IdeTabBarProps) {
  if (tabs.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label="Open editor files"
      className="flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`flex items-center gap-0.5 rounded-lg border px-1.5 py-1 transition ${
            activeTab === tab.path
              ? "border-nd-accent-primary/30 bg-nd-accent-primary/10"
              : "border-nd-border-subtle bg-nd-surface-secondary hover:bg-nd-surface-tertiary"
          }`}
        >
          <button
            id={`ide-tab-${tab.path.replace(/[^a-z0-9]/gi, "-")}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.path}
            onClick={() => onSelect(tab.path)}
            className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
              activeTab === tab.path ? "text-nd-accent-primary" : "text-nd-text-muted"
            }`}
          >
            <span aria-hidden="true">{getLangIcon(tab.lang)}</span>
            <span className="truncate max-w-[120px]">
              {tab.name}
              {tab.dirty ? " ●" : ""}
            </span>
          </button>
          <IconButton
            aria-label={`Close ${tab.name}`}
            variant="ghost"
            size="sm"
            className="h-5 w-5"
            onClick={() => onClose(tab.path)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
