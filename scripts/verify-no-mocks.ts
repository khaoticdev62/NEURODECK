#!/usr/bin/env tsx
/**
 * verify-no-mocks — scans production source for mock/stub/fake data patterns.
 * Fails with exit code 1 on production violations.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  col: number;
  pattern: string;
  context: string;
  classification: 'production_violation' | 'safe_static_config' | 'allowed_fallback' | 'test_only_allowed';
}

const ROOT = path.resolve(__dirname, '..');

// Files / directories to skip entirely
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'target', '.git', 'reports',
  'tests', '__tests__', '.storybook', 'storybook-static',
]);
const SKIP_EXTS = new Set(['.json', '.lock', '.png', '.ico', '.svg', '.woff2', '.ttf']);

// Patterns that are true production violations
const VIOLATION_PATTERNS: Array<{ pattern: RegExp; description: string; exceptions?: RegExp[] }> = [
  {
    pattern: /Promise\.resolve\(\s*\{\s*success:\s*false,\s*note:\s*['"]Not yet implemented/,
    description: 'Stub returning "Not yet implemented"',
  },
  {
    pattern: /return\s+\{\s*success:\s*false,\s*note:\s*['"]Not yet implemented/,
    description: 'Stub return block "Not yet implemented"',
  },
  {
    pattern: /\/\/\s*TODO:.*implement/i,
    description: 'TODO: implement comment in production handler',
    exceptions: [/commands\/mod\.rs/, /bridge\.rs/], // Rust TODOs reviewed separately
  },
  {
    pattern: /latencyMs:\s*12\b/,
    description: 'Hardcoded latencyMs:12 (synthetic, only allowed in offline-draft fallback)',
    exceptions: [/bridgeAdapter\.ts/], // allowed in offline draft
  },
  {
    pattern: /demoData|sampleData|testData\b/i,
    description: 'Demo/sample/test data variable name in production path',
    exceptions: [/\.test\.|\.spec\.|__tests__/],
  },
  {
    pattern: /import.*from.*['"](\.\.?\/)*.*mock/i,
    description: 'Production file imports from mock path',
    exceptions: [/\.test\.|\.spec\.|__tests__/],
  },
];

// Patterns that need review but aren't automatic violations
const WARNING_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /Promise\.resolve\(\s*\{\s*ok:\s*true\s*\}/, description: 'Stub Promise.resolve({ok:true})' },
  { pattern: /Promise\.resolve\(\s*\{\s*valid:\s*true\s*\}/, description: 'Stub Promise.resolve({valid:true})' },
  { pattern: /latencyMs:\s*0\b/, description: 'Hardcoded latencyMs:0 in response' },
  { pattern: /\/\/\s*(TEMP|FIXME|HACK)\b/i, description: 'TEMP/FIXME/HACK comment' },
];

// Explicitly allowed patterns and their justifications
const ALLOWED_PATTERNS: Array<{ file: string | RegExp; pattern: string; reason: string }> = [
  { file: /preload\.js/, pattern: 'models.cancel', reason: 'No-op by design — no sidecar cancel endpoint exists' },
  { file: /preload\.js/, pattern: 'settings.validate', reason: 'Pass-through validation — real validation occurs on settings.set' },
  { file: /bridgeAdapter\.ts/, pattern: 'browserDraft', reason: 'Intentional offline-draft fallback, clearly labeled' },
  { file: /bridgeAdapter\.ts/, pattern: 'fallbackHealth', reason: 'Fallback health array for bridge-unavailable state' },
  { file: /bridgeAdapter\.ts/, pattern: 'fallbackDiagnostics', reason: 'Fallback diagnostics for bridge-unavailable state' },
  { file: /bridgeAdapter\.ts/, pattern: 'latencyMs: 0', reason: 'Zero latency in fallback path — not real metric, acceptable' },
  { file: /useNeuroDeckState\.ts/, pattern: 'latencyMs: 42', reason: 'Initial placeholder overwritten by real hydration data' },
  { file: /seed\.ts/, pattern: '*', reason: 'Seed file used for initial state only — overwritten by real hydration' },
];

function walk(dir: string, results: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, results);
    else if (e.isFile() && !SKIP_EXTS.has(path.extname(e.name))) results.push(full);
  }
  return results;
}

function isAllowed(filePath: string, line: string): boolean {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.match(/\.test\.|\.spec\.|__tests__/)) return true;
  for (const a of ALLOWED_PATTERNS) {
    const fileMatch = typeof a.file === 'string' ? rel.includes(a.file) : a.file.test(rel);
    if (fileMatch && (a.pattern === '*' || line.includes(a.pattern))) return true;
  }
  return false;
}

const files = walk(path.join(ROOT, 'electron'))
  .concat(walk(path.join(ROOT, 'frontend', 'src')));

const violations: Finding[] = [];
const warnings: Finding[] = [];

for (const file of files) {
  if (!file.match(/\.(ts|tsx|js|mjs|cjs)$/)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, description, exceptions } of VIOLATION_PATTERNS) {
      if (!pattern.test(line)) continue;
      if (exceptions?.some((ex) => ex.test(file))) continue;
      if (isAllowed(file, line)) continue;
      violations.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        line: i + 1,
        col: line.search(pattern) + 1,
        pattern: description,
        context: line.trim(),
        classification: 'production_violation',
      });
    }

    for (const { pattern, description } of WARNING_PATTERNS) {
      if (!pattern.test(line)) continue;
      if (isAllowed(file, line)) continue;
      warnings.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        line: i + 1,
        col: line.search(pattern) + 1,
        pattern: description,
        context: line.trim(),
        classification: 'safe_static_config',
      });
    }
  }
}

// Write JSON report
const outDir = path.join(ROOT, 'reports', 'backend');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'mock-data-findings.json'),
  JSON.stringify({ scannedAt: new Date().toISOString(), violations, warnings, allowed: ALLOWED_PATTERNS }, null, 2),
  'utf8'
);

// Console output
console.log('\n=== verify-no-mocks ===\n');
if (violations.length === 0) {
  console.log('✓ No production mock violations found.');
} else {
  console.log(`✗ ${violations.length} production violation(s):\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} — ${v.pattern}`);
    console.log(`    > ${v.context}`);
  }
}
if (warnings.length > 0) {
  console.log(`\n⚠  ${warnings.length} warning(s) (review manually):\n`);
  for (const w of warnings) {
    console.log(`  ${w.file}:${w.line} — ${w.pattern}`);
  }
}
console.log(`\nAllowed exceptions: ${ALLOWED_PATTERNS.length}`);
console.log(`Report: reports/backend/mock-data-findings.json\n`);

process.exit(violations.length > 0 ? 1 : 0);
