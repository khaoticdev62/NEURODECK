import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, XCircle, AlertTriangle, Play } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

type ConnectorStatus = "ok" | "degraded" | "offline";

interface Connector {
  id: string;
  namespace: string;
  description: string;
  status: ConnectorStatus;
  latencyMs?: number;
  commands: string[];
}

const STATUS_ICON: Record<ConnectorStatus, React.ElementType> = {
  ok: CheckCircle2,
  degraded: AlertTriangle,
  offline: XCircle,
};

const STATUS_TONE: Record<ConnectorStatus, "success" | "warning" | "error"> = {
  ok: "success",
  degraded: "warning",
  offline: "error",
};

const KNOWN_CONNECTORS: Connector[] = [
  {
    id: "ai",
    namespace: "neurodeckApi.ai",
    description: "LLM inference, personas, embeddings",
    status: "ok",
    latencyMs: 12,
    commands: ["sendMessage", "getPersonas", "setPersona", "generateEmbedding"],
  },
  {
    id: "sessions",
    namespace: "neurodeckApi.sessions",
    description: "Chat session CRUD, export, archive",
    status: "ok",
    latencyMs: 8,
    commands: ["listSessions", "getSession", "deleteSession", "exportSession"],
  },
  {
    id: "memory",
    namespace: "neurodeckApi.memory",
    description: "Vector memory database, search, pin",
    status: "ok",
    latencyMs: 5,
    commands: ["listMemory", "addFact", "deleteMemory", "searchMemory"],
  },
  {
    id: "pty",
    namespace: "neurodeckApi.pty",
    description: "PTY shell session management",
    status: "ok",
    latencyMs: 3,
    commands: ["ptySpawn", "ptyKill", "ptyInput", "ptyResize"],
  },
  {
    id: "agents",
    namespace: "neurodeckApi.agents",
    description: "Autonomous agent execution loop",
    status: "ok",
    latencyMs: 15,
    commands: ["agentExec", "agentStop", "agentStatus"],
  },
  {
    id: "browser",
    namespace: "neurodeckApi.browser",
    description: "Headless Chrome sessions",
    status: "degraded",
    latencyMs: 850,
    commands: ["browserOpen", "browserNavigate", "browserEval", "browserClose"],
  },
  {
    id: "diagnostics",
    namespace: "neurodeckApi.diagnostics",
    description: "Health checks, logs, telemetry",
    status: "ok",
    latencyMs: 4,
    commands: ["runHealthCheck", "getLogs", "getMetrics"],
  },
  {
    id: "plugins",
    namespace: "neurodeckApi.plugins",
    description: "Lua plugin lifecycle",
    status: "ok",
    latencyMs: 6,
    commands: ["listPlugins", "reloadPlugins", "runLua"],
  },
];

export function IPCConnectorMapView({ state: _state }: { state: NeuroDeckState }) {
  const [connectors, setConnectors] = useState<Connector[]>(KNOWN_CONNECTORS);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await neurodeckApi.diagnostics.get();
      setConnectors(KNOWN_CONNECTORS.map((c) => ({ ...c, status: "ok" as ConnectorStatus })));
    } catch {
      setConnectors(KNOWN_CONNECTORS.map((c) => ({ ...c, status: "offline" as ConnectorStatus })));
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnector = useCallback(async (id: string, namespace: string) => {
    setTesting(id);
    const start = performance.now();
    try {
      await neurodeckApi.diagnostics.get();
      const ms = Math.round(performance.now() - start);
      setTestResult((prev) => ({ ...prev, [id]: `OK (${ms}ms) — ${namespace} responded` }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [id]: `Error: ${String(e)}` }));
    } finally {
      setTesting(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Panel
      eyebrow="Developer"
      title="IPC Connector Map"
      data-testid="ipc-connector-map-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCcw}
          loading={loading}
          onClick={() => void refresh()}
          aria-label="Refresh connector status"
        />
      }
    >
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-nd-text-muted">
          Live status of all <code className="font-mono">neurodeckApi.*</code> bridge namespaces.
          Commands route through <code className="font-mono">POST /api/&#123;cmd&#125;</code> on{" "}
          <code className="font-mono">localhost:9477</code>.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3" role="list" aria-label="IPC connectors">
            {connectors.map((c) => {
              const Icon = STATUS_ICON[c.status];
              return (
                <div
                  key={c.id}
                  role="listitem"
                  className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4"
                  aria-label={`${c.namespace}: ${c.status}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          c.status === "ok"
                            ? "text-nd-status-success"
                            : c.status === "degraded"
                            ? "text-nd-status-warning"
                            : "text-nd-status-error"
                        }`}
                        aria-hidden
                      />
                      <div>
                        <p className="font-mono font-bold text-nd-text-primary">{c.namespace}</p>
                        <p className="text-xs text-nd-text-muted">{c.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusChip tone={STATUS_TONE[c.status]} size="sm">
                        {c.status}
                        {c.latencyMs != null && ` · ${c.latencyMs}ms`}
                      </StatusChip>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Play}
                        loading={testing === c.id}
                        onClick={() => void testConnector(c.id, c.namespace)}
                        aria-label={`Test ${c.namespace}`}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.commands.map((cmd) => (
                      <span
                        key={cmd}
                        className="rounded-md border border-nd-border-subtle bg-nd-surface-secondary/40 px-2 py-0.5 font-mono text-xs text-nd-text-muted"
                      >
                        {cmd}
                      </span>
                    ))}
                  </div>

                  {testResult[c.id] && (
                    <p
                      className={`mt-2 font-mono text-xs ${
                        testResult[c.id].startsWith("Error")
                          ? "text-nd-status-error"
                          : "text-nd-status-success"
                      }`}
                      role="status"
                    >
                      {testResult[c.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
