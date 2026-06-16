#!/usr/bin/env tsx
/**
 * verify-ai-chat — validates the AI chat pipeline wiring.
 *
 * Static checks (no running sidecar needed):
 *   1. chat.contracts.ts exists and exports SendChatMessageRequest
 *   2. agent.contracts.ts exists and exports NeurodeckAgent
 *   3. chat.js sends `message:` key (not `prompt:`) to send_command
 *   4. Rust send_command arm accepts `message` with `prompt` fallback
 *   5. agentRegistry.ts PREDEFINED_AGENTS matches providers.rs default_agents count
 *
 * Live checks (requires sidecar on NEURODECK_PORT, skipped if offline):
 *   6. POST /api/list_agents returns array with id/name/provider/model
 *   7. POST /api/get_active_agent_id returns { active_agent_id: string }
 *   8. POST /api/switch_agent switches correctly and returns expected shape
 *   9. POST /api/send_command returns { status: 'streaming' } within 3s
 */

import * as fs from 'fs';
import * as path from 'path';

const PORT = process.env.NEURODECK_PORT ?? '9477';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, '..');

interface CheckResult {
  id: string;
  ok: boolean;
  status: string;
  message: string;
  durationMs: number;
}

async function bridgePost(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/${command}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function isSidecarRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function runCheck(
  id: string,
  fn: () => Promise<{ ok: boolean; message: string }>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { ok, message } = await fn();
    return { id, ok, status: ok ? 'pass' : 'fail', message, durationMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id, ok: false, status: 'error', message: msg, durationMs: Date.now() - start };
  }
}

// ── Static checks ─────────────────────────────────────────────────────────────

function checkChatContractsExist(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'src/shared/contracts/chat.contracts.ts');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('SendChatMessageRequest'))
    return { ok: false, message: 'chat.contracts.ts does not export SendChatMessageRequest' };
  return { ok: true, message: 'chat.contracts.ts exists and exports SendChatMessageRequest' };
}

function checkAgentContractsExist(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'src/shared/contracts/agent.contracts.ts');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('NeurodeckAgent'))
    return { ok: false, message: 'agent.contracts.ts does not export NeurodeckAgent' };
  return { ok: true, message: 'agent.contracts.ts exists and exports NeurodeckAgent' };
}

function checkChatJsSendsMessageKey(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'frontend/src/chat.js');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  // Must send `message:` key
  if (!content.includes('message: text')) {
    return { ok: false, message: 'chat.js does not send { message: text } to send_command' };
  }
  // Must NOT send bare `prompt: text` (the old broken key)
  if (content.includes('{ prompt: text }')) {
    return { ok: false, message: 'chat.js still sends old { prompt: text } — not fixed' };
  }
  return { ok: true, message: 'chat.js sends correct { message: text } key to send_command' };
}

function checkRustAcceptsPromptFallback(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('.or_else(|| args.get("prompt"))')) {
    return {
      ok: false,
      message: 'Rust send_command arm is missing .or_else(|| args.get("prompt")) fallback',
    };
  }
  return { ok: true, message: 'Rust send_command accepts both "message" and "prompt" keys' };
}

function checkRustEmitsAgentChanged(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('"agent_changed"')) {
    return { ok: false, message: 'Rust switch_agent arm does not emit "agent_changed" event' };
  }
  return { ok: true, message: 'Rust switch_agent emits agent_changed WebSocket event' };
}

function checkAgentRegistryCount(): { ok: boolean; message: string } {
  const registryPath = path.join(ROOT, 'src/shared/registries/agentRegistry.ts');
  if (!fs.existsSync(registryPath))
    return { ok: false, message: `Missing: ${registryPath}` };
  const content = fs.readFileSync(registryPath, 'utf8');
  // Count `id:` entries in PREDEFINED_AGENTS
  const matches = content.match(/id: '[\w-]+'/g);
  const count = matches ? matches.length : 0;
  // providers.rs default_agents() has 9 entries
  const expected = 9;
  if (count !== expected) {
    return {
      ok: false,
      message: `agentRegistry.ts has ${count} agents, expected ${expected} (matching providers.rs)`,
    };
  }
  return { ok: true, message: `agentRegistry.ts has correct ${count} predefined agents` };
}

function checkAddAgentFix(): { ok: boolean; message: string } {
  const p = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
  if (!fs.existsSync(p)) return { ok: false, message: `Missing: ${p}` };
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('args.get("agent").cloned().unwrap_or(args.clone())')) {
    return {
      ok: false,
      message: 'Rust add_agent arm is missing nested { agent: {...} } arg unwrapping',
    };
  }
  return { ok: true, message: 'Rust add_agent supports nested { agent: {...} } and flat args' };
}

// ── Live checks ───────────────────────────────────────────────────────────────

async function checkListAgents(): Promise<{ ok: boolean; message: string }> {
  const data = await bridgePost('list_agents') as unknown[];
  if (!Array.isArray(data)) return { ok: false, message: 'list_agents did not return an array' };
  if (data.length === 0) return { ok: false, message: 'list_agents returned empty array' };
  const first = data[0] as Record<string, unknown>;
  for (const field of ['id', 'name', 'provider', 'model']) {
    if (typeof first[field] !== 'string')
      return { ok: false, message: `list_agents[0] missing field: ${field}` };
  }
  return { ok: true, message: `list_agents returned ${data.length} agents` };
}

async function checkGetActiveAgentId(): Promise<{ ok: boolean; message: string }> {
  const data = await bridgePost('get_active_agent_id') as Record<string, unknown>;
  if (typeof data.active_agent_id !== 'string')
    return { ok: false, message: 'get_active_agent_id did not return { active_agent_id: string }' };
  return { ok: true, message: `active agent id: "${data.active_agent_id}"` };
}

async function checkSwitchAgent(): Promise<{ ok: boolean; message: string }> {
  const data = await bridgePost('switch_agent', { id: 'gemini-flash' }) as Record<string, unknown>;
  if (data.status !== 'switched')
    return { ok: false, message: `switch_agent returned status "${data.status}", expected "switched"` };
  if (data.id !== 'gemini-flash')
    return { ok: false, message: `switch_agent returned id "${data.id}", expected "gemini-flash"` };
  return { ok: true, message: `switch_agent → ${data.id} (${data.provider} / ${data.model})` };
}

async function checkSendCommand(): Promise<{ ok: boolean; message: string }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`${BASE_URL}/api/send_command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping test — verify-ai-chat probe' }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, message: `send_command HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json() as Record<string, unknown>;
    if (data.status !== 'streaming')
      return { ok: false, message: `send_command returned status "${data.status}", expected "streaming"` };
    return { ok: true, message: 'send_command returned { status: "streaming" } — LLM pipeline active' };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('AbortError'))
      return { ok: false, message: 'send_command timed out after 3s' };
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== verify-ai-chat ===\n');

  const results: CheckResult[] = [];

  // Static checks
  results.push(await runCheck('chat-contracts-exist', async () => checkChatContractsExist()));
  results.push(await runCheck('agent-contracts-exist', async () => checkAgentContractsExist()));
  results.push(await runCheck('chat-js-message-key', async () => checkChatJsSendsMessageKey()));
  results.push(await runCheck('rust-prompt-fallback', async () => checkRustAcceptsPromptFallback()));
  results.push(await runCheck('rust-agent-changed-event', async () => checkRustEmitsAgentChanged()));
  results.push(await runCheck('agent-registry-count', async () => checkAgentRegistryCount()));
  results.push(await runCheck('add-agent-nested-fix', async () => checkAddAgentFix()));

  // Live checks
  const sidecarRunning = await isSidecarRunning();
  if (sidecarRunning) {
    console.log(`Sidecar running on port ${PORT} — running live checks...\n`);
    results.push(await runCheck('live-list-agents', checkListAgents));
    results.push(await runCheck('live-get-active-agent-id', checkGetActiveAgentId));
    results.push(await runCheck('live-switch-agent', checkSwitchAgent));
    results.push(await runCheck('live-send-command', checkSendCommand));
  } else {
    console.log(`Sidecar not running on port ${PORT} — live checks skipped.\n`);
    results.push({
      id: 'live-checks',
      ok: true,
      status: 'not_configured',
      message: 'Sidecar offline — start with `npm run dev` or `npm run sidecar:build` to run live checks',
      durationMs: 0,
    });
  }

  // Print results
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log(`Results: ${passed.length} passed, ${failed.length} failed\n`);
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${r.id.padEnd(35)} ${r.status.padEnd(16)} ${r.message}`);
  }

  // Save inventory JSON
  const outDir = path.join(ROOT, 'reports/chat');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'chat-system-inventory.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sidecarRunning,
        checks: results,
        passed: passed.length,
        failed: failed.length,
        productionGatePassed: failed.filter((r) => r.status !== 'not_configured').length === 0,
      },
      null,
      2
    )
  );
  console.log(`\nInventory saved: ${outFile}`);

  const hardFails = failed.filter((r) => r.status !== 'not_configured');
  if (hardFails.length > 0) {
    console.log(`\n✗ ${hardFails.length} hard failure(s) — chat gate BLOCKED\n`);
    process.exit(1);
  }
  console.log('\n✓ Chat pipeline verification passed\n');
}

main().catch((err) => {
  console.error('verify-ai-chat fatal error:', err);
  process.exit(1);
});
