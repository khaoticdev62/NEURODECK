import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Play, RefreshCcw, Terminal } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

const EXAMPLE_SCRIPT = `-- NEURODECK Lua Automation example
-- Globals: print, execute, sendPrompt, setPersona, registerCommand, registerHook

registerCommand("hello", function(args)
  print("Hello from Lua! args: " .. (args or "none"))
  sendPrompt("Summarize what you know about: " .. (args or "NEURODECK"))
end)

print("Script loaded.")`;

export function LuaScriptsView({ state: _state }: { state: NeuroDeckState }) {
  const [script, setScript] = useState(EXAMPLE_SCRIPT);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput([]);
    try {
      const result = await (
        neurodeckApi.plugins as { runLua?: (s: string) => Promise<unknown> }
      )?.runLua?.(script);
      const lines: string[] =
        typeof result === "object" && result !== null && "output" in result
          ? String((result as { output: string }).output).split("\n")
          : ["[done]"];
      setOutput(lines);
    } catch (e) {
      setOutput([`[error] ${String(e)}`]);
    } finally {
      setRunning(false);
      setShowConfirm(false);
    }
  }, [script]);

  const hasExecute = script.includes("execute(");

  return (
    <Panel
      eyebrow="Plugins"
      title="Lua Automation"
      data-testid="lua-scripts-view"
      className="h-full overflow-hidden"
    >
      <div className="flex h-[calc(100%-56px)] flex-col">
        {/* Editor */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
              Script Editor
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCcw}
                onClick={() => setScript(EXAMPLE_SCRIPT)}
                aria-label="Reset to example"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                loading={running}
                onClick={() => (hasExecute ? setShowConfirm(true) : void handleRun())}
                aria-label="Run Lua script"
              >
                {running ? "Running…" : "Run Script"}
              </Button>
            </div>
          </div>
          <textarea
            className="flex-1 resize-none bg-nd-bg p-4 font-mono text-sm text-nd-text-primary outline-none focus:ring-1 focus:ring-nd-accent-primary/40"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            aria-label="Lua script editor"
            spellCheck={false}
          />
        </div>

        {/* Output console */}
        <div className="flex min-h-0 flex-col border-t border-nd-border-subtle">
          <div className="flex items-center gap-2 border-b border-nd-border-subtle/50 bg-nd-surface-secondary/20 px-4 py-1.5">
            <Terminal className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
              Output
            </span>
          </div>
          <pre
            ref={outputRef}
            className="max-h-40 overflow-y-auto p-4 font-mono text-xs text-nd-text-secondary"
            role="log"
            aria-live="polite"
            aria-label="Script output"
          >
            {output.length === 0 ? (
              <EmptyState
                icon={Terminal}
                title="No output yet"
                description="Run the script to see output here."
                variant="compact"
              />
            ) : (
              output.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("[error]")
                      ? "text-nd-status-error"
                      : "text-nd-text-secondary"
                  }
                >
                  {line}
                </div>
              ))
            )}
          </pre>
        </div>
      </div>

      {/* execute() security banner */}
      {hasExecute && (
        <div
          role="alert"
          className="absolute bottom-16 left-4 right-4 flex items-center gap-2 rounded-xl border border-nd-warning/40 bg-nd-warning/10 px-4 py-2 text-sm text-nd-warning"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          This script calls <code className="font-mono">execute()</code> — system commands will run.
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Run Lua Script with execute()"
        message="This script contains execute() calls that will run system commands on your device. Only proceed if you wrote or trust this script."
        confirmLabel="Run Anyway"
        destructive
        onConfirm={() => void handleRun()}
        onCancel={() => setShowConfirm(false)}
      />
    </Panel>
  );
}
