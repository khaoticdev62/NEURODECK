/**
 * verify-lsp-ide-support.ts
 * Checks that:
 *   - All 9 LSP IPC channels are registered
 *   - Preload exposes window.neurodeck.lsp.* methods
 *   - IDEView.tsx calls LSP on file open/change/close
 *   - No fake/hardcoded completions in production IDE code
 */
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const IPC_REGISTRY = path.resolve(__dirname, '../electron/ipc-registry.js');
const PRELOAD_PATH = path.resolve(__dirname, '../electron/preload.js');
const LSP_MANAGER = path.resolve(__dirname, '../electron/services/lsp/lsp-manager.js');
const IDE_VIEW = path.resolve(__dirname, '../frontend/src/react/features/ide/IDEView.tsx');

const REQUIRED_LSP_CHANNELS = [
  'lsp:start-server',
  'lsp:stop-server',
  'lsp:open-document',
  'lsp:change-document',
  'lsp:close-document',
  'lsp:completion',
  'lsp:hover',
  'lsp:definition',
  'lsp:format',
];

const REQUIRED_PRELOAD_LSP_METHODS = [
  'startServer',
  'stopServer',
  'openDocument',
  'changeDocument',
  'closeDocument',
  'completion',
  'hover',
  'definition',
  'format',
  'onDiagnostics',
];

const FAKE_COMPLETION_PATTERNS = [
  '// fake',
  'fakeLspCompletion',
  'mockCompletion',
  "insertText: 'fake",
  "label: 'mock",
  'FAKE_COMPLETIONS',
  'MOCK_COMPLETIONS',
  'hardcoded completion',
];

function checkFileContains(filePath: string, patterns: string[], label: string) {
  if (!fs.existsSync(filePath)) {
    fail(`${label}: file not found`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const p of patterns) {
    if (content.includes(p)) {
      pass(`${label}: contains "${p}"`);
    } else {
      fail(`${label}: missing "${p}"`);
    }
  }
}

function checkFileNotContains(filePath: string, patterns: string[], label: string) {
  if (!fs.existsSync(filePath)) {
    info(`${label}: file not found — skip`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const p of patterns) {
    if (!content.includes(p)) {
      pass(`${label}: does NOT contain "${p}" (correct)`);
    } else {
      fail(`${label}: contains forbidden pattern "${p}"`);
    }
  }
}

function main() {
  info('--- IPC channel registration ---');
  checkFileContains(IPC_REGISTRY, REQUIRED_LSP_CHANNELS, 'ipc-registry.js');

  info('--- Preload LSP API surface ---');
  checkFileContains(PRELOAD_PATH, REQUIRED_PRELOAD_LSP_METHODS, 'preload.js');

  info('--- LSP Manager exists ---');
  if (fs.existsSync(LSP_MANAGER)) {
    pass('lsp-manager.js found');
    const content = fs.readFileSync(LSP_MANAGER, 'utf8');
    for (const method of ['startServer', 'stopServer', 'openDocument', 'changeDocument', 'closeDocument', 'completion']) {
      if (content.includes(method)) {
        pass(`lsp-manager.js: method ${method} present`);
      } else {
        fail(`lsp-manager.js: method ${method} missing`);
      }
    }
  } else {
    fail(`lsp-manager.js not found at ${LSP_MANAGER}`);
  }

  info('--- IDEView LSP integration ---');
  checkFileContains(IDE_VIEW, [
    'openDocument',
    'changeDocument',
    'closeDocument',
    'onDiagnostics',
  ], 'IDEView.tsx');

  info('--- No fake completions in production IDE code ---');
  const ideDir = path.resolve(__dirname, '../frontend/src/react/features/ide');
  const electronIdeDir = path.resolve(__dirname, '../electron/services/ide');

  for (const dir of [ideDir, electronIdeDir]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.match(/\.(ts|tsx|js)$/));
    for (const file of files) {
      checkFileNotContains(path.join(dir, file), FAKE_COMPLETION_PATTERNS, file);
    }
  }

  console.log(`\n=== verify-lsp-ide-support: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} failure(s) found.`);
    process.exit(1);
  }
}

main();
