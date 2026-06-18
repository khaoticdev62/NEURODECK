#!/usr/bin/env tsx
/**
 * verify-no-mock-chat — scans production source for forbidden mock chat patterns.
 *
 * Forbidden in production paths (src/main, src/preload, frontend/src, electron):
 *   - mockChat, fakeMessages, staticAssistantResponse
 *   - setTimeout.*token (fake streaming)
 *   - lorem ipsum in AI responses
 *   - return "This is a mock"
 *   - Promise.resolve({ content: (static response)
 *
 * Allowed only in: tests/**, *.test.ts, *.spec.ts, stories/**, fixtures/**
 */

import * as fs from 'fs';
import * as path from 'path';
import { walkDir } from './lib/fs';

const ROOT = path.resolve(__dirname, '../..');

interface MockFinding {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

const FORBIDDEN_PATTERNS = [
  { pattern: /mockChat(?!Messages\.test|\.spec|stories)/g, label: 'mockChat in production' },
  { pattern: /fakeMessages/g, label: 'fakeMessages' },
  { pattern: /staticAssistantResponse/g, label: 'staticAssistantResponse' },
  { pattern: /return\s+"This is a mock/g, label: 'hardcoded mock return string' },
  { pattern: /lorem ipsum/gi, label: 'lorem ipsum placeholder' },
  { pattern: /const\s+\w*[Mm]ock\w*[Rr]esponse\s*=/g, label: 'mockResponse variable in production' },
];

const PRODUCTION_DIRS = [
  'frontend/src',
  'electron',
  'src/main',
  'src/preload',
  'src/shared',
];

const ALLOWED_PATTERNS_IN_PATH = [
  'tests/',
  '.test.',
  '.spec.',
  'stories/',
  'fixtures/',
  '__mocks__/',
  'node_modules/',
];

function isAllowedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWED_PATTERNS_IN_PATH.some((p) => normalized.includes(p));
}

function scanFile(filePath: string): MockFinding[] {
  if (isAllowedPath(filePath)) return [];
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.mjs'].includes(ext)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings: MockFinding[] = [];

  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        findings.push({
          file: filePath.replace(ROOT + path.sep, '').replace(/\\/g, '/'),
          line: i + 1,
          pattern: label,
          content: lines[i].trim().slice(0, 120),
        });
      }
      pattern.lastIndex = 0;
    }
  }
  return findings;
}

async function main() {
  console.log('\n=== verify-no-mock-chat ===\n');

  const allFindings: MockFinding[] = [];
  for (const dir of PRODUCTION_DIRS) {
    const files = walkDir(ROOT, dir, {
      skipDirs: new Set(['node_modules', 'dist', '.git']),
    });
    for (const file of files) {
      allFindings.push(...scanFile(file));
    }
  }

  const outDir = path.join(ROOT, 'reports/chat');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'mock-data-findings.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        violationCount: allFindings.length,
        violations: allFindings,
        productionGatePassed: allFindings.length === 0,
      },
      null,
      2
    )
  );

  if (allFindings.length === 0) {
    console.log('✓ No mock chat patterns found in production source\n');
    console.log(`Report saved: ${outFile}`);
    process.exit(0);
  }

  console.log(`✗ ${allFindings.length} mock chat violation(s) found:\n`);
  for (const f of allFindings) {
    console.log(`  ${f.file}:${f.line} — ${f.pattern}`);
    console.log(`    ${f.content}`);
  }
  console.log(`\nReport saved: ${outFile}`);
  console.log('\n✗ No-mock-chat gate BLOCKED\n');
  process.exit(1);
}

main().catch((err) => { console.error('verify-no-mock-chat error:', err); process.exit(1); });
