import { useState } from "react";
import { ArrowLeftRight, Power, PowerOff, Send, FolderOpen } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";

export function TunnelView() {
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState("");
  const [dirPath, setDirPath] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-49), msg]);

  const toggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (running) {
        await neurodeckApi.tunnel.stop();
        addLog("Tunnel stopped");
        setRunning(false);
      } else {
        await neurodeckApi.tunnel.start();
        addLog("Tunnel started");
        setRunning(true);
      }
    } catch (e) {
      const msg = String(e);
      addLog(`Error: ${msg}`);
      setError(`Failed to ${running ? "stop" : "start"} tunnel: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const sendCmd = async () => {
    if (!command.trim()) return;
    setError(null);
    try {
      const res = await neurodeckApi.tunnel.sendRequest(command.trim());
      addLog(`> ${command}`);
      addLog(res.output);
      setCommand("");
    } catch (e) {
      const msg = String(e);
      addLog(`Error: ${msg}`);
      setError(`Command failed: ${msg}`);
    }
  };

  const listDir = async () => {
    if (!dirPath.trim()) return;
    setError(null);
    try {
      const res = await neurodeckApi.tunnel.sendRequest(`ls -la "${dirPath.trim()}"`);
      addLog(`> ls ${dirPath}`);
      addLog(res.output);
    } catch (e) {
      const msg = String(e);
      addLog(`Error: ${msg}`);
      setError(`Directory list failed: ${msg}`);
    }
  };

  return (
    <Panel eyebrow="Bridge" title="SteamOS Tunnel" className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4">
        {/* Connection card */}
        <div className="flex items-center gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
            <ArrowLeftRight className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-nd-text-primary">SteamOS Bridge</div>
            <p className="text-xs text-nd-text-muted">Game Mode ↔ Desktop Mode tunnel</p>
          </div>
          <StatusChip
            tone={running ? "success" : "error"}
            pulse={running}
            icon={running ? undefined : PowerOff}
          >
            {running ? "Active" : "Offline"}
          </StatusChip>
          <Button
            variant={running ? "danger" : "success"}
            size="sm"
            icon={running ? PowerOff : Power}
            onClick={() => void toggle()}
            loading={loading}
            className="min-h-touch"
          >
            {running ? "Stop" : "Start"}
          </Button>
        </div>

        {/* Command inputs */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <TextInput
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCmd()}
              placeholder="Shell command..."
              aria-label="Shell command"
              fullWidth
              className="flex-1"
            />
            <Button variant="primary" size="md" icon={Send} onClick={() => void sendCmd()}>
              Send
            </Button>
          </div>
          <div className="flex gap-2">
            <TextInput
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && listDir()}
              placeholder="Directory path..."
              aria-label="Directory path to list"
              fullWidth
              className="flex-1"
            />
            <Button variant="secondary" size="md" icon={FolderOpen} onClick={() => void listDir()}>
              List
            </Button>
          </div>
        </div>

        {error && (
          <ErrorState
            title="Tunnel action failed"
            message={error}
            onClose={() => setError(null)}
            closeLabel="Dismiss"
          />
        )}

        {/* Log */}
        <div
          className="min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 font-mono text-xs"
          aria-live="polite"
          aria-label="Tunnel log"
        >
          {log.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Tunnel ready"
              description="Start the bridge, then send shell commands or list remote directories."
              compact
              className="h-full"
            />
          ) : (
            log.map((line, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  line.startsWith(">")
                    ? "text-nd-accent-primary"
                    : line.startsWith("Error")
                      ? "text-nd-accent-error"
                      : "text-nd-text-muted"
                }`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
