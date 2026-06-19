/**
 * verify-safe-command-execution.ts
 * Checks the safe command execution service:
 *   - BLOCKED_COMMANDS list is non-empty
 *   - Critical patterns are blocked
 *   - Classify API returns expected tiers
 *   - spawn is used with args array (not shell strings)
 *   - Renderer cannot call child_process directly
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const SERVICE_PATH = path.resolve(__dirname, '../../electron/services/ide/safeCommandExecutionService.js');
const PRELOAD_PATH = path.resolve(__dirname, '../../electron/preload.js');
const RENDERER_SRC = path.resolve(__dirname, '../frontend/src');

const MUST_BE_BLOCKED = [
  'curl | sh',
  'rm -rf /',
  'sudo rm',
  ':(){ :|:& };:',
  'mimikatz',
  'chmod -R 777',
];

const MUST_BE_CONFIRM = [
  'npm install',
  'pip install',
  'bash ',
];

const MUST_BE_SAFE = [
  'cargo check',
  'go vet',
  'eslint',
];

function main() {
  info('--- Service file exists ---');
  if (!fs.existsSync(SERVICE_PATH)) {
    fail(`safeCommandExecutionService.js not found at ${SERVICE_PATH}`);
    process.exit(1);
  }
  pass('safeCommandExecutionService.js found');

  info('--- Loading service ---');
  let service: any;
  try {
    const mod = require(SERVICE_PATH);
    service = mod.safeCommandExecutionService;
    if (!service) throw new Error('safeCommandExecutionService singleton not exported');
    pass('safeCommandExecutionService loaded');
  } catch (e) {
    fail(`Cannot load service: ${e}`);
    process.exit(1);
  }

  info('--- BLOCKED_COMMANDS list ---');
  const { BLOCKED_COMMANDS } = require(SERVICE_PATH);
  if (!Array.isArray(BLOCKED_COMMANDS) || BLOCKED_COMMANDS.length === 0) {
    fail('BLOCKED_COMMANDS is empty or not exported');
  } else {
    pass(`BLOCKED_COMMANDS has ${BLOCKED_COMMANDS.length} entries`);
  }

  info('--- classifyCommand: blocked tier ---');
  for (const dangerous of MUST_BE_BLOCKED) {
    const [cmd, ...args] = dangerous.split(' ');
    const result = service.classifyCommand(cmd, args);
    if (result === 'blocked') {
      pass(`"${dangerous}" → blocked`);
    } else {
      fail(`"${dangerous}" → expected blocked, got ${result}`);
    }
  }

  info('--- classifyCommand: confirm tier ---');
  for (const confirmCmd of MUST_BE_CONFIRM) {
    const [cmd, ...args] = confirmCmd.trim().split(' ');
    const result = service.classifyCommand(cmd, [...args, 'some-package']);
    if (result === 'confirm' || result === 'blocked') {
      pass(`"${confirmCmd}" → ${result} (confirm or stricter)`);
    } else {
      fail(`"${confirmCmd}" → expected confirm, got ${result}`);
    }
  }

  info('--- classifyCommand: safe tier ---');
  for (const safeCmd of MUST_BE_SAFE) {
    const [cmd, ...args] = safeCmd.trim().split(' ');
    const result = service.classifyCommand(cmd, args);
    if (result === 'safe') {
      pass(`"${safeCmd}" → safe`);
    } else {
      fail(`"${safeCmd}" → expected safe, got ${result}`);
    }
  }

  info('--- spawn uses args array (source check) ---');
  const serviceSource = fs.readFileSync(SERVICE_PATH, 'utf8');
  if (serviceSource.includes('spawn(command, args,')) {
    pass('spawn called with args array');
  } else {
    fail('spawn pattern not found — may be using shell string');
  }
  if (serviceSource.includes('shell:') && serviceSource.includes('shell: true')) {
    fail('shell: true found — this enables dangerous shell string interpolation');
  } else {
    pass('no shell:true in spawn call');
  }

  info('--- Renderer cannot access child_process ---');
  const preloadContent = fs.readFileSync(PRELOAD_PATH, 'utf8');
  if (preloadContent.includes('child_process')) {
    fail('preload.js exposes child_process — this is unsafe');
  } else {
    pass('preload.js does not expose child_process');
  }

  // Check frontend bundle src
  let foundChildProcess = false;
  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scanDir(full);
      } else if (entry.isFile() && entry.name.match(/\.(ts|tsx|js)$/) && !entry.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes("require('child_process')") || content.includes('from "child_process"') || content.includes("from 'child_process'")) {
          fail(`Frontend source ${full} imports child_process — security violation`);
          foundChildProcess = true;
        }
      }
    }
  }
  scanDir(RENDERER_SRC);
  if (!foundChildProcess) {
    pass('Frontend source does not import child_process');
  }

  console.log(`\n=== verify-safe-command-execution: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} failure(s) found.`);
    process.exit(1);
  }
}

main();
