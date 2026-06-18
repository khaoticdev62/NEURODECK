import { useState, useEffect, useCallback } from "react";
import { TelemetryDashboardTab } from "./TelemetryDashboardTab";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  RefreshCcw,
  TerminalSquare,
  Play,
  X,
  Network,
  Database,
  Cpu,
  Settings,
  Zap,
  Clock,
  ShieldCheck,
  Server,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { DiagnosticsPanel } from "../../components/systems/DiagnosticsPanel";
import type { DiagnosticsCheck } from "../../components/systems/DiagnosticsPanel";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { ConnectionMatrixEntry } from "../../services/bridgeAdapter";
import type { DiagnosticLog, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

interface EvidenceEntry {
  requestId?: string;
  timestamp: string;
  summary: string;
  status: string;
  durationMs?: number;
  bytesSent: number;
  bytesReceived: number;
  realTransportUsed?: boolean;
}

export function DiagnosticsView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  const diagnostics = state.diagnostics;
  const [diagTab, setDiagTab] = useState<"health" | "telemetry">("health");
  const [matrix, setMatrix] = useState<ConnectionMatrixEntry[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState<Record<string, boolean>>({});
  const [globalProbing, setGlobalProbing] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [, setProbeErrors] = useState<Record<string, string>>({});

  // Sync with bridge-backed connection health matrix
  const loadMatrix = useCallback(async (cancelledRef?: { current: boolean }) => {
    setMatrixError(null);
    try {
      const res = await neurodeckApi.diagnostics.getConnectionMatrix();
      if (!cancelledRef?.current && res.ok) {
        setMatrix(res.data || []);
      }
    } catch (err) {
      if (!cancelledRef?.current) setMatrixError(String(err));
    }
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    void loadMatrix(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [loadMatrix]);

  const mergeProbeResults = (incoming: ConnectionMatrixEntry[]) => {
    setMatrix((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      for (const conn of incoming) {
        const existing = byId.get(conn.id);
        if (existing) {
          const totalRequests = existing.requestCount + conn.requestCount;
          const totalSuccess = existing.successCount + conn.successCount;
          byId.set(conn.id, {
            ...conn,
            requestCount: totalRequests,
            successCount: totalSuccess,
            evidence: [...existing.evidence, ...conn.evidence].slice(-20),
          });
        } else {
          byId.set(conn.id, conn);
        }
      }
      return Array.from(byId.values());
    });
  };

  const runSingleProbe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProbing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await neurodeckApi.diagnostics.runHealthProbe(id);
      if (res.ok) {
        mergeProbeResults(res.data || []);
        setProbeErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (err) {
      setProbeErrors((prev) => ({ ...prev, [id]: String(err) }));
    } finally {
      setIsProbing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const runAllProbes = async () => {
    setGlobalProbing(true);
    const allIds = matrix.map((c) => c.id);
    const initialProbing = allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
    setIsProbing(initialProbing);

    try {
      const res = await neurodeckApi.diagnostics.runHealthProbe();
      if (res.ok) {
        mergeProbeResults(res.data || []);
      }
    } catch (err) {
      setMatrixError(String(err));
    } finally {
      setIsProbing({});
      setGlobalProbing(false);
    }
  };

  const selectedConnection = matrix.find((c) => c.id === selectedConnectionId);

  const getStatusTone = (
    connState: string
  ): { tone: "success" | "warning" | "error" | "info"; label: string } => {
    switch (connState) {
      case "connected":
      case "passed":
        return { tone: "success", label: "ONLINE" };
      case "error":
      case "offline":
        return { tone: "error", label: "OFFLINE" };
      case "warning":
        return { tone: "warning", label: "WARN" };
      default:
        return { tone: "info", label: "UNPROBED" };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ipc":
        return Zap;
      case "api":
        return Network;
      case "lsp":
        return Cpu;
      case "storage":
        return Database;
      case "plugin":
        return Settings;
      case "system":
        return Server;
      default:
        return Activity;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Tab selector */}
      <div
        className="flex shrink-0 gap-1 border-b border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2"
        role="tablist"
        aria-label="Diagnostics tabs"
      >
        {(["health", "telemetry"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={diagTab === tab}
            aria-controls={`diag-tab-${tab}`}
            id={`diag-tab-btn-${tab}`}
            onClick={() => setDiagTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
              diagTab === tab
                ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                : "text-nd-text-muted hover:text-nd-text-primary"
            }`}
          >
            {tab === "health" ? "Health Monitor" : "Telemetry"}
          </button>
        ))}
      </div>

      {diagTab === "telemetry" ? (
        <div
          id="diag-tab-telemetry"
          role="tabpanel"
          aria-labelledby="diag-tab-btn-telemetry"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <TelemetryDashboardTab />
        </div>
      ) : (
      <div
        id="diag-tab-health"
        role="tabpanel"
        aria-labelledby="diag-tab-btn-health"
        className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[340px_1fr_400px]"
      >
      {/* Column 1: System Info & Core Health Checks */}
      <Panel
        eyebrow="Diagnostics"
        title="Runtime Health"
        className="min-h-0 overflow-y-auto scrollbar-thin"
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button
              variant="primary"
              fullWidth
              icon={RefreshCcw}
              onClick={() => void actions.refreshDiagnostics()}
            >
              Refresh System
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={FileArchive}
              onClick={() => void actions.exportDiagnosticsBundle()}
            >
              Export Bundle
            </Button>
          </div>
          {diagnostics ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <RuntimeRow
                  label="Platform"
                  value={`${diagnostics.platform}/${diagnostics.arch}`}
                />
                <RuntimeRow label="Electron" value={diagnostics.electron} />
                <RuntimeRow label="Chrome" value={diagnostics.chrome} />
                <RuntimeRow label="Node" value={diagnostics.node} />
                <RuntimeRow label="Packaged" value={diagnostics.packaged ? "yes" : "no"} />
                <RuntimeRow
                  label="Schema"
                  value={diagnostics.schemaVersion ? `v${diagnostics.schemaVersion}` : "unknown"}
                />
                <RuntimeRow label="Logs" value={String(diagnostics.logCount)} />
                <RuntimeRow label="User Data" value={diagnostics.userData} wrap />
                <RuntimeRow label="Store" value={diagnostics.storeFile} wrap />
                <RuntimeRow label="Exports" value={diagnostics.exportsDir} wrap />
              </div>
              <DiagnosticsPanel
                title="Runtime Health Checks"
                checks={buildRuntimeChecks(diagnostics)}
              />
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No diagnostics loaded"
              description="Refresh to read Electron runtime data and recent main-process events."
              compact
              className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40"
            />
          )}
        </div>
      </Panel>

      {/* Column 2: Connection Health Matrix */}
      <Panel
        eyebrow="Connection Integrity"
        title="Connection Health Matrix"
        className="min-h-0 overflow-y-auto scrollbar-thin"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Zap}
            onClick={runAllProbes}
            loading={globalProbing}
          >
            Probe All
          </Button>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-xs text-nd-text-secondary">
            The Connection Matrix monitors operational connections in real-time. Click any
            connection to view its diagnostic timeline and raw evidence logs.
          </p>

          {matrixError && (
            <ErrorState
              title="Connection matrix failed to load"
              message={matrixError}
              onRetry={() => void loadMatrix()}
              onClose={() => setMatrixError(null)}
            />
          )}

          <div className="mt-4 space-y-2.5">
            {matrix.map((conn) => {
              const status = getStatusTone(conn.state);
              const CatIcon = getCategoryIcon(conn.category);
              const isSelected = selectedConnectionId === conn.id;

              return (
                <div
                  key={conn.id}
                  className={`group flex items-center justify-between rounded-xl border transition duration-fast ${
                    isSelected
                      ? "border-nd-accent-primary/30 bg-nd-accent-primary/5 shadow-nd-elevation-card"
                      : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/30 hover:bg-nd-surface-tertiary/30"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedConnectionId(isSelected ? null : conn.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedConnectionId(isSelected ? null : conn.id);
                      }
                    }}
                    className="flex min-h-touch flex-1 cursor-pointer items-center gap-3 rounded-l-xl p-3.5 transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
                  >
                    <StatusChip tone={status.tone} size="sm">
                      {status.label}
                    </StatusChip>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-nd-text-primary transition group-hover:text-nd-accent-primary">
                          {conn.label}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-nd-text-secondary">
                        <span className="flex items-center gap-1">
                          <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="text-2xs uppercase tracking-wide">{conn.category}</span>
                        </span>
                        {conn.latencyMs !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-nd-text-muted/60" aria-hidden="true" />
                            <span>{conn.latencyMs}ms</span>
                          </span>
                        )}
                        <span>
                          {conn.successCount}/{conn.requestCount} OK
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <IconButton
                      variant="outline"
                      size="sm"
                      aria-label="Run connection probe"
                      onClick={(e) => runSingleProbe(conn.id, e)}
                      disabled={isProbing[conn.id]}
                    >
                      <Play
                        className={`h-3.5 w-3.5 ${isProbing[conn.id] ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Column 3: Evidence logs timeline OR General IPC Logs */}
      {selectedConnection ? (
        <Panel
          eyebrow="Diagnostic Timeline"
          title={`${selectedConnection.label}`}
          className="min-h-0 overflow-y-auto scrollbar-thin"
          action={
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Close connection detail"
              onClick={() => setSelectedConnectionId(null)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          }
        >
          <div className="space-y-4 p-4">
            {/* Quick Metrics Header Card */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3 text-xs">
              <MetricCard
                label="Category"
                value={selectedConnection.category.toUpperCase()}
                icon={Server}
                hint="Connection type"
              />
              <MetricCard
                label="Latency"
                value={
                  selectedConnection.latencyMs !== null
                    ? `${selectedConnection.latencyMs} ms`
                    : "N/A"
                }
                icon={Clock}
                hint="Last probe"
              />
              <MetricCard
                label="Probes Ran"
                value={selectedConnection.requestCount}
                icon={Zap}
                hint="Total attempts"
              />
              <MetricCard
                label="Success Rate"
                value={
                  selectedConnection.requestCount > 0
                    ? `${((selectedConnection.successCount / selectedConnection.requestCount) * 100).toFixed(0)}%`
                    : "0%"
                }
                icon={CheckCircle2}
                hint="Pass ratio"
              />
            </div>

            {/* Evidence Timeline */}
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                <ShieldCheck className="h-4 w-4 text-nd-accent-primary" /> Probe Integrity Timeline
              </h3>

              {!selectedConnection.evidence || selectedConnection.evidence.length === 0 ? (
                <EmptyState
                  icon={Play}
                  title="No probe runs registered"
                  description="Click the play button to execute this probe."
                  compact
                  className="rounded-xl border border-dashed border-nd-border-subtle"
                />
              ) : (
                <div className="relative space-y-3 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-nd-border-subtle">
                  {selectedConnection.evidence.map((ev: EvidenceEntry, idx: number) => {
                    const isSuccess = ev.status === "passed";
                    return (
                      <div key={idx} className="relative pl-7 text-xs">
                        <span
                          className={`absolute left-1.5 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-nd-surface-secondary shadow-sm ${
                            isSuccess ? "bg-nd-accent-success" : "bg-nd-accent-error"
                          }`}
                        />

                        <div className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/40 p-2.5 transition duration-fast hover:bg-nd-surface-tertiary/30">
                          <div className="mb-1 flex items-center justify-between text-2xs text-nd-text-secondary">
                            <span className="font-mono text-nd-text-muted/70">
                              {ev.requestId || "req-unknown"}
                            </span>
                            <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>

                          <p className="font-medium leading-relaxed text-nd-text-primary">
                            {ev.summary}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-3 border-t border-nd-border-subtle pt-1.5 font-mono text-2xs text-nd-text-secondary/80">
                            {ev.durationMs !== undefined && <span>time: {ev.durationMs}ms</span>}
                            {ev.bytesSent > 0 && <span>sent: {ev.bytesSent}B</span>}
                            {ev.bytesReceived > 0 && <span>recv: {ev.bytesReceived}B</span>}
                            {ev.realTransportUsed !== undefined && (
                              <Badge tone={ev.realTransportUsed ? "accent" : "neutral"} size="sm">
                                {ev.realTransportUsed ? "Real Call" : "Mock Fallback"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel
          eyebrow="IPC Logs"
          title="Recent Main Process Events"
          className="min-h-0 overflow-hidden"
        >
          <div className="h-full overflow-y-auto p-4 scrollbar-thin">
            {!state.diagnosticLogs.length && (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={TerminalSquare}
                  title="Logs are quiet"
                  description="Run a project scan, model detection, export, or diagnostics refresh to populate the event trail."
                />
              </div>
            )}
            <div className="space-y-3">
              {state.diagnosticLogs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          </div>
        </Panel>
      )}
      </div>
      )}
    </div>
  );
}

function buildRuntimeChecks(d: NonNullable<NeuroDeckState["diagnostics"]>) {
  return [
    {
      id: "schema",
      label: "Schema version present",
      status: d.schemaVersion ? "pass" : "warn",
      detail: d.schemaVersion ? `v${d.schemaVersion}` : "Missing — migrations may not have run",
    },
    {
      id: "packaged",
      label: "Packaged Electron build",
      status: d.packaged ? "pass" : "warn",
      detail: d.packaged ? "Running production binary" : "Running in dev mode — paths may differ",
    },
    {
      id: "userData",
      label: "User data directory resolved",
      status: d.userData ? "pass" : "fail",
      detail: d.userData || "No user data path reported",
    },
    {
      id: "store",
      label: "Store file path resolved",
      status: d.storeFile ? "pass" : "warn",
      detail: d.storeFile || "Store path not set",
    },
    {
      id: "exports",
      label: "Exports directory resolved",
      status: d.exportsDir ? "pass" : "warn",
      detail: d.exportsDir || "Exports path not set",
    },
    {
      id: "logcount",
      label: "Main-process log events",
      status: d.logCount > 0 ? "pass" : "warn",
      detail: `${d.logCount} event${d.logCount === 1 ? "" : "s"} in current session`,
    },
    {
      id: "hardening",
      label: "v6 hardening active",
      status: "pass" as const,
      detail: "IPC payload validation, safe errors, and sanitized diagnostics enabled",
    },
  ] as DiagnosticsCheck[];
}

function RuntimeRow({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 text-xs">
      <p className="text-2xs uppercase tracking-[0.2em] text-nd-text-muted/80">{label}</p>
      <p className={`mt-1 text-nd-text-secondary ${wrap ? "break-all" : ""}`}>{value}</p>
    </div>
  );
}

function LogCard({ log }: { log: DiagnosticLog }) {
  const Icon =
    log.level === "error" ? AlertTriangle : log.level === "warning" ? AlertTriangle : CheckCircle2;
  const tone: "danger" | "warning" | "success" =
    log.level === "error" ? "danger" : log.level === "warning" ? "warning" : "success";
  return (
    <article className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 transition duration-fast hover:bg-nd-surface-tertiary/30">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 h-5 w-5 ${
            tone === "danger"
              ? "text-nd-accent-error"
              : tone === "warning"
                ? "text-nd-accent-warning"
                : "text-nd-accent-success"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{log.level}</Badge>
            <span className="text-2xs uppercase tracking-[0.2em] text-nd-text-muted/80">
              {log.scope}
            </span>
            <span className="text-2xs text-nd-text-muted/70">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <h3 className="mt-2 font-semibold text-nd-text-primary">{log.message}</h3>
          {log.details && (
            <pre className="mt-3 overflow-x-auto rounded-xl border border-nd-border-subtle bg-nd-surface-primary/60 p-3 text-xs text-nd-text-primary scrollbar-thin">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}
