import { Trash2, X } from "lucide-react";
import type { BrowserBookmark, BrowserHistoryEntry } from "../types";
import { Button } from "../../../components/primitives/Button";
import { FocusTrapContainer } from "../../../components/primitives/FocusTrapContainer";
import { IconButton } from "../../../components/primitives/IconButton";

interface SidebarDrawerProps {
  showSidebar: "history" | "bookmarks" | null;
  onClose: () => void;
  history: BrowserHistoryEntry[];
  bookmarks: BrowserBookmark[];
  onNavigate: (url: string) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClearHistory: () => void;
}

export function SidebarDrawer({
  showSidebar,
  onClose,
  history,
  bookmarks,
  onNavigate,
  onDeleteHistoryEntry,
  onDeleteBookmark,
  onClearHistory,
}: SidebarDrawerProps) {
  if (!showSidebar) return null;

  const isHistory = showSidebar === "history";

  return (
    <FocusTrapContainer
      active={Boolean(showSidebar)}
      onEscape={onClose}
      className="flex w-80 shrink-0 flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/20 animate-in slide-in-from-right duration-250"
      role="dialog"
      aria-label={isHistory ? "History Log" : "Saved Bookmarks"}
    >
      <div className="flex items-center justify-between border-b border-nd-border-subtle p-3">
        <span className="text-xs font-bold uppercase tracking-wider text-nd-text-primary">
          {isHistory ? "History Log" : "Saved Bookmarks"}
        </span>
        <IconButton
          aria-label="Close sidebar"
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
        {isHistory ? (
          <>
            <div className="mb-2 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                fullWidth
                icon={Trash2}
                onClick={onClearHistory}
              >
                Purge History
              </Button>
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-nd-text-muted text-center py-8">
                No history recorded
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  onDoubleClick={() => onNavigate(h.url)}
                  className="group flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-2 text-xs transition hover:border-nd-accent-primary/30"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-nd-text-primary transition group-hover:text-nd-accent-primary">
                      {h.title || h.url}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] text-nd-text-muted">
                      {h.url}
                    </span>
                  </div>
                  <IconButton
                    aria-label={`Delete history entry: ${h.title || h.url}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteHistoryEntry(h.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {bookmarks.length === 0 ? (
              <div className="text-xs text-nd-text-muted text-center py-8">
                No bookmarks saved
              </div>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.id}
                  onDoubleClick={() => onNavigate(b.url)}
                  className="group flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-2 text-xs transition hover:border-nd-accent-primary/30"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-nd-text-primary transition group-hover:text-nd-accent-primary">
                      {b.title || b.url}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] text-nd-text-muted">
                      {b.url}
                    </span>
                  </div>
                  <IconButton
                    aria-label={`Remove bookmark: ${b.title || b.url}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteBookmark(b.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </FocusTrapContainer>
  );
}
