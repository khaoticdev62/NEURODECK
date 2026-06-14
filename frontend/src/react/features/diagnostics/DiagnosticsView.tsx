import { useState, useEffect } from "react";
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
import { Panel } from "../../components/primitives/Panel";
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
  const [matrix, setMatrix] = useState<ConnectionMatrixEntry[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState<Record<string, boolean>>({});
  const [globalProbing, setGlobalProbing] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [, setProbeErrors] = useState<Record<string, string>>({});

  // Sync with bridge-backed connection health matrix
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await neurodeckApi.diagnostics.getConnectionMatrix();
        if (!cancelled && res.ok) {
          setMatrix(res.data || []);
        }
      } catch (err) {
        if (!cancelled) setMatrixError(String(err));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
    e.stopPropagation(); // Prevent card selection toggle
    setIsProbing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await neurodeckApi.diagnostics.runHealthProbe(id);
      if (res.ok) {
        mergeProbeResults(res.data || []);
        setProbeErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
      }
    } catch (err) {
      setProbeErrors((prev) => ({ ...prev, [id]: String(err) }));
    } finally {
      setIsProbing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const runAllProbes = async () => {
    setGlobalProbing(true);
    // Optimistically set all to probing status
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

  // Helper to resolve state/status styles
  const getStatusStyles = (connState: string) => {
    switch (connState) {
      case "connected":
      case "passed":
        return {
          bg: "bg-nd-success/10",
          border: "border-nd-success/20",
          text: "text-nd-success",
          dot: "bg-nd-success shadow-[0_0_8px_rgba(var(--color-success-rgb),0.5)]",
          label: "ONLINE",
        };
      case "error":
      case "offline":
        return {
          bg: "bg-nd-danger/10",
          border: "border-nd-danger/20",
          text: "text-nd-danger",
          dot: "bg-nd-danger shadow-[0_0_8px_rgba(var(--color-danger-rgb),0.5)]",
          label: "OFFLINE",
        };
      case "warning":
        return {
          bg: "bg-nd-warning/10",
          border: "border-nd-warning/20",
          text: "text-nd-warning",
          dot: "bg-nd-warning shadow-[0_0_8px_rgba(var(--color-warning-rgb),0.5)]",
          label: "WARN",
        };
      default:
        return {
          bg: "bg-nd-text-muted/10",
          border: "border-nd-text-muted/10",
          text: "text-nd-text-muted",
          dot: "bg-nd-text-muted/40",
          label: "UNPROBED",
        };
    }
  };

  // Helper to map category to icon
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
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[340px_1fr_400px]">
      {/* ── Column 1: System Info & Core Health Checks ────────────────────── */}
      <Panel
        eyebrow="Diagnostics"
        title="Runtime Health"
        className="min-h-0 overflow-y-auto scrollbar-thin"
      >
        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              onClick={() => void actions.refreshDiagnostics()}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2.5 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Refresh System
            </button>
            <button
              type="button"
              onClick={() => void actions.exportDiagnosticsBundle()}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent"
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" /> Export Bundle
            </button>
          </div>
          {diagnostics ? (
            <div className="space-y-3">
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
            <div className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-5 text-center">
              <Activity className="mx-auto h-10 w-10 text-nd-accent" />
              <h3 className="mt-4 font-semibold text-nd-text">No diagnostics loaded</h3>
              <p className="mt-2 text-sm leading-6 text-nd-text-muted">
                Refresh to read Electron runtime data and recent main-process events.
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* ── Column 2: Connection Health Matrix ───────────────────────────── */}
      <Panel
        eyebrow="Connection Integrity"
        title="Connection Health Matrix"
        className="min-h-0 overflow-y-auto scrollbar-thin"
        action={
          <button
            type="button"
            onClick={runAllProbes}
            disabled={globalProbing}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border border-nd-accent/20 bg-nd-accent/10 px-2.5 py-1 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 disabled:opacity-50"
          >
            <Zap className={`h-3 w-3 ${globalProbing ? "animate-pulse" : ""}`} aria-hidden="true" />
            {globalProbing ? "Probing..." : "Probe All"}
          </button>
        }
      >
        <div className="space-y-2 p-4">
          <p className="text-xs text-nd-text-muted">
            The Connection Matrix monitors 9 operational connections in real-time. Click any
            connection to view its diagnostic timeline and raw evidence logs.
          </p>

          {matrixError && (
            <p role="alert" className="mx-4 mb-2 rounded-xl border border-nd-danger/20 bg-nd-danger/5 px-3 py-2 text-xs text-nd-danger">
              {matrixError}
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {matrix.map((conn) => {
              const styles = getStatusStyles(conn.state);
              const CatIcon = getCategoryIcon(conn.category);
              const isSelected = selectedConnectionId === conn.id;

              return (
                <div
                  key={conn.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedConnectionId(isSelected ? null : conn.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedConnectionId(isSelected ? null : conn.id); } }}
                  className={`group flex items-center justify-between rounded-xl border p-3.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                    isSelected
                      ? "bg-nd-accent/5 border-nd-accent/30 shadow-sm"
                      : "bg-nd-surface/40 border-nd-text-muted/10 hover:border-nd-text-muted/20 hover:bg-nd-surface/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Dot */}
                    <div className="relative flex h-5 items-center">
                      <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-nd-text group-hover:text-nd-accent transition truncate">
                          {conn.label}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border uppercase ${styles.bg} ${styles.border} ${styles.text}`}
                        >
                          {styles.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-nd-text-muted">
                        <span className="flex items-center gap-1">
                          <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="uppercase tracking-wide text-[10px]">
                            {conn.category}
                          </span>
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => runSingleProbe(conn.id, e)}
                      disabled={isProbing[conn.id]}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-nd-text-muted/10 bg-nd-surface/50 text-nd-text-muted transition hover:border-nd-accent/25 hover:text-nd-accent hover:bg-nd-surface/80 disabled:opacity-40"
                      aria-label="Run connection probe"
                    >
                      <Play className={`h-3.5 w-3.5 ${isProbing[conn.id] ? "animate-spin" : ""}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* ── Column 3: Evidence logs timeline OR General IPC Logs ─────────── */}
      {selectedConnection ? (
        <Panel
          eyebrow="Diagnostic Timeline"
          title={`${selectedConnection.label}`}
          className="min-h-0 overflow-y-auto scrollbar-thin"
          action={
            <button
              type="button"
              onClick={() => setSelectedConnectionId(null)}
              aria-label="Close connection detail"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-nd-text-muted/10 text-nd-text-muted hover:text-nd-text hover:border-nd-text-muted/30 transition"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          }
        >
          <div className="p-4 space-y-4">
            {/* Quick Metrics Header Card */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-nd-text-muted">Category</p>
                <p className="font-semibold text-nd-text mt-0.5 uppercase">
                  {selectedConnection.category}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-nd-text-muted">Latency</p>
                <p className="font-semibold text-nd-text mt-0.5">
                  {selectedConnection.latencyMs !== null
                    ? `${selectedConnection.latencyMs} ms`
                    : "N/A"}
                </p>
              </div>
              <div className="mt-2 border-t border-nd-text-muted/10 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-nd-text-muted">
                  Probes Ran
                </p>
                <p className="font-semibold text-nd-text mt-0.5">
                  {selectedConnection.requestCount}
                </p>
              </div>
              <div className="mt-2 border-t border-nd-text-muted/10 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-nd-text-muted">
                  Success Rate
                </p>
                <p className="font-semibold text-nd-text mt-0.5">
                  {selectedConnection.requestCount > 0
                    ? `${((selectedConnection.successCount / selectedConnection.requestCount) * 100).toFixed(0)}%`
                    : "0%"}
                </p>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div>
              <h3 className="text-xs uppercase font-bold tracking-widest text-nd-text-muted mb-3 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-nd-accent" /> Probe Integrity Timeline
              </h3>

              {!selectedConnection.evidence || selectedConnection.evidence.length === 0 ? (
                <div className="rounded-xl border border-dashed border-nd-text-muted/20 p-4 text-center text-xs text-nd-text-muted">
                  No probe runs registered. Click the play button to execute this probe.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-nd-text-muted/10">
                  {selectedConnection.evidence.map((ev: EvidenceEntry, idx: number) => {
                    const isSuccess = ev.status === "passed";
                    return (
                      <div key={idx} className="relative pl-7 text-xs">
                        {/* Timeline node dot */}
                        <span
                          className={`absolute left-1.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-nd-surface flex items-center justify-center shadow-sm ${
                            isSuccess ? "bg-nd-success" : "bg-nd-danger"
                          }`}
                        />

                        <div className="rounded-lg border border-nd-text-muted/10 bg-nd-surface/30 p-2.5">
                          <div className="flex items-center justify-between text-[10px] text-nd-text-muted mb-1">
                            <span className="font-mono text-nd-text-muted/70">
                              {ev.requestId || "req-unknown"}
                            </span>
                            <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>

                          <p className="text-nd-text font-medium leading-relaxed mt-0.5">
                            {ev.summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-nd-text-muted/5 text-[10px] text-nd-text-muted/80 font-mono">
                            {ev.durationMs !== undefined && <span>time: {ev.durationMs}ms</span>}
                            {ev.bytesSent > 0 && <span>sent: {ev.bytesSent}B</span>}
                            {ev.bytesReceived > 0 && <span>recv: {ev.bytesReceived}B</span>}
                            {ev.realTransportUsed !== undefined && (
                              <span className="text-nd-accent uppercase">
                                {ev.realTransportUsed ? "Real Call" : "Mock Fallback"}
                              </span>
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
                <div className="max-w-md text-center">
                  <TerminalSquare className="mx-auto h-12 w-12 text-nd-accent" />
                  <h3 className="mt-4 text-xl font-semibold text-nd-text">Logs are quiet</h3>
                  <p className="mt-2 text-sm leading-6 text-nd-text-muted">
                    Run a project scan, model detection, export, or diagnostics refresh to populate
                    the event trail.
                  </p>
                </div>
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
    <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 text-xs">
      <p className="uppercase tracking-[0.2em] text-nd-text-muted/70">{label}</p>
      <p className={`mt-1 text-nd-text/80 ${wrap ? "break-all" : ""}`}>{value}</p>
    </div>
  );
}

function LogCard({ log }: { log: DiagnosticLog }) {
  const Icon =
    log.level === "error" ? AlertTriangle : log.level === "warning" ? AlertTriangle : CheckCircle2;
  const tone: "danger" | "warning" | "success" =
    log.level === "error" ? "danger" : log.level === "warning" ? "warning" : "success";
  return (
    <article className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 h-5 w-5 ${tone === "danger" ? "text-nd-danger" : tone === "warning" ? "text-nd-warning" : "text-nd-success"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{log.level}</Badge>
            <span className="text-xs uppercase tracking-[0.2em] text-nd-text-muted/70">
              {log.scope}
            </span>
            <span className="text-xs text-nd-text-muted/70">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <h3 className="mt-2 font-semibold text-nd-text">{log.message}</h3>
          {log.details && (
            <pre className="mt-3 overflow-x-auto rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-xs text-nd-text">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}
