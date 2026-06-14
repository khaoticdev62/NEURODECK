import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Circle,
  Clipboard,
  ClipboardCheck,
  ExternalLink,
  Power,
  PowerOff,
  RefreshCw,
  Square,
} from 'lucide-react';
import { Button } from '../../components/primitives/Button';
import { IconButton } from '../../components/primitives/IconButton';
import { Panel } from '../../components/primitives/Panel';
import { StatusChip } from '../../components/primitives/StatusChip';
import { TextInput } from '../../components/primitives/TextInput';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { McpStatus } from '../../services/bridgeAdapter';

const ALL_TOOLS = [
  { name: 'neurodeck_chat', label: 'neurodeck_chat', desc: 'Send a prompt to the active LLM and receive a full response' },
  { name: 'get_status', label: 'get_status', desc: 'Query server status, version, and active tools' },
  { name: 'memory_add_fact', label: 'memory_add_fact', desc: 'Persist a pinned fact into long-term vector memory' },
  { name: 'memory_list_all', label: 'memory_list_all', desc: 'Return all memory records as formatted text' },
  { name: 'memory_search', label: 'memory_search', desc: 'Semantic or keyword search across memory records' },
  { name: 'read_file', label: 'read_file', desc: 'Read a file from the NEURODECK workspace (sandboxed)' },
  { name: 'write_file', label: 'write_file', desc: 'Write a file to the NEURODECK workspace (sandboxed)' },
  { name: 'run_shell', label: 'run_shell', desc: 'Shell command execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
  { name: 'run_code', label: 'run_code', desc: 'Python / Bash / JS code execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
  { name: 'run_lua', label: 'run_lua', desc: 'Sandboxed Lua 5.4 script execution — requires NEURODECK_ENABLE_MCP_EXEC=true' },
];

const DEFAULT_WHITELIST = new Set([
  'neurodeck_chat',
  'get_status',
  'memory_add_fact',
  'memory_list_all',
  'memory_search',
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const toggleTool = useCallback(
    async (name: string) => {
      const next = new Set(whitelist);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setWhitelist(next);
      try {
        await neurodeckApi.mcp.setToolWhitelist(Array.from(next));
      } catch (e) {
        showToast(`Whitelist update failed: ${e}`, false);
        setWhitelist(whitelist);
      }
    },
    [whitelist, showToast]
  );

  const handleCopyToken = useCallback(() => {
    const token = status?.token ?? '';
    if (!token) return;
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [status?.token]);

  const claudeDesktopConfig = status?.running
    ? JSON.stringify(
        {
          mcpServers: {
            neurodeck: {
              url: `http://127.0.0.1:${status.port}/`,
              headers: { Authorization: `Bearer ${status.token ?? ''}` },
            },
          },
        },
        null,
        2
      )
    : null;

  const handleCopyConfig = useCallback(() => {
    if (!claudeDesktopConfig) return;
    void navigator.clipboard.writeText(claudeDesktopConfig);
    showToast('Config snippet copied');
  }, [claudeDesktopConfig, showToast]);

  const running = status?.running ?? false;

  return (
    <Panel
      eyebrow="External Agent API"
      title="MCP Server"
      className="flex h-full flex-col overflow-hidden"
      action={
        <div className="flex items-center gap-2">
          {toast && (
            <span role="status" aria-live="polite" className={`text-xs ${toast.ok ? 'text-accent-success' : 'text-accent-error'}`}>
              {toast.text}
            </span>
          )}
          <IconButton variant="subtle" size="md" aria-label="Refresh MCP status" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Status card */}
          <section
            aria-label="Server status"
            className={`rounded-2xl border p-4 transition duration-fast ${
              running
                ? 'border-accent-success/25 bg-accent-success/[0.055]'
                : 'border-border-subtle bg-surface-secondary/40'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Circle
                className={`h-3 w-3 shrink-0 fill-current ${running ? 'text-accent-success' : 'text-text-muted/40'}`}
                aria-hidden="true"
              />
              <StatusChip tone={running ? 'success' : 'info'} size="sm" pulse={running}>
                {running ? `Running on port ${status?.port}` : 'Stopped'}
              </StatusChip>
              <span className="ml-auto text-2xs text-text-muted">Protocol: MCP 2024-11</span>
            </div>

            {running && status?.discovery && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={status.discovery}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {status.discovery}
                </a>
              </div>
            )}
          </section>

          {/* Start / Stop controls */}
          <section aria-label="Server controls" className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Controls</h2>
            <div className="flex flex-wrap items-end gap-3">
              {!running && (
                <TextInput
                  id="mcp-port"
                  label="Port"
                  type="number"
                  min={1024}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-28"
                />
              )}

              {running ? (
                <Button variant="danger" size="md" icon={PowerOff} onClick={() => void handleStop()} loading={busy}>
                  Stop Server
                </Button>
              ) : (
                <Button variant="primary" size="md" icon={Power} onClick={() => void handleStart()} loading={busy}>
                  Start Server
                </Button>
              )}
            </div>
          </section>

          {/* Bearer token */}
          {running && status?.token && (
            <section aria-label="Authentication token" className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Bearer Token</h2>
              <p className="mb-3 text-2xs text-text-secondary">
                Every request must include this token in the{' '}
                <code className="rounded bg-surface-primary px-1 py-0.5 text-accent-primary">Authorization: Bearer …</code>{' '}
                header. Regenerated each time the server starts.
              </p>
              <div className="flex items-center gap-2">
                <TextInput
                  ref={tokenRef}
                  id="mcp-token"
                  value={status.token}
                  readOnly
                  aria-label="MCP bearer token"
                  className="min-w-0 flex-1"
                />
                <Button variant="secondary" size="sm" icon={copied ? ClipboardCheck : Clipboard} onClick={handleCopyToken}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </section>
          )}

          {/* Claude Desktop config snippet */}
          {claudeDesktopConfig && (
            <section aria-label="Claude Desktop config snippet" className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Claude Desktop Config</h2>
                <Button variant="secondary" size="sm" icon={Clipboard} onClick={handleCopyConfig}>
                  Copy
                </Button>
              </div>
              <p className="mb-3 text-2xs text-text-secondary">
                Add this to your{' '}
                <code className="rounded bg-surface-primary px-1 py-0.5 text-accent-primary">claude_desktop_config.json</code>{' '}
                to connect Claude Desktop (or any MCP client) to NEURODECK.
              </p>
              <pre className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-primary p-4 font-mono text-2xs leading-relaxed text-text-secondary scrollbar-thin">
                {claudeDesktopConfig}
              </pre>
            </section>
          )}

          {/* Tool whitelist */}
          <section aria-label="Tool whitelist" className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
            <h2 className="mb-1 text-sm font-semibold text-text-primary">Tool Whitelist</h2>
            <p className="mb-4 text-2xs text-text-secondary">
              Only enabled tools are advertised to MCP clients via{' '}
              <code className="rounded bg-surface-primary px-1 py-0.5 text-accent-primary">tools/list</code>. Changes take
              effect on the next call — no restart required.
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
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 ${
                        enabled
                          ? 'border-accent-primary/20 bg-accent-primary/[0.06]'
                          : 'border-border-subtle bg-surface-primary/50 hover:bg-surface-tertiary/30'
                      }`}
                    >
                      {enabled ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/40" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <span className="block font-mono text-xs font-medium text-text-primary">{tool.label}</span>
                        <span className="mt-0.5 block text-2xs leading-relaxed text-text-secondary/80">
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
          <section aria-label="MCP 2024-11 capabilities" className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">MCP 2024-11 Capabilities</h2>
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
                    className={`h-2 w-2 shrink-0 rounded-full ${supported ? 'bg-accent-success' : 'bg-text-muted/30'}`}
                    aria-hidden="true"
                  />
                  <dt className={supported ? 'text-text-primary' : 'text-text-muted/50 line-through'}>
                    {String(label)}
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </Panel>
  );
}
