import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, MessageSquare, Search, Settings, X, Zap } from "lucide-react";
import { FocusTrapContainer } from "../primitives/FocusTrapContainer";
import type { NeuroDeckAction, ViewId } from "../../types/neurodeck";
import type { Dispatch } from "react";

interface SearchResult {
  id: string;
  type: "view" | "session" | "memory" | "command";
  title: string;
  description?: string;
  view?: ViewId;
  icon: React.ElementType;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  dispatch?: Dispatch<NeuroDeckAction>;
}

const STATIC_RESULTS: SearchResult[] = [
  {
    id: "chat",
    type: "view",
    title: "AI Chat",
    description: "Open the chat interface",
    view: "chat",
    icon: MessageSquare,
  },
  {
    id: "settings",
    type: "view",
    title: "Settings",
    description: "App configuration",
    view: "settings",
    icon: Settings,
  },
  {
    id: "logs",
    type: "view",
    title: "Logs Viewer",
    description: "View system logs",
    view: "logs",
    icon: FileText,
  },
  {
    id: "agents",
    type: "view",
    title: "Agents",
    description: "Manage autonomous agents",
    view: "agents",
    icon: Zap,
  },
];

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  view: "View",
  session: "Session",
  memory: "Memory",
  command: "Command",
};

export function GlobalSearch({ open, onClose, dispatch }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results =
    query.length > 0
      ? STATIC_RESULTS.filter(
          (r) =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.description?.toLowerCase().includes(query.toLowerCase())
        )
      : STATIC_RESULTS;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.view) {
        dispatch?.({ type: "set-view", view: result.view });
      }
      onClose();
    },
    [dispatch, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-nd-surface-bg/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global Search"
          className="relative z-10 w-full max-w-xl rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 shadow-2xl backdrop-blur"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-nd-border-subtle px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-nd-text-muted" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search views, sessions, memory, commands…"
              className="flex-1 bg-transparent text-sm text-nd-text-primary outline-none placeholder:text-nd-text-muted"
              aria-label="Search NEURODECK"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-autocomplete="list"
              aria-controls="global-search-results"
              aria-activedescendant={
                results[selected] ? `gsr-${results[selected].id}` : undefined
              }
              autoComplete="off"
            />
            <button
              onClick={onClose}
              aria-label="Close search"
              className="text-nd-text-muted hover:text-nd-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <ul
            id="global-search-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-[50vh] overflow-y-auto py-2"
          >
            {results.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-nd-text-muted">
                No results for "{query}"
              </li>
            ) : (
              results.map((result, idx) => {
                const Icon = result.icon;
                return (
                  <li
                    key={result.id}
                    id={`gsr-${result.id}`}
                    role="option"
                    aria-selected={idx === selected}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                      idx === selected
                        ? "bg-nd-accent-primary/10"
                        : "hover:bg-nd-surface-secondary/60"
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        idx === selected
                          ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                          : "bg-nd-surface-secondary/40 text-nd-text-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="font-medium text-nd-text-primary">{result.title}</p>
                      {result.description && (
                        <p className="text-xs text-nd-text-muted">{result.description}</p>
                      )}
                    </div>
                    <span className="ml-auto shrink-0 rounded border border-nd-border-subtle bg-nd-surface-secondary/40 px-1.5 py-0.5 text-xs text-nd-text-muted">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex items-center gap-4 border-t border-nd-border-subtle px-4 py-2 text-xs text-nd-text-muted">
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 py-0.5 font-mono">
                ↵
              </kbd>{" "}
              select
            </span>
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 py-0.5 font-mono">
                Esc
              </kbd>{" "}
              close
            </span>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
