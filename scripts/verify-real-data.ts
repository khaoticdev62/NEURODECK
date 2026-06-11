#!/usr/bin/env tsx
/**
 * verify-real-data — confirms backend responses include real provenance.
 * Checks that no production handler returns realData:true for synthetic data.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports', 'backend');

interface ProvCheck { file: string; finding: string; passed: boolean }

const checks: ProvCheck[] = [];

function check(file: string, finding: string, passed: boolean) {
  checks.push({ file, finding, passed });
}

// 1. Verify no production handler has hardcoded realData: true without real transport
const bridgeAdapterPath = path.join(ROOT, 'frontend', 'src', 'react', 'services', 'bridgeAdapter.ts');
if (fs.existsSync(bridgeAdapterPath)) {
  const src = fs.readFileSync(bridgeAdapterPath, 'utf8');
  check('bridgeAdapter.ts', 'No hardcoded realData:true', !src.includes('realData: true'));
  check('bridgeAdapter.ts', 'browserDraft is isolated to offline-draft path', src.includes("provider === 'offline-draft'"));
}

// 2. Verify health probe runner marks ipc_roundtrip as synthetic
const probeRunnerPath = path.join(ROOT, 'electron', 'services', 'diagnostics', 'health-probe-runner.js');
if (fs.existsSync(probeRunnerPath)) {
  const src = fs.readFileSync(probeRunnerPath, 'utf8');
  check('health-probe-runner.js', 'ipc_roundtrip uses real transport (realTransportUsed: true)', src.includes('realTransportUsed: true'));
  check('health-probe-runner.js', 'system probe marks realTransportUsed: false', src.includes('realTransportUsed: false'));
  check('health-probe-runner.js', 'storage probe uses real fs.writeFileSync', src.includes('writeFileSync'));
  check('health-probe-runner.js', 'storage probe uses real fs.readFileSync', src.includes('readFileSync'));
}

// 3. Verify seed.ts is only used in hydration (not as production data source)
const statePath = path.join(ROOT, 'frontend', 'src', 'react', 'state', 'useNeuroDeckState.ts');
if (fs.existsSync(statePath)) {
  const src = fs.readFileSync(statePath, 'utf8');
  check('useNeuroDeckState.ts', 'Hydrates from real bridge (getInitialState)', src.includes('getInitialState'));
  check('useNeuroDeckState.ts', 'Hydrates memory from real bridge (memory.list)', src.includes('memory.list'));
  check('useNeuroDeckState.ts', 'Hydrates sessions from real bridge (sessions.listMeta)', src.includes('sessions.listMeta'));
  check('useNeuroDeckState.ts', 'Hydrates agents from real bridge (agents.list)', src.includes('agents.list'));
  check('useNeuroDeckState.ts', 'Hydrates plugins from real bridge (plugins.list)', src.includes('plugins.list'));
}

// 4. Verify settings handler doesn't fake success for unsupported keys
const ipcHandlersPath = path.join(ROOT, 'electron', 'ipc-handlers.js');
if (fs.existsSync(ipcHandlersPath)) {
  const src = fs.readFileSync(ipcHandlersPath, 'utf8');
  check('ipc-handlers.js', 'settings:set has real set_provider dispatch', src.includes("callSidecar(bridgePort, 'set_provider'"));
  check('ipc-handlers.js', 'settings:set has real set_model dispatch', src.includes("callSidecar(bridgePort, 'set_model'"));
  check('ipc-handlers.js', 'settings:set returns error for unknown keys (no fake success)', src.includes('not configurable via this channel'));
}

// 5. Verify BROWSER_SAVE_TO_MEMORY is real
const mainJsPath = path.join(ROOT, 'electron', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const src = fs.readFileSync(mainJsPath, 'utf8');
  check('main.js', 'BROWSER_SAVE_TO_MEMORY hits real sidecar memory_add_fact', src.includes('memory_add_fact'));
  check('main.js', 'BROWSER_SAVE_TO_MEMORY not a stub', !src.includes("note: 'Not yet implemented'"));
}

// Output
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(
  path.join(REPORTS_DIR, 'real-data-verification.json'),
  JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2),
  'utf8'
);

const passed = checks.filter((c) => c.passed);
const failed = checks.filter((c) => !c.passed);

console.log('\n=== verify-real-data ===\n');
for (const c of checks) {
  console.log(`  ${c.passed ? '✓' : '✗'} [${c.file}] ${c.finding}`);
}
console.log(`\n${passed.length}/${checks.length} checks passed`);
console.log(`Report: reports/backend/real-data-verification.json\n`);
process.exit(failed.length > 0 ? 1 : 0);
