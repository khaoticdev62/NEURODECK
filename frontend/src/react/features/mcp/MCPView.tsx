import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckSquare, Circle, Clipboard, ClipboardCheck, Cpu,
  ExternalLink, Power, PowerOff, RefreshCw, Square,
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { McpStatus } from '../../services/bridgeAdapter';

const ALL_TOOLS = [
  { name: 'neurodeck_chat',  label: 'neurodeck_chat',  desc: 'Send a prompt to the active LLM and receive a full response' },
  { name: 'get_status',      label: 'get_status',      desc: 'Query server status, version, and active tools' },
  { name: 'memory_add_fact', label: 'memory_add_fact', desc: 'Persist a pinned fact into long-term vector memory' },
  { name: 'memory_list_all', label: 'memory_list_all', desc: 'Return all memory records as formatted text' },
  { name: 'memory_search',   label: 'memory_search',   desc: 'Semantic or keyword search across memory records' },
  { name: 'read_file',       label: 'read_file',       desc: 'Read a file from the NEURODECK workspace (sandboxed)' },
  { name: 'write_file',      label: 'write_file',      desc: 'Write a file to the NEURODECK workspace (sandboxed)' },
  { name: 'run_shell',       label: 'run_shell',       desc: 'Shell command execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
  { name: 'run_code',        label: 'run_code',        desc: 'Python / Bash / JS code execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
  { name: 'run_lua',         label: 'run_lua',         desc: 'Sandboxed Lua 5.4 script execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
];

const DEFAULT_WHITELIST = new Set([
  'neurodeck_chat', 'get_status', 'memory_add_fact', 'memory_list_all', 'memory_search',
]);

export function MCPView() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [whitelist, setWhitelist] = useState<Set<string>>(DEFAULT_WHITELIST);
  const [port, setPort] = useState(13337);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await neurodeckApi.mcp.getStatus();
      setStatus(s);
      if (s.running && s.port) setPort(s.port);
      const wl = await neurodeckApi.mcp.getToolWhitelist();
      setWhitelist(new Set(wl));
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    try {
      const res = await neurodeckApi.mcp.start(port);
      showToast(`MCP server started on port ${res.port}`);
      await refresh();
    } catch (e) {
      showToast(`Start failed: ${e}`, false);
    } finally {
      setBusy(false);
    }
  }, [port, refresh, showToast]);

  const handleStop = useCallback(async () => {
    setBusy(true);
    try {
      await neurodeckApi.mcp.stop();
      showToast('MCP server stopped');
      await refresh();
    } catch (e) {
      showToast(`Stop failed: ${e}`, false);
    } finally {
      setBusy(false);
    }
  }, [refresh, showToast]);

  const toggleTool = useCallback(async (name: string) => {
    const next = new Set(whitelist);
    if (next.has(name)) next.delete(name); else next.add(name);
    setWhitelist(next);
    try {
      await neurodeckApi.mcp.setToolWhitelist(Array.from(next));
    } catch (e) {
      showToast(`Whitelist update failed: ${e}`, false);
      setWhitelist(whitelist); // revert
    }
  }, [whitelist, showToast]);

  const handleCopyToken = useCallback(() => {
    const token = status?.token ?? '';
    if (!token) return;
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [status?.token]);

  const claudeDesktopConfig = status?.running
    ? JSON.stringify({
        mcpServers: {
          neurodeck: {
            url: `http://127.0.0.1:${status.port}/`,
            headers: { Authorization: `Bearer ${status.token ?? ''}` },
          },
        },
      }, null, 2)
    : null;

  const handleCopyConfig = useCallback(() => {
    if (!claudeDesktopConfig) return;
    void navigator.clipboard.writeText(claudeDesktopConfig);
    showToast('Config snippet copied');
  }, [claudeDesktopConfig, showToast]);

  const running = status?.running ?? false;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-nd-text-muted/10 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-nd-accent/25 bg-nd-accent/[0.08] text-nd-accent">
          <Cpu className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted/60">
            External Agent API
          </p>
          <h1 className="text-base font-semibold text-nd-text">MCP Server</h1>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh MCP status"
          className="ml-auto rounded-xl border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
        {toast && (
          <span
            role="status"
            aria-live="polite"
            className={`text-xs ${toast.ok ? 'text-nd-success' : 'text-nd-danger'}`}
          >
            {toast.text}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Status card */}
          <section
            aria-label="Server status"
            className={`rounded-2xl border p-5 transition ${
              running
                ? 'border-nd-success/25 bg-nd-success/[0.055]'
                : 'border-nd-text-muted/15 bg-nd-surface/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Circle
                className={`h-3 w-3 shrink-0 fill-current ${running ? 'text-nd-success' : 'text-nd-text-muted/40'}`}
                aria-hidden="true"
              />
              <span className={`text-sm font-semibold ${running ? 'text-nd-success' : 'text-nd-text-muted'}`}>
                {running ? `Running on port ${status?.port}` : 'Stopped'}
              </span>
              <span className="ml-auto text-xs text-nd-text-muted/60">
                Protocol: MCP 2024-11
              </span>
            </div>

            {running && status?.discovery && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={status.discovery}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-nd-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {status.discovery}
                </a>
              </div>
            )}
          </section>

          {/* Start / Stop controls */}
          <section aria-label="Server controls" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-5">
            <h2 className="mb-4 text-sm font-semibold text-nd-text">Controls</h2>
            <div className="flex flex-wrap items-end gap-3">
              {!running && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-nd-text-muted">Port</span>
                  <input
                    type="number"
                    min={1024}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-24 rounded-xl border border-nd-text-muted/20 bg-nd-surface/80 px-3 py-2 text-sm text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                    aria-label="MCP server port"
                  />
                </label>
              )}

              {running ? (
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-nd-danger/20 px-4 py-2.5 text-sm font-semibold text-nd-danger transition hover:bg-nd-danger/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                >
                  {busy ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  ) : (
                    <PowerOff className="h-4 w-4" aria-hidden="true" />
                  )}
                  Stop Server
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-nd-accent/15 px-4 py-2.5 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/25 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  {busy ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  ) : (
                    <Power className="h-4 w-4" aria-hidden="true" />
                  )}
                  Start Server
                </button>
              )}
            </div>
          </section>

          {/* Bearer token */}
          {running && status?.token && (
            <section aria-label="Authentication token" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-5">
              <h2 className="mb-3 text-sm font-semibold text-nd-text">Bearer Token</h2>
              <p className="mb-3 text-xs text-nd-text-muted/70">
                Every request must include this token in the{' '}
                <code className="rounded bg-nd-surface px-1 py-0.5 text-nd-accent">Authorization: Bearer …</code> header.
                Regenerated each time the server starts.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={tokenRef}
                  type="text"
                  readOnly
                  value={status.token}
                  aria-label="MCP bearer token"
                  className="min-w-0 flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-bg px-3 py-2 font-mono text-xs text-nd-text/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                />
                <button
                  type="button"
                  onClick={handleCopyToken}
                  aria-label={copied ? 'Token copied' : 'Copy bearer token'}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 px-3 py-2 text-xs text-nd-text-muted transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  {copied ? (
                    <ClipboardCheck className="h-3.5 w-3.5 text-nd-success" aria-hidden="true" />
                  ) : (
                    <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </section>
          )}

          {/* Claude Desktop config snippet */}
          {claudeDesktopConfig && (
            <section aria-label="Claude Desktop config snippet" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-nd-text">Claude Desktop Config</h2>
                <button
                  type="button"
                  onClick={handleCopyConfig}
                  aria-label="Copy Claude Desktop config snippet"
                  className="flex items-center gap-1.5 rounded-xl border border-nd-text-muted/15 px-3 py-1.5 text-xs text-nd-text-muted transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <Clipboard className="h-3 w-3" aria-hidden="true" /> Copy
                </button>
              </div>
              <p className="mb-3 text-xs text-nd-text-muted/70">
                Add this to your{' '}
                <code className="rounded bg-nd-surface px-1 py-0.5 text-nd-accent">claude_desktop_config.json</code>{' '}
                to connect Claude Desktop (or any MCP client) to NEURODECK.
              </p>
              <pre className="overflow-x-auto rounded-xl border border-nd-text-muted/10 bg-nd-bg p-4 font-mono text-[11px] leading-relaxed text-nd-text/80 scrollbar-thin">
                {claudeDesktopConfig}
              </pre>
            </section>
          )}

          {/* Tool whitelist */}
          <section aria-label="Tool whitelist" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-5">
            <h2 className="mb-1 text-sm font-semibold text-nd-text">Tool Whitelist</h2>
            <p className="mb-4 text-xs text-nd-text-muted/70">
              Only enabled tools are advertised to MCP clients via{' '}
              <code className="rounded bg-nd-surface px-1 py-0.5 text-nd-accent">tools/list</code>.
              Changes take effect on the next call — no restart required.
            </p>
            <ul role="list" className="space-y-1.5">
              {ALL_TOOLS.map((tool) => {
                const enabled = whitelist.has(tool.name);
                return (
                  <li key={tool.name}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={enabled}
                      onClick={() => void toggleTool(tool.name)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                        enabled
                          ? 'border-nd-accent/20 bg-nd-accent/[0.06]'
                          : 'border-nd-text-muted/10 bg-nd-surface/20 hover:border-nd-text-muted/20'
                      }`}
                    >
                      {enabled ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-nd-text-muted/40" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <span className="block font-mono text-xs font-medium text-nd-text">
                          {tool.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-nd-text-muted/60">
                          {tool.desc}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Capability summary */}
          <section aria-label="MCP 2024-11 capabilities" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-5">
            <h2 className="mb-3 text-sm font-semibold text-nd-text">MCP 2024-11 Capabilities</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                ['tools/list + tools/call', true],
                ['resources/list + resources/read', true],
                ['prompts/list + prompts/get', true],
                ['sampling/createMessage', true],
                ['roots/list', true],
                ['completion/complete', true],
                ['resources/subscribe', false],
                ['Streaming SSE transport', false],
              ].map(([label, supported]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      supported ? 'bg-nd-success' : 'bg-nd-text-muted/30'
                    }`}
                    aria-hidden="true"
                  />
                  <dt className={supported ? 'text-nd-text/80' : 'text-nd-text-muted/50 line-through'}>
                    {String(label)}
                  </dt>
                </div>
              ))}
            </dl>
          </section>

        </div>
      </div>
    </div>
  );
}
