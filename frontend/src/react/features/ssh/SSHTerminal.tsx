import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plug, Unplug, AlertTriangle } from "lucide-react";
import { TerminalViewport } from "../terminal/TerminalViewport";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { TerminalSession } from "../../../../../src/shared/terminal/terminalContracts";

type PaneRuntime = TerminalSession & {
  sessionId: string;
  output: string[];
  stateMessage?: string;
  lastExitReason?: string;
  lastErrorMessage?: string;
  startedAt?: string;
  lastActivityAt?: string;
  recoveryCount: number;
  commandCount: number;
  active: boolean;
};

export type SSHConnectionConfig = {
  host: string;
  port: number;
  user: string;
  authType: "password" | "key";
  password?: string;
  keyPath?: string;
};

type Props = {
  config: SSHConnectionConfig;
  onClose: () => void;
};

function createSessionId() {
  return `ssh_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function createPane(sessionId: string, config: SSHConnectionConfig): PaneRuntime {
  const args = ["-p", String(config.port), "-o", "StrictHostKeyChecking=accept-new"];
  if (config.authType === "key" && config.keyPath) {
    args.push("-i", config.keyPath);
  }
  args.push(`${config.user}@${config.host}`);

  return {
    id: sessionId,
    sessionId,
    tabId: sessionId,
    paneId: sessionId,
    title: `SSH ${config.user}@${config.host}`,
    cwd: "",
    shell: "ssh",
    shellArgs: args,
    profileId: "ssh",
    state: "created",
    cols: 80,
    rows: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    commandCount: 0,
    diagnostics: {
      bytesIn: 0,
      bytesOut: 0,
      crashCount: 0,
      recoveryCount: 0,
    },
    output: [],
    recoveryCount: 0,
    active: true,
  };
}

export function SSHTerminal({ config, onClose }: Props) {
  const sessionIdRef = useRef<string>(createSessionId());
  const [pane, setPane] = useState<PaneRuntime>(() => createPane(sessionIdRef.current, config));
  const [status, setStatus] = useState<string>("connecting");
  const [autoConnected, setAutoConnected] = useState(false);

  const autoInputs = useMemo(() => {
    if (config.authType !== "password" || !config.password) return undefined;
    return [
      {
        pattern: /password:\s*$/i,
        input: `${config.password}\r`,
        once: true,
      },
    ];
  }, [config.authType, config.password]);

  const patchPane = useCallback((patch: Partial<PaneRuntime>) => {
    setPane((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const handleDisconnect = useCallback(async () => {
    await neurodeckApi.terminal.kill(sessionIdRef.current).catch(() => {});
    onClose();
  }, [onClose]);

  useEffect(() => {
    // Ensure any previous session with this id is gone before the viewport spawns.
    neurodeckApi.terminal.kill(sessionIdRef.current).catch(() => {});
    return () => {
      neurodeckApi.terminal.kill(sessionIdRef.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (pane.state === "running" && !autoConnected) {
      setAutoConnected(true);
      setStatus("connected");
    } else if (pane.state === "exited") {
      setStatus("disconnected");
    } else if (pane.state === "error") {
      setStatus("error");
    }
  }, [pane.state, autoConnected]);

  const statusTone =
    status === "connected"
      ? "border-nd-success/30 bg-nd-success/10 text-nd-success"
      : status === "error"
        ? "border-nd-danger/30 bg-nd-danger/10 text-nd-danger"
        : status === "connecting"
          ? "border-nd-warning/30 bg-nd-warning/10 text-nd-warning"
          : "border-nd-text-muted/15 bg-nd-surface/40 text-nd-text-muted";

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
      <div className="flex items-center justify-between border-b border-nd-text-muted/15 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          {status === "connected" ? (
            <Plug className="h-4 w-4 text-nd-success" aria-hidden="true" />
          ) : status === "error" ? (
            <AlertTriangle className="h-4 w-4 text-nd-danger" aria-hidden="true" />
          ) : (
            <Plug className="h-4 w-4 text-nd-warning" aria-hidden="true" />
          )}
          <span className="truncate font-semibold text-nd-text">
            {config.user}@{config.host}:{config.port}
          </span>
          <span className={`rounded-full border px-2 py-0.5 ${statusTone}`}>{status}</span>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nd-danger/25 bg-nd-danger/10 px-3 py-1.5 text-xs font-semibold text-nd-danger hover:bg-nd-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
        >
          <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
          Disconnect
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <TerminalViewport
          pane={pane}
          profile={null}
          environment={null}
          active={true}
          onFocus={() => {}}
          onPanePatch={patchPane}
          onPaneOutput={() => {}}
          onCommandSubmitted={() => {}}
          onRequestRestart={() => {
            patchPane({
              state: "created",
              output: [],
              lastErrorMessage: undefined,
              lastExitReason: undefined,
            });
            setStatus("connecting");
            setAutoConnected(false);
          }}
          onRequestClear={() => {}}
          onRequestClose={handleDisconnect}
          autoInputs={autoInputs}
        />
      </div>
    </div>
  );
}
