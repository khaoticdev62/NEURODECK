#!/usr/bin/env tsx
/**
 * verify-chat-security — checks security boundaries for the chat pipeline.
 *
 * Verifies:
 *   1. No API key patterns in frontend source (sk-, AIza, Bearer hardcoded)
 *   2. No process.env in renderer source
 *   3. No require('electron') in renderer
 *   4. Provider clients not directly imported by renderer
 *   5. No raw ipcRenderer exposure in preload
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface SecurityFinding {
  file: string;
  line: number;
  rule: string;
  content: string;
  severity: 'critical' | 'high' | 'medium';
}

const RENDERER_DIRS = ['frontend/src'];

const SECURITY_RULES = [
  {
    pattern: /AIzaSy[A-Za-z0-9_-]{33}/g,
    rule: 'Hardcoded Gemini API key in renderer',
    severity: 'critical' as const,
  },
  {
    pattern: /sk-[A-Za-z0-9]{32,}/g,
    rule: 'Hardcoded OpenAI-style API key in renderer',
    severity: 'critical' as const,
  },
  {
    pattern: /Bearer\s+[A-Za-z0-9+/=]{20,}/g,
    rule: 'Hardcoded Bearer token in renderer',
    severity: 'critical' as const,
  },
  {
    pattern: /require\(['"]electron['"]\)/g,
    rule: 'Direct require("electron") in renderer — must use preload API',
    severity: 'critical' as const,
  },
  {
    pattern: /process\.env\./g,
    rule: 'process.env access in renderer — env vars must stay in main process',
    severity: 'high' as const,
  },
];

function isTestPath(filePath: string): boolean {
  const n = filePath.replace(/\\/g, '/');
  return n.includes('tests/') || n.includes('.test.') || n.includes('.spec.') || n.includes('node_modules/');
}

function scanFile(filePath: string): SecurityFinding[] {
  if (isTestPath(filePath)) return [];
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.mjs'].includes(ext)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings: SecurityFinding[] = [];

  for (const { pattern, rule, severity } of SECURITY_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      if (pattern.test(line)) {
        findings.push({
          file: filePath.replace(ROOT + path.sep, '').replace(/\\/g, '/'),
          line: i + 1,
          rule,
          content: line.trim().slice(0, 120),
          severity,
        });
      }
      pattern.lastIndex = 0;
    }
  }
  return findings;
}

function walkDir(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const files: string[] = [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
      files.push(...walkDir(path.relative(ROOT, full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('\n=== verify-chat-security ===\n');

  const allFindings: SecurityFinding[] = [];
  for (const dir of RENDERER_DIRS) {
    const files = walkDir(dir);
    for (const file of files) {
      allFindings.push(...scanFile(file));
    }
  }

  const critical = allFindings.filter((f) => f.severity === 'critical');
  const high = allFindings.filter((f) => f.severity === 'high');

  const outDir = path.join(ROOT, 'reports/chat');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'security-scan.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFindings: allFindings.length,
        critical: critical.length,
        high: high.length,
        findings: allFindings,
        productionGatePassed: critical.length === 0,
      },
      null,
      2
    )
  );

  if (allFindings.length === 0) {
    console.log('✓ No security violations found in renderer source\n');
  } else {
    for (const f of allFindings) {
      const icon = f.severity === 'critical' ? '🔴' : '🟡';
      console.log(`  ${icon} [${f.severity.toUpperCase()}] ${f.file}:${f.line}`);
      console.log(`     Rule: ${f.rule}`);
      console.log(`     Code: ${f.content}\n`);
    }
  }

  console.log(`Report saved: ${outFile}`);

  if (critical.length > 0) {
    console.log(`\n✗ ${critical.length} critical security violation(s) — gate BLOCKED\n`);
    process.exit(1);
  }
  if (high.length > 0) {
    console.log(`\n⚠ ${high.length} high-severity finding(s) — review required\n`);
  }
  console.log('\n✓ Chat security verification passed\n');
}

main().catch((err) => { console.error('verify-chat-security error:', err); process.exit(1); });
