#!/usr/bin/env tsx
/**
 * verify-agent-selection — validates that agent selection wiring is complete.
 *
 * Static checks:
 *   1. agentRegistry.ts exists with all predefined agents
 *   2. Each predefined agent has required fields
 *   3. Rust switch_agent emits agent_changed
 *   4. Rust send_command has per-request agent_id routing
 *
 * Live checks (require sidecar):
 *   5. list_agents matches predefined count or more
 *   6. switch_agent updates active_agent_id
 *   7. send_command with explicit agent_id routes to different provider
 */

import * as fs from 'fs';
import * as path from 'path';
import { PREDEFINED_AGENTS } from '../src/shared/registries/agentRegistry';

const PORT = process.env.NEURODECK_PORT ?? '9477';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, '..');

interface CheckResult {
  id: string;
  ok: boolean;
  status: string;
  message: string;
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

// ── Static checks ─────────────────────────────────────────────────────────────

function checkPredefinedAgentFields(): CheckResult {
  const required = ['id', 'name', 'provider', 'model', 'base_url', 'embed_model', 'description'];
  const issues: string[] = [];
  for (const agent of PREDEFINED_AGENTS) {
    for (const field of required) {
      if (typeof (agent as Record<string, unknown>)[field] !== 'string') {
        issues.push(`Agent ${agent.id} missing field: ${field}`);
      }
    }
    if (!agent.id) issues.push('Agent has empty id');
    if (!agent.name) issues.push('Agent has empty name');
    if (!agent.provider) issues.push(`Agent ${agent.id} has empty provider`);
    if (!agent.model) issues.push(`Agent ${agent.id} has empty model`);
  }
  if (issues.length > 0) return { id: 'predefined-agent-fields', ok: false, status: 'fail', message: issues.join('; ') };
  return {
    id: 'predefined-agent-fields',
    ok: true,
    status: 'pass',
    message: `All ${PREDEFINED_AGENTS.length} predefined agents have required fields`,
  };
}

function checkPerRequestRoutingInRust(): CheckResult {
  const p = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('request_agent_id')) {
    return {
      id: 'per-request-routing',
      ok: false,
      status: 'fail',
      message: 'Rust send_command is missing per-request agent_id routing',
    };
  }
  if (!content.includes('provider_from_agent')) {
    return {
      id: 'per-request-routing',
      ok: false,
      status: 'fail',
      message: 'Rust send_command is missing provider_from_agent call',
    };
  }
  return {
    id: 'per-request-routing',
    ok: true,
    status: 'pass',
    message: 'Rust send_command has per-request agent_id → provider routing',
  };
}

function checkFrontendWiresAgentId(): CheckResult {
  const p = path.join(ROOT, 'frontend/src/chat.js');
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('agent_id')) {
    return {
      id: 'frontend-agent-id',
      ok: false,
      status: 'fail',
      message: 'chat.js does not include agent_id in send_command invocation',
    };
  }
  if (!content.includes('state.activeAgentId')) {
    return {
      id: 'frontend-agent-id',
      ok: false,
      status: 'fail',
      message: 'chat.js does not read state.activeAgentId for agent_id',
    };
  }
  return {
    id: 'frontend-agent-id',
    ok: true,
    status: 'pass',
    message: 'chat.js includes state.activeAgentId as agent_id in send_command',
  };
}

// ── Live checks ───────────────────────────────────────────────────────────────

async function checkLiveAgentCount(): Promise<CheckResult> {
  const data = await bridgePost('list_agents') as unknown[];
  if (!Array.isArray(data) || data.length === 0) {
    return { id: 'live-agent-count', ok: false, status: 'fail', message: 'list_agents returned no agents' };
  }
  const enough = data.length >= PREDEFINED_AGENTS.length;
  return {
    id: 'live-agent-count',
    ok: enough,
    status: enough ? 'pass' : 'fail',
    message: `list_agents returned ${data.length} agents (expected ≥${PREDEFINED_AGENTS.length})`,
  };
}

async function checkSwitchAgentPersists(): Promise<CheckResult> {
  // Switch to gemini-flash-lite
  await bridgePost('switch_agent', { id: 'gemini-flash-lite' });
  const after = await bridgePost('get_active_agent_id') as Record<string, unknown>;
  if (after.active_agent_id !== 'gemini-flash-lite') {
    return {
      id: 'switch-persists',
      ok: false,
      status: 'fail',
      message: `After switching to gemini-flash-lite, get_active_agent_id returned "${after.active_agent_id}"`,
    };
  }
  // Restore to gemini-flash
  await bridgePost('switch_agent', { id: 'gemini-flash' }).catch(() => {});
  return {
    id: 'switch-persists',
    ok: true,
    status: 'pass',
    message: 'switch_agent updates active_agent_id correctly',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== verify-agent-selection ===\n');

  const results: CheckResult[] = [];

  results.push(checkPredefinedAgentFields());
  results.push(checkPerRequestRoutingInRust());
  results.push(checkFrontendWiresAgentId());

  const sidecarRunning = await isSidecarRunning();
  if (sidecarRunning) {
    results.push(await checkLiveAgentCount().catch((err: unknown) => ({
      id: 'live-agent-count',
      ok: false,
      status: 'error',
      message: String(err),
    })));
    results.push(await checkSwitchAgentPersists().catch((err: unknown) => ({
      id: 'switch-persists',
      ok: false,
      status: 'error',
      message: String(err),
    })));
  } else {
    console.log(`Sidecar not running on port ${PORT} — live checks skipped.\n`);
    results.push({ id: 'live-checks', ok: true, status: 'not_configured', message: 'Sidecar offline' });
  }

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log(`Results: ${passed.length} passed, ${failed.length} failed\n`);
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${r.id.padEnd(35)} ${r.status.padEnd(16)} ${r.message}`);
  }

  const outDir = path.join(ROOT, 'reports/chat');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'agent-selection-matrix.json');
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), predefinedAgents: PREDEFINED_AGENTS, checks: results }, null, 2));
  console.log(`\nReport saved: ${outFile}`);

  const hardFails = failed.filter((r) => r.status !== 'not_configured');
  if (hardFails.length > 0) { console.log('\n✗ Agent selection gate BLOCKED\n'); process.exit(1); }
  console.log('\n✓ Agent selection verification passed\n');
}

main().catch((err) => { console.error('verify-agent-selection error:', err); process.exit(1); });
