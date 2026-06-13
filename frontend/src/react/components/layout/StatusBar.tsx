import type { NeuroDeckState, ToolStatus } from "../../types/neurodeck";
import { StatusChip } from "../primitives/StatusChip";
import { Skeleton } from "../primitives/Skeleton";
import {
  Activity,
  Brain,
  Cpu,
  HardDrive,
  Monitor,
  Server,
  ShieldAlert,
  RefreshCw,
  Zap,
} from "lucide-react";

function toneFromConnection(status: string): "success" | "warning" | "error" | "info" {
  const s = status.toLowerCase();
  if (s === "healthy" || s === "ok" || s === "ready") return "success";
  if (s === "degraded" || s === "warning") return "warning";
  if (s === "critical" || s === "error") return "error";
  return "info";
}

function toneFromTool(tool: ToolStatus | null | undefined): "success" | "warning" | "error" | "info" {
  if (!tool) return "info";
  if (tool.state === "working") return "info";
  if (tool.state === "error") return "error";
  return "success";
}

function shortSessionId(id: string): string {
  if (!id) return "—";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function StatusBar({ state }: { state: NeuroDeckState }) {
  const bar = state.statusBar;

  if (!state.hydrated) {
    return (
      <div
        role="status"
        aria-label="Loading status"
        className="flex h-9 shrink-0 items-center gap-3 border-t border-nd-border-subtle bg-nd-surface-base/80 px-3 backdrop-blur-sm"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-4 w-40" />
      </div>
    );
  }

  if (!bar?.connection) {
    return (
      <div
        role="status"
        aria-label="Status unavailable"
        className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-nd-border-subtle bg-nd-surface-base/80 px-3 text-xs text-nd-text-muted backdrop-blur-sm"
      >
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          Bridge offline
        </span>
        <span>NEURODECK</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="System status"
      className="flex h-9 shrink-0 items-center gap-2 overflow-hidden border-t border-nd-border-subtle bg-nd-surface-base/80 px-2 text-xs text-nd-text-secondary backdrop-blur-sm"
    >
      {/* Connection / AI */}
      <StatusChip
        tone={toneFromConnection(bar.connection.status)}
        size="sm"
        pulse={bar.connection.status.toLowerCase() !== "healthy"}
      >
        {bar.connection.status}
      </StatusChip>
      <span className="hidden whitespace-nowrap sm:inline-flex items-center gap-1">
        <Cpu className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
        {bar.ai.provider}/{bar.ai.model || "default"}
      </span>
      <span className="hidden whitespace-nowrap md:inline-flex items-center gap-1">
        <Monitor className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
        {bar.ai.active_persona || "Default"}
      </span>

      <span className="mx-1 hidden h-4 w-px bg-nd-border-subtle sm:block" aria-hidden="true" />

      {/* Session */}
      <span
        className="hidden whitespace-nowrap sm:inline-flex items-center gap-1"
        title={bar.session.id}
      >
        <Zap className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
        {shortSessionId(bar.session.id)}
        <span className="rounded bg-nd-surface-raised px-1 text-[10px] text-nd-text-muted">
          {bar.session.message_count}
        </span>
      </span>

      <span className="mx-1 hidden h-4 w-px bg-nd-border-subtle sm:block" aria-hidden="true" />

      {/* Memory */}
      <span className="inline-flex items-center gap-1" title="Memory records">
        <Brain className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
        <span className={bar.memory.ready ? "text-nd-accent-success" : "text-nd-text-muted"}>
          {bar.memory.count}
        </span>
      </span>

      {/* Tools */}
      {bar.tools?.label && (
        <StatusChip
          tone={toneFromTool(bar.tools)}
          size="sm"
          pulse={bar.tools.state === "working"}
        >
          {bar.tools.label}
        </StatusChip>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* PTY */}
        {bar.pty.session_count > 0 && (
          <span className="inline-flex items-center gap-1" title="PTY sessions">
            <HardDrive className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
            {bar.pty.session_count}
          </span>
        )}

        {/* Transfers */}
        {bar.transfer.active_count > 0 && (
          <span className="inline-flex items-center gap-1" title="Active transfers">
            <RefreshCw className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
            {bar.transfer.active_count}
          </span>
        )}

        {/* MCP */}
        {bar.mcp.running && (
          <StatusChip tone="info" size="sm" pulse>
            MCP
          </StatusChip>
        )}

        {/* Remote server */}
        {bar.remote.server_running && (
          <span className="inline-flex items-center gap-1 text-nd-accent-success" title="Remote server running">
            <Server className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Remote</span>
          </span>
        )}

        {/* Sync */}
        {bar.sync.enabled && (
          <StatusChip
            tone={bar.sync.syncing ? "info" : bar.sync.last_error ? "warning" : "success"}
            size="sm"
            pulse={bar.sync.syncing}
          >
            {bar.sync.syncing ? "Sync" : bar.sync.last_error ? "Sync warn" : "Sync"}
          </StatusChip>
        )}

        {/* Safe mode */}
        {bar.safe_mode && (
          <span className="inline-flex items-center gap-1 text-nd-accent-warning" title="Safe mode active">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Safe</span>
          </span>
        )}
      </div>
    </div>
  );
}
