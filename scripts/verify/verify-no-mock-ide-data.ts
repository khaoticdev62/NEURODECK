/**
 * verify-no-mock-ide-data.ts
 * Scans production IDE code for hardcoded fake completions, mock LSP
 * diagnostics, or fake terminal output. Fails on matches outside
 * __tests__/, fixtures/, and *.test.ts files.
 */
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const MOCK_PATTERNS = [
  // Fake LSP completions
  /fakeLspCompletion/i,
  /mockCompletion/i,
  /FAKE_COMPLETIONS/,
  /MOCK_COMPLETIONS/,
  /hardcoded.*completion/i,
  // Fake diagnostics
  /fakeDiagnostic/i,
  /mockDiagnostic/i,
  /FAKE_DIAGNOSTIC/,
  // Fake terminal output
  /fakeOutput/i,
  /mockOutput/i,
  /FAKE_OUTPUT/,
  // Fake command results
  /fakeCommandResult/i,
  /mockCommandResult/i,
  // Obvious placeholder data
  /TODO.*fake/i,
  /FIXME.*mock/i,
  // Specific patterns for hardcoded arrays that should come from LSP
  /completions\s*=\s*\[\s*\{[^}]*label:\s*['"][A-Za-z]+['"]/,
];

const SCAN_DIRS = [
  path.resolve(__dirname, '../../src/renderer/features/ide'),
  path.resolve(__dirname, '../../electron/services/ide'),
];

const SKIP_PATTERNS = [
  /__tests__/,
  /\.test\.ts/,
  /\.test\.tsx/,
  /\.spec\.ts/,
  /\.spec\.tsx/,
  /fixtures/,
  /\.d\.ts$/,
];

function isSkipped(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(filePath));
}

function scanFile(filePath: string) {
  if (isSkipped(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileChecked = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const pattern of MOCK_PATTERNS) {
      if (pattern.test(line)) {
        fail(`${path.basename(filePath)}:${i + 1} — found mock/fake pattern: "${line.trim().slice(0, 80)}"`);
        fileChecked = true;
      }
    }
  }

  if (!fileChecked) {
    pass(`${path.basename(filePath)}: no mock/fake patterns found`);
  }
  checks++;
  if (fileChecked) {
    // Decrement to avoid double-count (already counted per-line)
    checks--;
  }
}

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) {
    info(`Directory not found: ${dir} — skip`);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.isFile() && entry.name.match(/\.(ts|tsx|js)$/)) {
      scanFile(full);
    }
  }
}

function main() {
  for (const dir of SCAN_DIRS) {
    info(`--- Scanning: ${dir} ---`);
    scanDir(dir);
  }

  console.log(`\n=== verify-no-mock-ide-data: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} file(s) with mock/fake patterns found.`);
    process.exit(1);
  }
}

main();
