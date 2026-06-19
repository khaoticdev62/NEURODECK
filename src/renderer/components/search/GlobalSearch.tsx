import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Brain,
  FileText,
  MessageSquare,
  Puzzle,
  Search,
  SearchX,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { FocusTrapContainer } from "../primitives/FocusTrapContainer";
import { Skeleton } from "../primitives/Skeleton";
import { neurodeckApi } from "../../services/bridgeAdapter";
import { navItems } from "../../types/seed";
import type { NeuroDeckAction, ViewId } from "../../types/neurodeck";
import type { Dispatch } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type SearchScope = "all" | "sessions" | "memory" | "commands" | "views";

interface SearchResultItem {
  id: string;
  type: "session" | "memory" | "command" | "view";
  title: string;
  description?: string;
  meta?: string;
  view?: ViewId;
  icon: React.ElementType;
  onSelect: () => void;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  dispatch?: Dispatch<NeuroDeckAction>;
}

// ── Static command registry ──────────────────────────────────────────────────

const COMMANDS = [
  { id: "cmd-clear", label: "/clear — Clear current session", icon: X },
  { id: "cmd-rag", label: "/rag — Toggle RAG context", icon: Brain },
  { id: "cmd-persona", label: "/persona — Switch AI persona", icon: Bot },
  { id: "cmd-export", label: "/export — Export session", icon: FileText },
];

const SCOPE_TABS: { id: SearchScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sessions", label: "Sessions" },
  { id: "memory", label: "Memory" },
  { id: "commands", label: "Commands" },
  { id: "views", label: "Views" },
];

const RECENT_KEY = "nd:recent-searches";
const MAX_RECENT = 10;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const prev = loadRecent().filter((q) => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
}

// ── Component ────────────────────────────────────────────────────────────────

export function GlobalSearch({ open, onClose, dispatch }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [focused, setFocused] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState<SearchResultItem[]>([]);
  const [memoryResults, setMemoryResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigate to a view and select a result
  const navigateTo = useCallback(
    (view: ViewId) => {
      dispatch?.({ type: "set-view", view });
      onClose();
    },
    [dispatch, onClose]
  );

  // Build view results from navItems
  const viewResults = useMemo<SearchResultItem[]>(
    () =>
      navItems
        .filter(
          (item) =>
            !query ||
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.id.includes(query.toLowerCase())
        )
        .slice(0, 5)
        .map((item) => ({
          id: `view-${item.id}`,
          type: "view" as const,
          title: item.label,
          description: `Go to ${item.label}`,
          view: item.id as ViewId,
          icon: Settings,
          onSelect: () => navigateTo(item.id as ViewId),
        })),
    [query, navigateTo]
  );

  // Build command results
  const commandResults = useMemo<SearchResultItem[]>(
    () =>
      COMMANDS.filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase())).map(
        (c) => ({
          id: c.id,
          type: "command" as const,
          title: c.label,
          icon: c.icon,
          onSelect: onClose,
        })
      ),
    [query, onClose]
  );

  // Async IPC search
  useEffect(() => {
    if (query.length < 3) {
      setSessionResults([]);
      setMemoryResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [sessData, memData] = await Promise.allSettled([
          neurodeckApi.sessions.listMeta(),
          neurodeckApi.memory.list(50),
        ]);

        if (sessData.status === "fulfilled" && Array.isArray(sessData.value)) {
          const q = query.toLowerCase();
          setSessionResults(
            sessData.value
              .filter((s: { id?: string; title?: string; last_active?: string }) =>
                (s.title ?? s.id ?? "").toLowerCase().includes(q)
              )
              .slice(0, 4)
              .map((s: { id?: string; title?: string; last_active?: string }) => ({
                id: `sess-${s.id ?? s.title}`,
                type: "session" as const,
                title: s.title ?? s.id ?? "Session",
                meta: s.last_active ?? undefined,
                icon: MessageSquare,
                onSelect: () => {
                  navigateTo("sessions");
                },
              }))
          );
        }

        if (memData.status === "fulfilled" && memData.value?.records) {
          const q = query.toLowerCase();
          setMemoryResults(
            (memData.value.records as Array<{ id: string; title: string; body: string }>)
              .filter(
                (r) =>
                  r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q)
              )
              .slice(0, 4)
              .map((r) => ({
                id: `mem-${r.id}`,
                type: "memory" as const,
                title: r.title,
                description: r.body.slice(0, 80),
                icon: Brain,
                onSelect: () => {
                  navigateTo("memory");
                },
              }))
          );
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, navigateTo]);

  // Build grouped results based on scope
  const allGroups = useMemo(() => {
    const groups: { label: string; type: SearchResultItem["type"]; items: SearchResultItem[] }[] =
      [];
    if ((scope === "all" || scope === "sessions") && sessionResults.length)
      groups.push({ label: "Sessions", type: "session", items: sessionResults });
    if ((scope === "all" || scope === "memory") && memoryResults.length)
      groups.push({ label: "Memory", type: "memory", items: memoryResults });
    if ((scope === "all" || scope === "commands") && commandResults.length)
      groups.push({ label: "Commands", type: "command", items: commandResults });
    if ((scope === "all" || scope === "views") && viewResults.length)
      groups.push({ label: "Views", type: "view", items: viewResults });
    return groups;
  }, [scope, sessionResults, memoryResults, commandResults, viewResults]);

  const flatItems = useMemo(() => allGroups.flatMap((g) => g.items), [allGroups]);

  const recentSearches = query.length === 0 ? loadRecent() : [];

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setScope("all");
      setFocused(0);
      setSessionResults([]);
      setMemoryResults([]);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setFocused(0);
  }, [query, scope]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      if (query.length >= 3) saveRecent(query);
      item.onSelect();
    },
    [query]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocused((prev) => Math.min(prev + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocused((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        if (flatItems[focused]) handleSelect(flatItems[focused]);
        break;
      case "Escape":
        onClose();
        break;
      case "Tab":
        e.preventDefault();
        setScope((prev) => {
          const idx = SCOPE_TABS.findIndex((t) => t.id === prev);
          return SCOPE_TABS[(idx + 1) % SCOPE_TABS.length].id;
        });
        break;
    }
  };

  if (!open) return null;

  const showMinLength = query.length > 0 && query.length < 3;
  const noResults = !loading && query.length >= 3 && flatItems.length === 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 shadow-2xl backdrop-blur"
        >
          {/* Input zone */}
          <div className="flex items-center gap-3 border-b border-nd-border-subtle px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-nd-text-muted" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything…"
              className="flex-1 bg-transparent text-sm text-nd-text outline-none placeholder:text-nd-text-muted"
              role="combobox"
              aria-expanded={flatItems.length > 0}
              aria-autocomplete="list"
              aria-controls="global-search-results"
              aria-activedescendant={flatItems[focused] ? `gsr-${flatItems[focused].id}` : undefined}
              aria-label="Search NEURODECK"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search (Escape)"
              className="rounded-lg p-1 text-nd-text-muted transition hover:text-nd-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Scope filter chips */}
          <div
            role="tablist"
            aria-label="Search scope"
            className="flex gap-1 border-b border-nd-border-subtle px-3 py-2"
          >
            {SCOPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={scope === tab.id}
                onClick={() => setScope(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-nd-accent ${
                  scope === tab.id
                    ? "bg-nd-accent/15 text-nd-accent"
                    : "text-nd-text-muted hover:bg-nd-surface-tertiary hover:text-nd-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results zone */}
          <div
            id="global-search-results"
            role="listbox"
            aria-label="Search results"
            aria-live="polite"
            className="max-h-[50vh] overflow-y-auto"
          >
            {/* Recent searches (shown when input is empty) */}
            {recentSearches.length > 0 && query.length === 0 && (
              <div className="px-3 pb-2 pt-3">
                <p className="mb-1 px-1 text-2xs font-semibold uppercase tracking-widest text-nd-text-muted">
                  Recent searches
                </p>
                <div className="flex flex-wrap gap-1">
                  {recentSearches.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQuery(r)}
                      className="rounded-md border border-nd-border-subtle bg-nd-surface-tertiary/50 px-2 py-1 text-xs text-nd-text-muted transition hover:text-nd-text"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick jumps (empty state) */}
            {query.length === 0 && (
              <div className="px-3 pb-3 pt-2">
                <p className="mb-2 px-1 text-2xs font-semibold uppercase tracking-widest text-nd-text-muted">
                  Jump to
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: "AI Chat", view: "chat" as ViewId, icon: MessageSquare },
                    { label: "Memory", view: "memory" as ViewId, icon: Brain },
                    { label: "Terminal", view: "terminal" as ViewId, icon: Zap },
                    { label: "Settings", view: "settings" as ViewId, icon: Settings },
                    { label: "Agents", view: "agents" as ViewId, icon: Bot },
                    { label: "Plugins", view: "plugins" as ViewId, icon: Puzzle },
                  ].map(({ label, view, icon: Icon }) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => navigateTo(view)}
                      className="flex items-center gap-2 rounded-lg border border-nd-border-subtle bg-nd-surface-tertiary/30 px-3 py-2 text-sm text-nd-text-muted transition hover:bg-nd-surface-hover hover:text-nd-text"
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Min length hint */}
            {showMinLength && (
              <p className="px-4 py-8 text-center text-sm text-nd-text-muted">
                Type at least 3 characters to search…
              </p>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-2 px-3 py-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="flex flex-col items-center gap-3 px-4 py-10">
                <SearchX className="h-8 w-8 text-nd-text-muted" aria-hidden />
                <p className="text-sm text-nd-text-muted">No results for "{query}"</p>
                <p className="text-2xs text-nd-text-muted">Try a broader term or switch scope</p>
              </div>
            )}

            {/* Grouped results */}
            {!loading &&
              allGroups.map((group) => {
                const groupFlat = group.items;
                return (
                  <div key={group.label} role="group" aria-label={`${group.label} results`}>
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                      <span className="text-2xs font-semibold uppercase tracking-widest text-nd-text-muted">
                        {group.label}
                      </span>
                      <span className="text-2xs text-nd-text-muted">
                        {groupFlat.length} result{groupFlat.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {groupFlat.map((item) => {
                      const globalIdx = flatItems.indexOf(item);
                      const isSelected = globalIdx === focused;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          id={`gsr-${item.id}`}
                          role="option"
                          aria-selected={isSelected}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition ${
                            isSelected ? "bg-nd-accent/10" : "hover:bg-nd-surface-hover"
                          }`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setFocused(globalIdx)}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              isSelected
                                ? "bg-nd-accent/20 text-nd-accent"
                                : "bg-nd-surface-tertiary/50 text-nd-text-muted"
                            }`}
                            aria-hidden
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-nd-text">{item.title}</p>
                            {item.description && (
                              <p className="truncate text-2xs text-nd-text-muted">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.meta && (
                            <span className="shrink-0 text-2xs text-nd-text-muted">{item.meta}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-nd-border-subtle px-4 py-2 text-2xs text-nd-text-muted">
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 font-mono">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 font-mono">↵</kbd>{" "}
              open
            </span>
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 font-mono">Tab</kbd>{" "}
              switch scope
            </span>
            <span>
              <kbd className="rounded border border-nd-border-subtle px-1 font-mono">Esc</kbd>{" "}
              close
            </span>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
