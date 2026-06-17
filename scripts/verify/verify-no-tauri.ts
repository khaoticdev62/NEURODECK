#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'target', '.git', 'reports', 'docs/cleanup',
  '.fallow', '.serena', '.ruff_cache', '.playwright-mcp', '.venv', '.tmp'
]);

const SKIP_EXTS = new Set(['.json', '.lock', '.png', '.ico', '.svg', '.woff2', '.ttf', '.md']);

interface Finding {
  file: string;
  line: number;
  pattern: string;
  context: string;
}

const VIOLATIONS: Finding[] = [];

// Search patterns
const PATTERNS = [
  { regex: /@tauri-apps/, desc: '@tauri-apps import' },
  { regex: /__TAURI__/, desc: '__TAURI__ reference (requires explanation/override)' },
  { regex: /tauri::command/, desc: 'tauri::command attribute in Rust' },
  { regex: /tauri::Builder/, desc: 'tauri::Builder usage in Rust' },
  { regex: /generate_handler!/, desc: 'generate_handler! macro in Rust' },
  { regex: /tauri_compat/, desc: 'tauri_compat reference' },
  { regex: /cargo tauri/, desc: 'cargo tauri command reference' }
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

const files = walk(path.join(ROOT, 'frontend', 'src'))
  .concat(walk(path.join(ROOT, 'electron')))
  .concat(walk(path.join(ROOT, 'src-tauri', 'src')));

for (const file of files) {
  const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
  if (relPath.startsWith('docs/')) continue; // Skip all docs
  if (relPath.startsWith('scripts/verify-no-tauri.ts')) continue; // Skip self

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Exception for neurobridge.js defensive check
    if (relPath.endsWith('neurobridge.js') && line.includes('// ALLOW_TAURI_FALLBACK')) {
      continue;
    }
    // General check for the file
    if (relPath.endsWith('neurobridge.js') && (line.includes('__TAURI__') || line.includes('window.__TAURI__'))) {
      // Allow these specifically in neurobridge.js as defensive fallback
      continue;
    }

    for (const pat of PATTERNS) {
      if (pat.regex.test(line)) {
        VIOLATIONS.push({
          file: relPath,
          line: i + 1,
          pattern: pat.desc,
          context: line.trim()
        });
      }
    }
  }
}

console.log('\n=== verify-no-tauri ===\n');
if (VIOLATIONS.length === 0) {
  console.log('✓ No Tauri remnants or compatibility layers found.');
  process.exit(0);
} else {
  console.log(`✗ Found ${VIOLATIONS.length} Tauri remnant(s):\n`);
  for (const v of VIOLATIONS) {
    console.log(`  ${v.file}:${v.line} — ${v.pattern}`);
    console.log(`    > ${v.context}`);
  }
  process.exit(1);
}
