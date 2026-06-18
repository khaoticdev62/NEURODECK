import { ArrowLeft, ArrowRight, Home, RotateCcw, X } from "lucide-react";
import type { BrowserTab } from "../types";
import { IconButton } from "../../../components/primitives/IconButton";

interface NavigationToolbarProps {
  activeTab?: BrowserTab;
  onGoBack: () => void;
  onGoForward: () => void;
  onRefresh: () => void;
  onStop: () => void;
  onHome: () => void;
}

export function NavigationToolbar({
  activeTab,
  onGoBack,
  onGoForward,
  onRefresh,
  onStop,
  onHome,
}: NavigationToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label="Back"
        variant="ghost"
        size="md"
        onClick={onGoBack}
        disabled={!activeTab?.canGoBack}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        aria-label="Forward"
        variant="ghost"
        size="md"
        onClick={onGoForward}
        disabled={!activeTab?.canGoForward}
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        aria-label={activeTab?.isLoading ? "Stop loading" : "Reload page"}
        variant="ghost"
        size="md"
        onClick={activeTab?.isLoading ? onStop : onRefresh}
      >
        {activeTab?.isLoading ? (
          <X className="h-4 w-4" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        )}
      </IconButton>
      <IconButton aria-label="Home" variant="ghost" size="md" onClick={onHome}>
        <Home className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
