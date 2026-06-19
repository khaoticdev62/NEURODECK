import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Filter, Pause, Play, RefreshCcw, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { TextInput } from "../../components/primitives/TextInput";
import { Badge } from "../../components/primitives/Badge";
import { neurodeckApi, listenBridge } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  category: string;
  message: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "text-nd-status-error",
  warn: "text-nd-warning",
  info: "text-nd-text-secondary",
  debug: "text-nd-text-muted",
};

const LEVEL_TONES: Record<LogLevel, "danger" | "warning" | "neutral"> = {
  error: "danger",
  warn: "warning",
  info: "neutral",
  debug: "neutral",
};

export function LogsView({ state: _state }: { state: NeuroDeckState }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await neurodeckApi.diagnostics.logs?.();
      if (result && Array.isArray(result)) {
        setLogs(
          result.map((dl) => {
            const r = dl as { id: string; timestamp: string; level: string; scope: string; message: string };
            return {
              id: r.id,
              ts: r.timestamp,
              level: (r.level === "warning" ? "warn" : r.level) as LogLevel,
              category: r.scope,
              message: r.message,
            };
          })
        );
      } else {
        setLogs(generateMockLogs());
      }
    } catch {
      setLogs(generateMockLogs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!live) return;
    const unsub = listenBridge("log:entry", (entry: unknown) => {
      setLogs((prev) => [...prev.slice(-499), entry as LogEntry]);
    });
    return () => { unsub?.(); };
  }, [live]);

  useEffect(() => {
    if (live) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, live]);

  const filtered = logs.filter((log) => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (query && !log.message.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleExport = useCallback(() => {
    const content = filtered
      .map((l) => `[${l.ts}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neurodeck-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const levels: Array<LogLevel | "all"> = ["all", "error", "warn", "info", "debug"];

  return (
    <Panel
      eyebrow="Diagnostics"
      title="Logs"
      data-testid="logs-view"
      className="h-full overflow-hidden"
      action={
        <div className="flex gap-2">
          <Button
            variant={live ? "soft" : "ghost"}
            size="sm"
            icon={live ? Pause : Play}
            onClick={() => setLive((v) => !v)}
            aria-label={live ? "Pause live log tail" : "Start live log tail"}
          >
            {live ? "Live" : "Tail"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCcw}
            onClick={() => void loadLogs()}
            aria-label="Refresh logs"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={handleExport}
            aria-label="Export logs"
          />
        </div>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 border-b border-nd-border-subtle px-4 py-2">
        <TextInput
          label=""
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs…"
          className="min-w-40"
        />
        <div className="flex items-center gap-1" role="group" aria-label="Filter by level">
          <Filter className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden />
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              aria-pressed={levelFilter === lvl}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                levelFilter === lvl
                  ? "bg-nd-accent-primary/15 text-nd-accent-primary"
                  : "text-nd-text-muted hover:text-nd-text-secondary"
              }`}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="flex items-center gap-1 text-xs text-nd-text-muted hover:text-nd-text-secondary"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Log table */}
      <div
        role="log"
        aria-live={live ? "polite" : "off"}
        aria-label="Application logs"
        className="h-[calc(100%-120px)] overflow-y-auto scrollbar-thin"
      >
        {loading ? (
          <div className="p-4">
            <Skeleton className="h-6 rounded" count={8} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No logs"
            description={query ? `No logs matching "${query}"` : "No log entries found."}
            variant="default"
          />
        ) : (
          <table className="w-full text-xs" role="table">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-nd-border-subtle bg-nd-surface-secondary/80 backdrop-blur-sm">
                <th className="py-2 pl-4 pr-2 text-left font-semibold text-nd-text-muted" scope="col">
                  Time
                </th>
                <th className="px-2 py-2 text-left font-semibold text-nd-text-muted" scope="col">
                  Level
                </th>
                <th className="px-2 py-2 text-left font-semibold text-nd-text-muted" scope="col">
                  Category
                </th>
                <th className="px-2 py-2 pr-4 text-left font-semibold text-nd-text-muted" scope="col">
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  role="row"
                  className="border-b border-nd-border-subtle/30 hover:bg-nd-surface-secondary/20"
                >
                  <td className="py-1.5 pl-4 pr-2 font-mono text-nd-text-muted whitespace-nowrap">
                    {log.ts}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge tone={LEVEL_TONES[log.level]} size="sm">
                      {log.level}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-nd-text-muted">{log.category}</td>
                  <td
                    className={`px-2 py-1.5 pr-4 font-mono ${LEVEL_COLORS[log.level]}`}
                    aria-label={`${log.level}: ${log.message}`}
                  >
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      <div className="flex items-center justify-between border-t border-nd-border-subtle px-4 py-2 text-xs text-nd-text-muted">
        <span>{filtered.length} entries</span>
        {live && (
          <span className="flex items-center gap-1 text-nd-status-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nd-status-success" aria-hidden />
            Live
          </span>
        )}
      </div>
    </Panel>
  );
}

function generateMockLogs(): LogEntry[] {
  const now = Date.now();
  return [
    { id: "1", ts: new Date(now - 12000).toISOString().slice(11, 23), level: "info", category: "bridge", message: "POST /api/get_config → 200 (12ms)" },
    { id: "2", ts: new Date(now - 8000).toISOString().slice(11, 23), level: "info", category: "pty", message: "PTY session spawned: main_pty_session" },
    { id: "3", ts: new Date(now - 5000).toISOString().slice(11, 23), level: "warn", category: "llm", message: "Embedding skipped: empty vector" },
    { id: "4", ts: new Date(now - 2000).toISOString().slice(11, 23), level: "debug", category: "memory", message: "Search returned 3 results (cosine threshold 0.7)" },
    { id: "5", ts: new Date(now - 500).toISOString().slice(11, 23), level: "info", category: "session", message: "Session saved: 12 messages" },
  ];
}
