#!/usr/bin/env tsx
/**
 * verify-backend — runs all backend probes and exports evidence.
 * Requires the NEURODECK sidecar to be running on NEURODECK_PORT.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAllProbes } from '../src/main/services/backend/backendProbeRunner';
import { saveProbeResults, saveReadinessReport } from '../src/main/services/backend/backendEvidenceStore';
import { BACKEND_SERVICE_INVENTORY } from '../src/main/services/backend/backendHealthRegistry';

async function main() {
  console.log('\n=== verify-backend ===\n');
  console.log(`Bridge port: ${process.env.NEURODECK_PORT ?? '9477'}`);
  console.log(`Running ${9} probes...\n`);

  const results = await runAllProbes();
  const probeFile = saveProbeResults(results);

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log(`Results: ${passed.length} passed, ${failed.length} failed\n`);
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${r.id.padEnd(30)} ${r.status.padEnd(22)} ${r.durationMs}ms`);
    if (!r.ok && r.error) console.log(`      → ${r.error.message}`);
  }

  // Build readiness report
  const inventory = BACKEND_SERVICE_INVENTORY;
  const statusCounts: Record<string, number> = {};
  for (const svc of inventory) statusCounts[svc.status] = (statusCounts[svc.status] ?? 0) + 1;

  const readiness = {
    generatedAt: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.8.0',
    overallScore: Math.round((passed.length / results.length) * 100),
    totalServices: inventory.length,
    ...statusCounts,
    probeResults: results,
    productionGatePassed: failed.filter((r) =>
      !['not_configured', 'offline'].includes(r.status)
    ).length === 0,
    productionGateBlockers: failed
      .filter((r) => !['not_configured', 'offline'].includes(r.status))
      .map((r) => `${r.id}: ${r.error?.message ?? r.status}`),
  };

  const reportFile = saveReadinessReport(readiness);

  console.log(`\nProbe evidence: ${probeFile}`);
  console.log(`Readiness report: ${reportFile}`);

  const hardFailures = failed.filter((r) => !['not_configured', 'offline'].includes(r.status));
  if (hardFailures.length > 0) {
    console.log(`\n✗ ${hardFailures.length} hard failure(s) — backend gate BLOCKED\n`);
    process.exit(1);
  } else {
    console.log('\n✓ Backend gate PASSED (not_configured/offline are acceptable states)\n');
  }
}

main().catch((err) => {
  console.error('verify-backend crashed:', err);
  process.exit(1);
});
