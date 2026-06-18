import * as fs from 'fs';
import * as path from 'path';
import { walkDir } from './fs';

export interface Finding {
  file: string;
  line: number;
  col: number;
  pattern: string;
  context: string;
  classification?: 'production_violation' | 'safe_static_config' | 'test_only_allowed' | 'allowed_fallback';
}

export interface PatternRule {
  pattern: RegExp;
  description: string;
  exceptions?: RegExp[];
}

export interface AllowedPattern {
  file: string | RegExp;
  pattern: string;
  reason: string;
}

export interface MockScannerConfig {
  root: string;
  consoleTitle: string;
  reportPath: string;
  scanDirs: string[];
  violationPatterns: PatternRule[];
  warningPatterns?: PatternRule[];
  allowedPatterns: AllowedPattern[];
  skipDirs?: string[];
  skipExts?: string[];
  fileExts?: RegExp;
  skipTestPaths?: boolean;
}

const TEST_PATH_RE = /\.test\.|\.spec\.|__tests__/;

function isAllowed(filePath: string, line: string, allowedPatterns: AllowedPattern[], root: string): boolean {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  for (const a of allowedPatterns) {
    const fileMatch = typeof a.file === 'string' ? rel.includes(a.file) : a.file.test(rel);
    if (fileMatch && (a.pattern === '*' || line.includes(a.pattern))) return true;
  }
  return false;
}

export function runMockScanner(config: MockScannerConfig): { violations: Finding[]; warnings: Finding[] } {
  const skipDirs = new Set(config.skipDirs ?? []);
  const skipExts = new Set(config.skipExts ?? []);

  const files = config.scanDirs
    .flatMap((dir) => walkDir(config.root, dir, { skipDirs, skipExts }))
    .filter((file) => (config.fileExts ? config.fileExts.test(file) : true));

  const violations: Finding[] = [];
  const warnings: Finding[] = [];

  for (const file of files) {
    const rel = path.relative(config.root, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    if (config.skipTestPaths && TEST_PATH_RE.test(rel)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, description, exceptions } of config.violationPatterns) {
        if (!pattern.test(line)) continue;
        if (exceptions?.some((ex) => ex.test(file))) continue;
        if (isAllowed(file, line, config.allowedPatterns, config.root)) continue;
        violations.push({
          file: rel,
          line: i + 1,
          col: line.search(pattern) + 1,
          pattern: description,
          context: line.trim(),
          classification: 'production_violation',
        });
      }

      for (const { pattern, description } of config.warningPatterns ?? []) {
        if (!pattern.test(line)) continue;
        if (isAllowed(file, line, config.allowedPatterns, config.root)) continue;
        warnings.push({
          file: rel,
          line: i + 1,
          col: line.search(pattern) + 1,
          pattern: description,
          context: line.trim(),
          classification: 'safe_static_config',
        });
      }
    }
  }

  const outDir = path.dirname(config.reportPath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    config.reportPath,
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        violations,
        warnings,
        allowed: config.allowedPatterns,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\n=== ${config.consoleTitle} ===\n`);
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
  console.log(`\nAllowed exceptions: ${config.allowedPatterns.length}`);
  console.log(`Report: ${path.relative(config.root, config.reportPath).replace(/\\/g, '/')}\n`);

  return { violations, warnings };
}
