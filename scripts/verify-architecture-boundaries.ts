#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src');

console.log('\n=== verify-architecture-boundaries ===\n');

if (!fs.existsSync(FRONTEND_SRC)) {
  console.error(`✗ Frontend src folder not found: ${FRONTEND_SRC}`);
  process.exit(1);
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const SKIP_EXTS = new Set(['.json', '.png', '.ico', '.svg', '.woff2', '.ttf', '.md']);

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

const files = walk(FRONTEND_SRC);
let violations = 0;

const BOUNDARY_RULES = [
  {
    regex: /import.*electron/i,
    desc: 'Direct import of electron in renderer code',
    allowedFiles: []
  },
  {
    regex: /require\(['"]electron['"]\)/i,
    desc: 'Direct require of electron in renderer code',
    allowedFiles: []
  },
  {
    regex: /import.*fs/i,
    desc: 'Direct import of fs in renderer code',
    allowedFiles: []
  },
  {
    regex: /require\(['"]fs['"]\)/i,
    desc: 'Direct require of fs in renderer code',
    allowedFiles: []
  },
  {
    regex: /require\(['"]child_process['"]\)/i,
    desc: 'Direct require of child_process in renderer code',
    allowedFiles: []
  },
  {
    regex: /process\.env/i,
    desc: 'Direct access to process.env in renderer code (use window.NEURODECK_PORT or window.electronAPI)',
    allowedFiles: [/neurobridge\.js/] // neurobridge might use defensive environment fallbacks
  },
  {
    regex: /@tauri-apps/i,
    desc: 'Residual Tauri import in renderer code',
    allowedFiles: []
  }
];

for (const file of files) {
  const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const rule of BOUNDARY_RULES) {
      if (rule.regex.test(line)) {
        // Check if file is allowed for this rule
        const isAllowed = rule.allowedFiles.some(ex => {
          if (typeof ex === 'string') return relPath.includes(ex);
          return ex.test(relPath);
        });

        if (!isAllowed) {
          console.error(`✗ Boundary Violation in ${relPath}:${i + 1}`);
          console.error(`  > Rule: ${rule.desc}`);
          console.error(`  > Line: ${line.trim()}`);
          violations++;
        }
      }
    }
  }
}

console.log(`\nScan complete. Found ${violations} violation(s).`);
process.exit(violations > 0 ? 1 : 0);
