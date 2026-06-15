import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { AlertTriangle, Copy, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { StatusChip } from "../../components/primitives/StatusChip";
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

type AutoInputRule = {
  pattern: string | RegExp;
  input: string;
  once?: boolean;
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
  autoInputs?: AutoInputRule[];
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

function stripAnsiForMatching(text: string) {
  return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "").replace(/\r/g, "");
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
  autoInputs,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");
  const autoInputBufferRef = useRef("");
  const injectedAutoInputsRef = useRef<Set<number>>(new Set());
  const [status, setStatus] = useState<string>(pane.stateMessage ?? "starting");

  const shell = useMemo(() => fallbackShell(profile, environment), [environment, profile]);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const cssRoot = document.documentElement;
    const getVar = (v: string, fallback: string) =>
      getComputedStyle(cssRoot).getPropertyValue(v).trim() || fallback;

    const term = new XTerm({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 13,
      scrollback: 4000,
      convertEol: true,
      theme: {
        background:          getVar("--nd-surface-app", "#0A0D10"),
        foreground:          getVar("--nd-text-primary", "#E8F4FF"),
        cursor:              getVar("--nd-accent-primary", "#5EEBFF"),
        selectionBackground: `rgba(${getVar("--nd-cyan-rgb", "94, 235, 255")}, 0.25)`,
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

      if (autoInputs?.length) {
        autoInputBufferRef.current += data.data;
        // Keep the buffer bounded; the prompt we care about is always near the end.
        if (autoInputBufferRef.current.length > 2048) {
          autoInputBufferRef.current = autoInputBufferRef.current.slice(-1024);
        }
        const normalized = stripAnsiForMatching(autoInputBufferRef.current);
        autoInputs.forEach((rule, index) => {
          if (rule.once && injectedAutoInputsRef.current.has(index)) return;
          const regex = typeof rule.pattern === "string" ? new RegExp(rule.pattern) : rule.pattern;
          if (regex.test(normalized)) {
            injectedAutoInputsRef.current.add(index);
            void neurodeckApi.terminal.write(pane.sessionId, rule.input);
            if (rule.once) {
              // Trim the buffer after a successful injection so the same prompt
              // does not re-match on subsequent output.
              autoInputBufferRef.current = "";
            }
          }
        });
      }

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

  const statusTone =
    pane.state === "error" || pane.state === "blocked"
      ? "error"
      : pane.state === "exited"
        ? "warning"
        : "success";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 text-xs text-nd-text-muted">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-nd-text-primary">{pane.title}</span>
          <span className="text-nd-border-default">•</span>
          <StatusChip tone={statusTone} size="sm">
            {status}
          </StatusChip>
          <span className="text-nd-border-default">•</span>
          <span className="truncate">{pane.cwd || "cwd unavailable"}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label="Copy selection"
            variant="ghost"
            size="sm"
            onClick={copySelection}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Clear terminal"
            variant="ghost"
            size="sm"
            onClick={() => onRequestClear()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Restart session"
            variant="ghost"
            size="sm"
            onClick={() => onRequestRestart()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            aria-label="Close pane"
            variant="danger"
            size="sm"
            onClick={() => onRequestClose()}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={onFocus}
      />
      {(pane.state === "error" || pane.state === "blocked" || pane.state === "exited") && (
        <div className="absolute inset-0 flex items-center justify-center bg-nd-surface-app/65 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-nd-border-subtle bg-nd-surface-modal p-4 shadow-nd-elevation-card">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nd-accent-warning" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-nd-text-primary">
                  {pane.state === "blocked" ? "Session blocked" : pane.state === "error" ? "Session error" : "Session exited"}
                </div>
                <div className="mt-1 text-xs text-nd-text-muted">
                  {pane.lastErrorMessage || pane.lastExitReason || pane.stateMessage || "The PTY is not currently running."}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={onRequestRestart}>Restart</Button>
                  <Button variant="danger" size="sm" onClick={onRequestClose}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
