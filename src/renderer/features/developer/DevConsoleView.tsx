import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { TabGroup, TabList, Tab, TabPanel } from "../../components/primitives/Tabs";
import { listenBridge, neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface ReplEntry {
  type: "input" | "output" | "error";
  value: string;
}

interface BridgeEvent {
  name: string;
  ts: string;
  payload: string;
}

const HISTORY_KEY = "nd:dev-console-history";
const MAX_HISTORY = 100;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    /* quota */
  }
}

export function DevConsoleView({ state }: { state: NeuroDeckState }) {
  const [activeTab, setActiveTab] = useState("repl");
  const [repl, setRepl] = useState<ReplEntry[]>([
    { type: "output", value: "NEURODECK Dev Console · type help() for commands" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [repl]);

  useEffect(() => {
    const unsub = listenBridge("ws:event", (payload: unknown) => {
      const ev = payload as { name?: string; [key: string]: unknown };
      setEvents((prev) => [
        {
          name: ev.name ?? "event",
          ts: new Date().toISOString().slice(11, 23),
          payload: JSON.stringify(payload).slice(0, 200),
        },
        ...prev.slice(0, 99),
      ]);
    });
    return () => {
      unsub?.();
    };
  }, []);

  const executeCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setRepl((prev) => [...prev, { type: "input", value: trimmed }]);
      const newHistory = [trimmed, ...history.filter((h) => h !== trimmed)];
      setHistory(newHistory);
      saveHistory(newHistory);
      setHistoryIdx(-1);
      setInput("");

      if (trimmed === "help()") {
        setRepl((prev) => [
          ...prev,
          {
            type: "output",
            value: [
              "Available commands:",
              "  neurodeckApi.<ns>.<cmd>(args) — call any bridge command",
              "  clear()                        — clear console",
              "  state()                        — dump app state",
            ].join("\n"),
          },
        ]);
        return;
      }

      if (trimmed === "clear()") {
        setRepl([{ type: "output", value: "Console cleared." }]);
        return;
      }

      if (trimmed === "state()") {
        setRepl((prev) => [
          ...prev,
          { type: "output", value: JSON.stringify(state, null, 2).slice(0, 2000) },
        ]);
        return;
      }

      try {
        const fn = new Function("neurodeckApi", `return (async () => { return ${trimmed}; })()`);
        const result = await (fn(neurodeckApi) as Promise<unknown>);
        setRepl((prev) => [
          ...prev,
          { type: "output", value: JSON.stringify(result, null, 2) ?? "undefined" },
        ]);
      } catch (e) {
        setRepl((prev) => [...prev, { type: "error", value: String(e) }]);
      }
    },
    [history, state]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void executeCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = historyIdx + 1;
      if (nextIdx < history.length) {
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx] ?? "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const prevIdx = historyIdx - 1;
      if (prevIdx < 0) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(prevIdx);
        setInput(history[prevIdx] ?? "");
      }
    }
  };

  return (
    <Panel
      eyebrow="Developer"
      title="Developer Console"
      data-testid="dev-console-view"
      className="h-full overflow-hidden"
    >
      <TabGroup value={activeTab} onChange={setActiveTab}>
        <TabList className="mx-4 mt-3">
          <Tab value="repl">REPL</Tab>
          <Tab value="events">Events</Tab>
          <Tab value="state">State</Tab>
        </TabList>

        <TabPanel value="repl">
          <div className="flex h-[calc(100%-80px)] flex-col">
            <div
              ref={outputRef}
              role="log"
              aria-live="polite"
              aria-label="Console output"
              className="flex-1 overflow-y-auto p-4 font-mono text-xs"
            >
              {repl.map((entry, i) => (
                <div
                  key={i}
                  className={
                    entry.type === "input"
                      ? "text-nd-accent-primary"
                      : entry.type === "error"
                      ? "text-nd-status-error"
                      : "text-nd-text-secondary"
                  }
                >
                  {entry.type === "input" && (
                    <ChevronRight className="mr-1 inline h-3 w-3" aria-hidden />
                  )}
                  <pre className="inline whitespace-pre-wrap">{entry.value}</pre>
                </div>
              ))}
            </div>
            <div className="flex items-center border-t border-nd-border-subtle px-4 py-2">
              <ChevronRight className="h-4 w-4 shrink-0 text-nd-accent-primary" aria-hidden />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent px-2 font-mono text-sm text-nd-text-primary outline-none placeholder:text-nd-text-muted"
                placeholder="neurodeckApi.diagnostics.get()"
                aria-label="Console input"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => setRepl([{ type: "output", value: "Console cleared." }])}
                aria-label="Clear console"
              />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="events">
          <div className="flex h-[calc(100%-40px)] flex-col">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-nd-text-muted">{events.length} events received</span>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCcw}
                onClick={() => setEvents([])}
                aria-label="Clear events"
              />
            </div>
            <div className="flex-1 overflow-y-auto" role="log" aria-label="WebSocket events">
              {events.length === 0 ? (
                <p className="p-4 text-sm text-nd-text-muted">
                  No events yet — bridge WebSocket events appear here.
                </p>
              ) : (
                events.map((ev, i) => (
                  <div
                    key={i}
                    className="flex gap-3 border-b border-nd-border-subtle/30 px-4 py-2 text-xs"
                  >
                    <span className="font-mono text-nd-text-muted">{ev.ts}</span>
                    <span className="font-mono font-bold text-nd-accent-primary">{ev.name}</span>
                    <span className="truncate font-mono text-nd-text-secondary">{ev.payload}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="state">
          <pre className="h-[calc(100%-40px)] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-nd-text-secondary">
            {JSON.stringify(state, null, 2)}
          </pre>
        </TabPanel>
      </TabGroup>
    </Panel>
  );
}
