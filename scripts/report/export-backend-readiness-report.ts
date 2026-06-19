#!/usr/bin/env tsx
/**
 * export-backend-readiness-report — aggregates all reports into a final readiness snapshot.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BACKEND_SERVICE_INVENTORY } from '../../src/main/services/backend/backendHealthRegistry';

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports', 'backend');
const DOCS_DIR = path.join(ROOT, 'docs', 'backend');

function loadJson(file: string): unknown {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const inventory = BACKEND_SERVICE_INVENTORY;
const statusCounts: Record<string, number> = {};
for (const svc of inventory) statusCounts[svc.status] = (statusCounts[svc.status] ?? 0) + 1;

const mockFindings = loadJson(path.join(REPORTS_DIR, 'mock-data-findings.json')) as any;
const securityScan = loadJson(path.join(REPORTS_DIR, 'security-scan.json')) as any;
const realDataVerification = loadJson(path.join(REPORTS_DIR, 'real-data-verification.json')) as any;
const latestProbe = loadJson(path.join(REPORTS_DIR, 'backend-readiness-report.json')) as any;

const violations: number = mockFindings?.violations?.length ?? 0;
const securityFlags: number = securityScan?.flags?.filter((f: any) => f.severity === 'critical').length ?? 0;
const realDataChecks = realDataVerification?.checks ?? [];
const realDataPassed = realDataChecks.filter((c: any) => c.passed).length;
const probeResults = latestProbe?.probeResults ?? [];
const probesPassed = probeResults.filter((r: any) => r.ok).length;

const overallScore = Math.round(
  ((inventory.length - (statusCounts['mocked'] ?? 0) - (statusCounts['blocked'] ?? 0)) / inventory.length) * 100
);

const gateBlockers: string[] = [];
if (violations > 0) gateBlockers.push(`${violations} mock-data production violation(s)`);
if (securityFlags > 0) gateBlockers.push(`${securityFlags} critical security flag(s)`);
if (realDataChecks.length > 0 && realDataPassed < realDataChecks.length) {
  gateBlockers.push(`${realDataChecks.length - realDataPassed}/${realDataChecks.length} real-data checks failed`);
}

const report = {
  generatedAt: new Date().toISOString(),
  version: process.env.npm_package_version ?? '1.8.0',
  overallScore,
  totalServices: inventory.length,
  statusBreakdown: statusCounts,
  mockViolations: violations,
  securityFlags,
  realDataScore: `${realDataPassed}/${realDataChecks.length}`,
  probeScore: `${probesPassed}/${probeResults.length}`,
  productionGatePassed: gateBlockers.length === 0,
  productionGateBlockers: gateBlockers,
  services: inventory,
};

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORTS_DIR, 'backend-readiness-report.json'), JSON.stringify(report, null, 2), 'utf8');

// Write Markdown summary
const md = `# NEURODECK Backend Readiness Report

Generated: ${report.generatedAt}
Version: ${report.version}
Score: ${report.overallScore}/100

## Service Status

| Status | Count |
|--------|------:|
${Object.entries(statusCounts).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}
| **Total** | **${inventory.length}** |

## Gate Result

**${report.productionGatePassed ? '✅ PASSED' : '❌ BLOCKED'}**

${gateBlockers.length > 0 ? '### Blockers\n' + gateBlockers.map((b) => `- ${b}`).join('\n') : ''}

## Service Inventory

| ID | Category | Status | Mock Risk |
|----|----------|--------|-----------|
${inventory.map((s) => `| ${s.id} | ${s.category} | ${s.status} | ${s.mockRiskLevel} |`).join('\n')}
`;

fs.writeFileSync(path.join(DOCS_DIR, 'BACKEND_READINESS_REPORT.md'), md, 'utf8');

console.log('\n=== Backend Readiness Report ===\n');
console.log(`Score: ${overallScore}/100`);
console.log(`Gate: ${report.productionGatePassed ? '✅ PASSED' : '❌ BLOCKED'}`);
if (gateBlockers.length) gateBlockers.forEach((b) => console.log(`  ✗ ${b}`));
console.log(`\nReports written to reports/backend/ and docs/backend/\n`);
process.exit(gateBlockers.length > 0 ? 1 : 0);
