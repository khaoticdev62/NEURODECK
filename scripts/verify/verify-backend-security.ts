#!/usr/bin/env tsx
/**
 * verify-backend-security — scans for IPC security violations.
 * Fails on renderer importing Node/Electron APIs directly.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const RENDERER_SRC = path.join(ROOT, 'frontend', 'src');

interface SecurityFlag {
  severity: 'critical' | 'high' | 'medium';
  file: string;
  line: number;
  pattern: string;
  description: string;
}

const CRITICAL_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /require\s*\(\s*['"]electron['"]\s*\)/, description: 'renderer requires electron directly' },
  { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, description: 'renderer requires fs directly' },
  { pattern: /require\s*\(\s*['"]path['"]\s*\)/, description: 'renderer requires path directly' },
  { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, description: 'renderer requires child_process' },
  { pattern: /require\s*\(\s*['"]os['"]\s*\)/, description: 'renderer requires os directly' },
  { pattern: /import\s+.*from\s+['"]electron['"]/, description: 'renderer imports from electron' },
  { pattern: /import\s+.*from\s+['"]fs['"]/, description: 'renderer imports from fs' },
  { pattern: /import\s+.*from\s+['"]child_process['"]/, description: 'renderer imports from child_process' },
  { pattern: /process\.env\.[A-Z_]{3,}/, description: 'renderer reads process.env directly (use import.meta.env)' },
  { pattern: /ipcRenderer\.invoke|ipcRenderer\.send/, description: 'renderer uses raw ipcRenderer (must use preload bridge)' },
  { pattern: /window\.require\s*\(/, description: 'renderer uses window.require (nodeIntegration bypass)' },
  { pattern: /GEMINI_API_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9]{20}/, description: 'secret pattern found in renderer bundle' },
];

const HIGH_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /import\s+.*from\s+['"]\.\..*main[/\\]/, description: 'renderer imports from main process path' },
  { pattern: /import\s+.*from\s+['"]\.\..*services[/\\](?!bridgeAdapter)/, description: 'renderer imports backend service directly' },
  { pattern: /eval\s*\(/, description: 'eval() usage in renderer' },
  { pattern: /new\s+Function\s*\(/, description: 'new Function() in renderer' },
];

function walk(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts).forEach((f) => results.push(f));
    else if (e.isFile() && exts.includes(path.extname(e.name))) results.push(full);
  }
  return results;
}

const files = walk(RENDERER_SRC, ['.ts', '.tsx', '.js']);
const flags: SecurityFlag[] = [];

for (const file of files) {
  if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) continue;
  // bridgeAdapter.ts is the one allowed file with process.env (via import.meta.env)
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, description } of CRITICAL_PATTERNS) {
      if (!pattern.test(line)) continue;
      // Allow import.meta.env (Vite-safe env access)
      if (description.includes('process.env') && line.includes('import.meta.env')) continue;
      flags.push({ severity: 'critical', file: rel, line: i + 1, pattern: pattern.source, description });
    }
    for (const { pattern, description } of HIGH_PATTERNS) {
      if (pattern.test(line)) {
        flags.push({ severity: 'high', file: rel, line: i + 1, pattern: pattern.source, description });
      }
    }
  }
}

// Output
const outDir = path.join(ROOT, 'reports', 'backend');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'security-scan.json'),
  JSON.stringify({ scannedAt: new Date().toISOString(), flags }, null, 2),
  'utf8'
);

const criticals = flags.filter((f) => f.severity === 'critical');
const highs = flags.filter((f) => f.severity === 'high');

console.log('\n=== verify-backend-security ===\n');
if (criticals.length === 0 && highs.length === 0) {
  console.log('✓ No security violations found in renderer source.');
} else {
  if (criticals.length > 0) {
    console.log(`✗ ${criticals.length} CRITICAL violation(s):\n`);
    for (const f of criticals) console.log(`  [CRITICAL] ${f.file}:${f.line} — ${f.description}`);
  }
  if (highs.length > 0) {
    console.log(`\n⚠  ${highs.length} HIGH violation(s):\n`);
    for (const f of highs) console.log(`  [HIGH] ${f.file}:${f.line} — ${f.description}`);
  }
}
console.log(`\nReport: reports/backend/security-scan.json\n`);
process.exit(criticals.length > 0 ? 1 : 0);
