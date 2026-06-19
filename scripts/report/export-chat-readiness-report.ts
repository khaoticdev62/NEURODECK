#!/usr/bin/env tsx
/**
 * export-chat-readiness-report — aggregates all chat verification results
 * into reports/chat/chat-readiness-report.json and docs/chat/CHAT_READINESS_REPORT.md.
 *
 * Run after all verify:* scripts have produced their output files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PREDEFINED_AGENTS } from '../../src/shared/registries/agentRegistry';

const ROOT = path.resolve(__dirname, '..');
const CHAT_REPORTS_DIR = path.join(ROOT, 'reports/chat');

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function statusEmoji(passed: boolean | null): string {
  if (passed === null) return '⬜ Not run';
  return passed ? '✅ Pass' : '❌ Fail';
}

async function main() {
  console.log('\n=== export-chat-readiness-report ===\n');

  const inventory = readJsonSafe(path.join(CHAT_REPORTS_DIR, 'chat-system-inventory.json'));
  const agentMatrix = readJsonSafe(path.join(CHAT_REPORTS_DIR, 'agent-selection-matrix.json'));
  const mockFindings = readJsonSafe(path.join(CHAT_REPORTS_DIR, 'mock-data-findings.json'));
  const securityScan = readJsonSafe(path.join(CHAT_REPORTS_DIR, 'security-scan.json'));

  const inventoryPassed = inventory ? (inventory.productionGatePassed as boolean) : null;
  const agentPassed = agentMatrix
    ? ((agentMatrix.checks as Array<{ ok: boolean; status: string }> | undefined)
        ?.filter((c) => !c.ok && c.status !== 'not_configured').length ?? 0) === 0
    : null;
  const mockPassed = mockFindings ? (mockFindings.productionGatePassed as boolean) : null;
  const securityPassed = securityScan ? (securityScan.productionGatePassed as boolean) : null;

  const allPassed = [inventoryPassed, agentPassed, mockPassed, securityPassed];
  const gatePass = allPassed.every((p) => p !== false);
  const score = Math.round(allPassed.filter((p) => p === true).length / allPassed.length * 100);

  const report = {
    generatedAt: new Date().toISOString(),
    chatReadinessScore: score,
    productionGatePassed: gatePass,
    areas: {
      chatPipeline: { passed: inventoryPassed, source: 'reports/chat/chat-system-inventory.json' },
      agentSelection: { passed: agentPassed, source: 'reports/chat/agent-selection-matrix.json' },
      noMockData: { passed: mockPassed, source: 'reports/chat/mock-data-findings.json', violations: mockFindings?.violationCount ?? null },
      security: { passed: securityPassed, source: 'reports/chat/security-scan.json', criticalFindings: securityScan?.critical ?? null },
    },
    predefinedAgents: PREDEFINED_AGENTS.length,
    sidecarRunning: inventory?.sidecarRunning ?? false,
  };

  fs.mkdirSync(CHAT_REPORTS_DIR, { recursive: true });
  const jsonOut = path.join(CHAT_REPORTS_DIR, 'chat-readiness-report.json');
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));

  // Markdown report
  const mdLines = [
    '# NEURODECK Chat Readiness Report',
    '',
    `**Generated:** ${new Date().toISOString()}  `,
    `**Score:** ${score}%  `,
    `**Gate:** ${gatePass ? '✅ PASSED' : '❌ BLOCKED'}`,
    '',
    '## Summary',
    '',
    '| Area | Status | Notes |',
    '|---|---|---|',
    `| Chat Pipeline | ${statusEmoji(inventoryPassed)} | verify-ai-chat.ts |`,
    `| Agent Selection | ${statusEmoji(agentPassed)} | verify-agent-selection.ts |`,
    `| No Mock Data | ${statusEmoji(mockPassed)} | ${mockFindings?.violationCount ?? 'not run'} violations |`,
    `| Security | ${statusEmoji(securityPassed)} | ${securityScan?.critical ?? 'not run'} critical findings |`,
    '',
    '## Predefined Agents',
    '',
    '| ID | Name | Provider | Model |',
    '|---|---|---|---|',
    ...PREDEFINED_AGENTS.map((a) => `| ${a.id} | ${a.name} | ${a.provider} | ${a.model} |`),
    '',
    '## How to Re-run',
    '',
    '```bash',
    'npm run verify:ai-chat',
    'npm run verify:agent-selection',
    'npm run verify:no-mock-chat',
    'npm run verify:chat-security',
    'npm run report:chat',
    '```',
    '',
    '> Source of truth: `src-tauri/src/providers.rs` default_agents() + `src-tauri/src/commands/mod.rs` send_command arm.',
  ];

  const docsDir = path.join(ROOT, 'docs/chat');
  fs.mkdirSync(docsDir, { recursive: true });
  const mdOut = path.join(docsDir, 'CHAT_READINESS_REPORT.md');
  fs.writeFileSync(mdOut, mdLines.join('\n'));

  console.log(`JSON report: ${jsonOut}`);
  console.log(`MD report:   ${mdOut}`);
  console.log(`\nChat readiness: ${score}% — gate ${gatePass ? 'PASSED ✓' : 'BLOCKED ✗'}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
