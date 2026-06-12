import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { AlertTriangle, Copy, RefreshCw, Trash2 } from "lucide-react";
import { listenBridge, neurodeckApi } from "../../services/bridgeAdapter";
import type { TerminalSession } from "../../../../../src/shared/terminal/terminalContracts";
import type { TerminalEnvironmentReport } from "../../../../../src/shared/terminal/terminalDiagnosticsTypes";
import type { TerminalProfileAvailability } from "../../../../../src/shared/terminal/terminalProfiles";

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

type Props = {
  pane: PaneRuntime;
  profile: TerminalProfileAvailability | null;
  environment: TerminalEnvironmentReport | null;
  active: boolean;
  onFocus: () => void;
  onPanePatch: (patch: Partial<PaneRuntime>) => void;
  onPaneOutput: (chunk: string) => void;
  onCommandSubmitted: (command: string) => void;
  onRequestRestart: () => void;
  onRequestClear: () => void;
  onRequestClose: () => void;
};

function fallbackShell(profile: TerminalProfileAvailability | null, environment: TerminalEnvironmentReport | null) {
  if (profile?.shellAvailable) return profile.detectedPath ?? profile.shellPath;
  const plat = environment?.platform ?? "";
  if (plat.includes("win")) return "powershell.exe";
  if (plat === "darwin" || plat.includes("Mac")) return "/bin/zsh";
  return "/bin/bash";
}

function selectedText(term: XTerm | null) {
  return term?.getSelection?.() ?? "";
}

export function TerminalViewport({
  pane,
  profile,
  environment,
  active,
  onFocus,
  onPanePatch,
  onPaneOutput,
  onCommandSubmitted,
  onRequestRestart,
  onRequestClear,
  onRequestClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");
  const [status, setStatus] = useState<string>(pane.stateMessage ?? "starting");

  const shell = useMemo(() => fallbackShell(profile, environment), [environment, profile]);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new XTerm({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 13,
      scrollback: 4000,
      convertEol: true,
      theme: {
        background: "#0A0D10",
        foreground: "#E8F4FF",
        cursor: "#5EEBFF",
        selectionBackground: "rgba(94, 235, 255, 0.25)",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    term.onData(async (data) => {
      if (data === "\r" || data === "\n") {
        const command = bufferRef.current.trim();
        if (command) onCommandSubmitted(command);
        bufferRef.current = "";
      } else if (data === "\u007f" || data === "\b") {
        bufferRef.current = bufferRef.current.slice(0, -1);
      } else if (data.length > 1 && data.includes("\n")) {
        const pieces = data.split(/\r?\n/);
        for (const [index, piece] of pieces.entries()) {
          if (index < pieces.length - 1) {
            const command = `${bufferRef.current}${piece}`.trim();
            if (command) onCommandSubmitted(command);
            bufferRef.current = "";
          } else {
            bufferRef.current += piece;
          }
        }
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
        bufferRef.current += data;
      }

      await neurodeckApi.terminal.write(pane.sessionId, data).catch((error) => {
        onPanePatch({ lastErrorMessage: String(error), state: "error" });
      });
    });

    term.attachCustomKeyEventHandler((event) => {
      if (event.key === "Escape" && event.type === "keydown" && !active) {
        onFocus();
      }
      return true;
    });

    termRef.current = term;
    fitRef.current = fit;
    (window as Window & { __terminalInstances?: Record<string, { fit?: () => void; clear?: () => void; focus?: () => void; term?: XTerm }> }).__terminalInstances ??= {};
    (window as Window & { __terminalInstances?: Record<string, { fit?: () => void; clear?: () => void; focus?: () => void; term?: XTerm }> }).__terminalInstances![pane.id] = {
      fit: () => {
        try {
          fit.fit();
          const dims = fit.proposeDimensions();
          if (dims) {
            void neurodeckApi.terminal.resize(pane.sessionId, dims.cols, dims.rows);
          }
        } catch {
          // ignore fit failures
        }
      },
      clear: () => term.clear(),
      focus: () => term.focus(),
      term,
    };

    return () => {
      const instances = (window as Window & { __terminalInstances?: Record<string, { fit?: () => void; clear?: () => void; focus?: () => void; term?: XTerm }> }).__terminalInstances;
      if (instances) delete instances[pane.id];
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [active, onCommandSubmitted, onFocus, onPanePatch, pane.id, pane.sessionId]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const fit = fitRef.current;
    const applyFit = () => {
      try {
        fit?.fit();
        const dims = fit?.proposeDimensions();
        if (dims) void neurodeckApi.terminal.resize(pane.sessionId, dims.cols, dims.rows);
      } catch {
        // ignore resize failures
      }
    };

    applyFit();
    const resize = () => applyFit();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [pane.sessionId]);

  useEffect(() => {
    if (pane.state === "created" || pane.state === "recovering") {
      const run = async () => {
        try {
          onPanePatch({ state: "starting", stateMessage: "Spawning PTY..." });
          const dims = fitRef.current?.proposeDimensions();
          const cols = dims?.cols ?? pane.cols ?? 80;
          const rows = dims?.rows ?? pane.rows ?? 24;
          const spawnShell = shell || pane.shell || "/bin/sh";
          await neurodeckApi.terminal.spawn(pane.sessionId, spawnShell, {
            cols,
            rows,
            cwd: pane.cwd,
            title: pane.title,
            profileId: pane.profileId,
            tabId: pane.tabId,
            paneId: pane.id,
            args: pane.shellArgs,
          });
          onPanePatch({
            shell: spawnShell,
            cols,
            rows,
            state: "running",
            startedAt: new Date().toISOString(),
            stateMessage: "PTY running",
            lastErrorMessage: undefined,
          });
          setStatus("running");
        } catch (error) {
          const message = String(error);
          onPanePatch({
            state: "error",
            stateMessage: "Failed to start PTY",
            lastErrorMessage: message,
          });
          setStatus("error");
        }
      };
      void run();
    }
  }, [pane.cols, pane.cwd, pane.id, pane.profileId, pane.rows, pane.sessionId, pane.shell, pane.shellArgs, pane.state, pane.tabId, pane.title, onPanePatch, shell]);

  useEffect(() => {
    const unsubOutput = listenBridge("pty_output", (payload) => {
      const data = payload as { id?: string; data?: string };
      if (data?.id !== pane.sessionId || typeof data.data !== "string") return;
      termRef.current?.write(data.data);
      onPaneOutput(data.data);
      onPanePatch({
        state: "running",
        lastActivityAt: new Date().toISOString(),
      });
    });

    const unsubExit = listenBridge("pty_exit", (payload) => {
      const data = payload as { id?: string; reason?: string };
      if (data?.id !== pane.sessionId) return;
      onPanePatch({
        state: "exited",
        lastExitReason: data.reason ?? "exited",
        stateMessage: `Session exited: ${data.reason ?? "exited"}`,
      });
      setStatus("exited");
    });

    return () => {
      unsubOutput();
      unsubExit();
    };
  }, [onPaneOutput, onPanePatch, pane.diagnostics, pane.sessionId]);

  useEffect(() => {
    if (!active) return;
    termRef.current?.focus();
  }, [active]);

  const copySelection = async () => {
    const text = selectedText(termRef.current);
    if (!text) return;
    await navigator.clipboard.writeText(text).catch(() => {});
  };

  const buttonClass = "rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 p-2 text-nd-text-muted hover:bg-nd-surface/60";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-nd-text-muted/15 px-3 py-2 text-xs text-nd-text-muted">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-nd-text">{pane.title}</span>
          <span>•</span>
          <span>{status}</span>
          <span>•</span>
          <span className="truncate">{pane.cwd || "cwd unavailable"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copySelection} className={buttonClass} aria-label="Copy selection">
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onRequestClear()} className={buttonClass} aria-label="Clear terminal">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onRequestRestart()} className={buttonClass} aria-label="Restart session">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Close pane" onClick={() => onRequestClose()} className="rounded-lg border border-nd-danger/25 bg-nd-danger/10 p-2 text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={onFocus}
      />
      {(pane.state === "error" || pane.state === "blocked" || pane.state === "exited") && (
        <div className="absolute inset-0 flex items-center justify-center bg-nd-bg/65 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-nd-text-muted/15 bg-nd-bg/95 p-4 shadow-panel-elevated">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nd-warning" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-nd-text">{pane.state === "blocked" ? "Session blocked" : pane.state === "error" ? "Session error" : "Session exited"}</div>
                <div className="mt-1 text-xs text-nd-text-muted">{pane.lastErrorMessage || pane.lastExitReason || pane.stateMessage || "The PTY is not currently running."}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={onRequestRestart} className="rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent">
                    Restart
                  </button>
                  <button type="button" onClick={onRequestClose} className="rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2 text-xs font-semibold text-nd-danger">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
