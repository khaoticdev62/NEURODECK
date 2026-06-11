import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Power, PowerOff, RefreshCw, Send, FolderOpen } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

export function TunnelView() {
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-49), msg]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (running) {
        await neurodeckApi.tunnel.stop();
        addLog('Tunnel stopped');
        setRunning(false);
      } else {
        await neurodeckApi.tunnel.start();
        addLog('Tunnel started');
        setRunning(true);
      }
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    }
    setLoading(false);
  };

  const sendCmd = async () => {
    if (!command.trim()) return;
    try {
      const res = await neurodeckApi.tunnel.sendRequest(command.trim());
      addLog(`> ${command}`);
      addLog(res.output);
      setCommand('');
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    }
  };

  const listDir = async () => {
    if (!dirPath.trim()) return;
    try {
      const res = await neurodeckApi.tunnel.sendRequest(`ls -la "${dirPath.trim()}"`);
      addLog(`> ls ${dirPath}`);
      addLog(res.output);
    } catch (e) {
      addLog(`Error: ${String(e)}`);
    }
  };

  return (
    <div className="tunnel-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <ArrowLeftRight className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="tunnel-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Tunnel</div>
          <h2 className="text-lg font-semibold text-nd-text">Tunnel</h2>
          <p className="text-xs text-nd-text-muted">SteamOS Game Mode to Desktop Mode bridge</p>
        </div>
        <div className="flex items-center gap-2">
        <div id="tunnel-status-indicator" className={`h-2 w-2 rounded-full ${running ? 'bg-nd-success' : 'text-nd-text-muted/40'}`} />
          <span className="text-xs text-nd-text-muted">{running ? 'Active' : 'Offline'}</span>
        </div>
        <button type="button" onClick={toggle} disabled={loading} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${running ? 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20' : 'border-nd-success/30 bg-nd-success/10 text-nd-success hover:bg-nd-success/20'}`}>
          {running ? <><PowerOff className="inline h-4 w-4" /> Stop</> : <><Power className="inline h-4 w-4" /> Start</>}
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCmd()}
            placeholder="Shell command..."
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
          <button type="button" onClick={sendCmd} className="flex items-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-sm font-medium text-nd-accent hover:bg-nd-accent/20">
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={dirPath}
            onChange={(e) => setDirPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && listDir()}
            placeholder="Directory path..."
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
          <button type="button" onClick={listDir} className="flex items-center gap-2 rounded-xl border border-nd-text-muted/15 px-4 py-2 text-sm text-nd-text/80 hover:bg-nd-surface/50">
            <FolderOpen className="h-4 w-4" /> List
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 font-mono text-xs">
        {log.length === 0 && <span className="text-nd-text-muted/70">Tunnel log will appear here...</span>}
        {log.map((line, i) => (
          <div key={i} className={`py-0.5 ${line.startsWith('>') ? 'text-nd-accent' : line.startsWith('Error') ? 'text-nd-danger' : 'text-nd-text-muted'}`}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
