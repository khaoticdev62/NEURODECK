import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  BrainCircuit,
  Clock,
  Cpu,
  HardDrive,
  MessageSquare,
  Play,
  Plus,
  Zap,
} from "lucide-react";
import type { Dispatch } from "react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckState } from "../../types/neurodeck";

interface DashboardMetrics {
  sessionCount: number;
  memoryCount: number;
  modelName: string;
  modelReady: boolean;
  cpuPercent: number;
  ramUsedMb: number;
}

export function DashboardView({
  state,
  dispatch,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, contextStats] = await Promise.all([
        neurodeckApi.diagnostics.get(),
        neurodeckApi.diagnostics.contextStats(),
      ]);
      void contextStats;
      const h = health as { bridge?: string; cpu?: number; ram?: number } | null;
      setMetrics({
        sessionCount: state.sessions.length,
        memoryCount: state.memories.length,
        modelName: state.selectedModelId ?? "No model",
        modelReady: h?.bridge === "ok",
        cpuPercent: h?.cpu ?? 0,
        ramUsedMb: h?.ram ?? 0,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [state.sessions.length, state.memories.length, state.selectedModelId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const recentSessions = state.sessions.slice(0, 4);
  const lastSession = recentSessions[0];

  return (
    <Panel
      eyebrow="Mission Control"
      title="Dashboard"
      data-testid="dashboard-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-6 p-4">
        {/* Hero — resume last session */}
        {lastSession && (
          <section aria-label="Last session">
            <div className="flex items-center justify-between rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/5 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-nd-accent-primary/80">
                  Continue where you left off
                </p>
                <h2 className="mt-1 text-lg font-bold text-nd-text-primary">
                  {lastSession.name ?? "Untitled session"}
                </h2>
                <p className="mt-0.5 text-sm text-nd-text-muted">
                  {lastSession.message_count} messages
                </p>
              </div>
              <Button
                variant="primary"
                icon={Play}
                onClick={() => dispatch?.({ type: "set-view", view: "chat" })}
              >
                Resume
              </Button>
            </div>
          </section>
        )}

        {/* Metrics */}
        <section aria-label="System metrics">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Skeleton className="h-24 rounded-2xl" count={4} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Sessions"
                value={metrics?.sessionCount ?? 0}
                icon={MessageSquare}
                hint="Total sessions"
              />
              <MetricCard
                label="Memory"
                value={metrics?.memoryCount ?? 0}
                icon={BrainCircuit}
                hint="Stored facts"
              />
              <MetricCard
                label="CPU"
                value={`${metrics?.cpuPercent ?? 0}%`}
                icon={Cpu}
                hint="Current usage"
              />
              <MetricCard
                label="RAM"
                value={`${Math.round((metrics?.ramUsedMb ?? 0) / 1024)}GB`}
                icon={HardDrive}
                hint="Memory used"
              />
            </div>
          )}
        </section>

        {/* System readiness */}
        <section aria-label="System readiness">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            System Readiness
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <ReadinessRow
              label="IPC Bridge"
              ok={!error}
              detail={error ? "Connection failed" : "localhost:9477"}
            />
            <ReadinessRow
              label="Model Runtime"
              ok={metrics?.modelReady ?? false}
              detail={metrics?.modelName ?? "No model selected"}
            />
            <ReadinessRow
              label="Memory DB"
              ok={(metrics?.memoryCount ?? 0) >= 0}
              detail={`${metrics?.memoryCount ?? 0} items indexed`}
            />
            <ReadinessRow
              label="Sessions"
              ok={(metrics?.sessionCount ?? 0) >= 0}
              detail={`${metrics?.sessionCount ?? 0} sessions stored`}
            />
          </div>
        </section>

        {/* Recent sessions */}
        <section aria-label="Recent sessions">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-nd-text-muted">
              Recent Sessions
            </h3>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => dispatch?.({ type: "set-view", view: "sessions" })}
            >
              View all
            </Button>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No sessions yet"
              description="Start a chat to create your first session."
              variant="compact"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => dispatch?.({ type: "set-view", view: "chat" })}
                >
                  New Chat
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2" role="list">
              {recentSessions.map((session) => (
                <article
                  key={session.id}
                  role="listitem"
                  className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-3 transition duration-fast hover:border-nd-accent-primary/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-nd-text-primary">
                      {session.name ?? "Untitled"}
                    </p>
                    <p className="text-xs text-nd-text-muted">
                      {session.message_count} msgs
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-3">
                    <Clock className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden />
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => dispatch?.({ type: "set-view", view: "chat" })}
                    >
                      Open
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section aria-label="Quick actions">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => dispatch?.({ type: "set-view", view: "chat" })}
            >
              New Chat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={BrainCircuit}
              onClick={() => dispatch?.({ type: "set-view", view: "memory" })}
            >
              Memory
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Zap}
              onClick={() => dispatch?.({ type: "set-view", view: "agent" })}
            >
              Run Agent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Activity}
              onClick={() => dispatch?.({ type: "set-view", view: "diagnostics" })}
            >
              Diagnostics
            </Button>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function ReadinessRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-3 py-2"
      role="listitem"
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${ok ? "bg-nd-status-success" : "bg-nd-status-error"}`}
          aria-hidden
        />
        <span className="text-sm font-medium text-nd-text-primary">{label}</span>
      </div>
      <StatusChip tone={ok ? "success" : "error"} size="sm">
        {detail}
      </StatusChip>
    </div>
  );
}
