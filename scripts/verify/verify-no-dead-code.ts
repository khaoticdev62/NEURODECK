#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const REPORT_PATH = path.join(ROOT, 'reports', 'fallow', 'dead-code-final-dead-code.json');

interface FallowReport {
  unused_files?: Array<{ path: string }>;
  unused_exports?: Array<{ path: string; export_name: string }>;
}

function fallowAvailable(): boolean {
  try {
    execSync('fallow --version', { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function regenerateReport(): boolean {
  try {
    execSync('npm run quality:fallow:json', { cwd: ROOT, stdio: 'inherit' });
    return fs.existsSync(REPORT_PATH);
  } catch (_) {
    return false;
  }
}

console.log('\n=== verify-no-dead-code ===\n');

const hasFallow = fallowAvailable();
if (hasFallow) {
  console.log('fallow detected — regenerating dead-code report…');
  if (!regenerateReport()) {
    console.error('✗ Failed to regenerate fallow report.');
    process.exit(1);
  }
} else {
  console.log('fallow CLI not available — using committed baseline report.');
  console.log('Install fallow locally if you want a fresh report.');
}

if (!fs.existsSync(REPORT_PATH)) {
  if (hasFallow) {
    console.error(`✗ Fallow report not found at: ${REPORT_PATH}`);
    console.error('Please run "npm run quality:fallow:json" first to generate the report.');
    process.exit(1);
  } else {
    console.log('⚠ Fallow report not found and Fallow CLI is unavailable.');
    console.log('  Skipping dead-code verification. Install Fallow to enable this gate.');
    process.exit(0);
  }
}

const data = fs.readFileSync(REPORT_PATH, 'utf8');
let report: FallowReport;
try {
  report = JSON.parse(data);
} catch (e: any) {
  console.error(`✗ Failed to parse Fallow report: ${e.message}`);
  process.exit(1);
}

// Configured allowed exceptions for dead code (e.g. contract files or storybook files)
const ALLOWED_UNUSED_FILES = [
  /src\/shared\/contracts\//,
  /src\/shared\/schemas\//,
  /src\/shared\/registries\//,
  /src\/shared\/theme\//,
];

const ALLOWED_UNUSED_EXPORTS = [
  { path: /electron\/ipc-guards\.js/, export: 'SCHEMA_VERSION' }
];

let violationsCount = 0;

if (report.unused_files && report.unused_files.length > 0) {
  console.log('Checking unused files...');
  for (const file of report.unused_files) {
    const isAllowed = ALLOWED_UNUSED_FILES.some(re => re.test(file.path));
    if (!isAllowed) {
      console.log(`✗ Unused Production File: ${file.path}`);
      violationsCount++;
    } else {
      console.log(`✓ (Allowed Exception) Unused File: ${file.path}`);
    }
  }
}

if (report.unused_exports && report.unused_exports.length > 0) {
  console.log('\nChecking unused exports...');
  for (const exp of report.unused_exports) {
    const isAllowed = ALLOWED_UNUSED_EXPORTS.some(rule => rule.path.test(exp.path) && rule.export === exp.export_name);
    if (!isAllowed) {
      console.log(`✗ Unused Export: ${exp.path} [${exp.export_name}]`);
      violationsCount++;
    } else {
      console.log(`✓ (Allowed Exception) Unused Export: ${exp.path} [${exp.export_name}]`);
    }
  }
}

console.log(`\nScan complete. Found ${violationsCount} violation(s).`);

if (violationsCount > 0) {
  process.exit(1);
} else {
  console.log('✓ Dead-code verification passed.');
  process.exit(0);
}
