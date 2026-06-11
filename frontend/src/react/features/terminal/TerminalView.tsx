import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal, Plus, Trash2, RefreshCw } from 'lucide-react';
import { neurodeckApi, listenBridge } from '../../services/bridgeAdapter';
import 'xterm/css/xterm.css';

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [sessionId] = useState('main_pty_session');
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<string[]>([]);

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, monospace',
      theme: {
        background: '#0A0D10',
        foreground: '#E8F4FF',
        cursor: '#5EEBFF',
        selectionBackground: 'rgba(94, 235, 255, 0.25)',
        black: '#0A0D10',
        red: '#FF5A6A',
        green: '#7CFFB2',
        yellow: '#FFC857',
        blue: '#5EEBFF',
        magenta: '#FF4FD8',
        cyan: '#6AF0D5',
        white: '#E8F4FF',
        brightBlack: '#2A3038',
        brightRed: '#FF7A8A',
        brightGreen: '#9CFFC8',
        brightYellow: '#FFE08A',
        brightBlue: '#7EEFFF',
        brightMagenta: '#FF7FE8',
        brightCyan: '#8AF0E5',
        brightWhite: '#FFFFFF',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    term.onData((data) => {
      neurodeckApi.terminal.write(sessionId, data).catch(() => {});
    });

    term.onResize(({ cols, rows }) => {
      neurodeckApi.terminal.resize(sessionId, cols, rows).catch(() => {});
    });

    termRef.current = term;
    fitRef.current = fitAddon;

    // Spawn PTY
    neurodeckApi.terminal.spawn(sessionId).then(() => {
      setConnected(true);
    }).catch(() => {
      term.writeln('\r\n\x1b[91mFailed to spawn PTY session.\x1b[0m');
    });

    // Listen for output
    const unsub = listenBridge('pty_output', (payload: any) => {
      if (payload.id === sessionId && payload.data) {
        term.write(payload.data);
      }
    });

    const unsubExit = listenBridge('pty_exit', (payload: any) => {
      if (payload.id === sessionId) {
        setConnected(false);
        term.writeln(`\r\n\x1b[93mSession exited: ${payload.reason || 'unknown'}\x1b[0m`);
      }
    });

    return () => {
      unsub();
      unsubExit();
    };
  }, [sessionId]);

  useEffect(() => {
    const cleanup = initTerminal();
    const handleResize = () => fitRef.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      cleanup?.();
      window.removeEventListener('resize', handleResize);
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, [initTerminal]);

  const reconnect = async () => {
    try {
      await neurodeckApi.terminal.kill(sessionId);
      termRef.current?.clear();
      await neurodeckApi.terminal.spawn(sessionId);
      setConnected(true);
    } catch (_) { /* ignore */ }
  };

  const killSession = async () => {
    try {
      await neurodeckApi.terminal.kill(sessionId);
      setConnected(false);
    } catch (_) { /* ignore */ }
  };

  return (
    <div className="terminal-container flex h-full flex-col">
      <div id="terminal-tabs-list" className="terminal-tabs-list mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Terminal className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="terminal-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Terminal</div>
          <h2 className="text-lg font-semibold text-nd-text">Terminal</h2>
          <p className="text-xs text-nd-text-muted">PTY shell sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-nd-success' : 'bg-nd-danger'}`} />
          <span className="text-xs text-nd-text-muted">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button type="button" onClick={reconnect} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text" title="Reconnect">
          <RefreshCw className="h-4 w-4" />
        </button>
        <button type="button" onClick={killSession} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger" title="Kill Session">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/60 p-2">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
