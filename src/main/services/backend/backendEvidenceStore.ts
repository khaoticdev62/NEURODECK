/**
 * Evidence store — persists probe results to disk for audit trail.
 * Writes JSON to reports/backend/ for CI inspection.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BackendProbeResult } from '../../shared/contracts/backendHealth.contracts';

const REPORTS_DIR = path.join(process.cwd(), 'reports', 'backend');

function ensureDir(): void {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export function saveProbeResults(results: BackendProbeResult[]): string {
  ensureDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(REPORTS_DIR, `probe-run-${ts}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    totalProbes: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

export function saveReadinessReport(report: unknown): string {
  ensureDir();
  const file = path.join(REPORTS_DIR, 'backend-readiness-report.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

export function loadLatestProbeRun(): BackendProbeResult[] | null {
  ensureDir();
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.startsWith('probe-run-') && f.endsWith('.json'))
    .sort()
    .reverse();
  if (!files.length) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, files[0]), 'utf8'));
    return raw.results ?? null;
  } catch {
    return null;
  }
}
