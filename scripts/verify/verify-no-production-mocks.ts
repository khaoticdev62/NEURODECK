#!/usr/bin/env tsx
/**
 * verify-no-production-mocks — scans production source for mock/stub/fake data patterns.
 * Fails with exit code 1 on production violations.
 */

import * as path from 'path';
import { runMockScanner } from './lib/mock-scanner';

const ROOT = path.resolve(__dirname, '../..');

const VIOLATION_PATTERNS = [
  {
    pattern: /Promise\.resolve\(\s*\{\s*success:\s*false,\s*note:\s*['"]Not yet implemented/,
    description: 'Stub returning "Not yet implemented"',
  },
  {
    pattern: /return\s+\{\s*success:\s*false,\s*note:\s*['"]Not yet implemented/,
    description: 'Stub return block "Not yet implemented"',
  },
  {
    pattern: /\/\/\s*TODO:.*implement/i,
    description: 'TODO: implement comment in production handler',
  },
  {
    pattern: /latencyMs:\s*12\b/,
    description: 'Hardcoded latencyMs:12 (synthetic, only allowed in offline-draft fallback)',
    exceptions: [/bridgeAdapter\.ts/],
  },
  {
    pattern: /demoData|sampleData|testData\b/i,
    description: 'Demo/sample/test data variable name in production path',
  },
  {
    pattern: /import.*from.*['"](\.\.?\/)*.*mock/i,
    description: 'Production file imports from mock path',
  },
  {
    pattern: /_mockCollabActive/,
    description: '_mockCollabActive without APPROVED_MOCK_FALLBACK comment',
  },
];

const WARNING_PATTERNS = [
  { pattern: /Promise\.resolve\(\s*\{\s*ok:\s*true\s*\}/, description: 'Stub Promise.resolve({ok:true})' },
  { pattern: /Promise\.resolve\(\s*\{\s*valid:\s*true\s*\}/, description: 'Stub Promise.resolve({valid:true})' },
  { pattern: /latencyMs:\s*0\b/, description: 'Hardcoded latencyMs:0 in response' },
  { pattern: /\/\/\s*(TEMP|FIXME|HACK)\b/i, description: 'TEMP/FIXME/HACK comment' },
];

const ALLOWED_EXCEPTIONS = [
  { file: /preload\.js/, pattern: 'models.cancel', reason: 'No-op by design — no sidecar cancel endpoint exists' },
  { file: /preload\.js/, pattern: 'settings.validate', reason: 'Pass-through validation — real validation occurs on settings.set' },
  { file: /bridgeAdapter\.ts/, pattern: 'browserDraft', reason: 'Intentional offline-draft fallback, clearly labeled' },
  { file: /bridgeAdapter\.ts/, pattern: 'fallbackHealth', reason: 'Fallback health array for bridge-unavailable state' },
  { file: /bridgeAdapter\.ts/, pattern: 'fallbackDiagnostics', reason: 'Fallback diagnostics for bridge-unavailable state' },
  { file: /bridgeAdapter\.ts/, pattern: 'latencyMs: 0', reason: 'Zero latency in fallback path — not real metric, acceptable' },
  { file: /useNeuroDeckState\.ts/, pattern: 'latencyMs: 42', reason: 'Initial placeholder overwritten by real hydration data' },
  { file: /seed\.ts/, pattern: '*', reason: 'Seed file used for initial state only — overwritten by real hydration' },
  { file: /canvas\.js/, pattern: 'APPROVED_MOCK_FALLBACK', reason: 'Collab active status mock fallback check with approval' },
  { file: /main\.js/, pattern: 'APPROVED_MOCK_FALLBACK', reason: 'Collab active status mock fallback check with approval' },
];

const { violations } = runMockScanner({
  root: ROOT,
  consoleTitle: 'verify-no-production-mocks',
  reportPath: path.join(ROOT, 'reports', 'cleanup', 'mock-data-findings.json'),
  scanDirs: ['electron', 'frontend/src'],
  skipDirs: [
    'node_modules', 'dist', 'target', '.git', 'reports',
    'tests', '__tests__', '.storybook', 'storybook-static',
  ],
  skipExts: ['.json', '.lock', '.png', '.ico', '.svg', '.woff2', '.ttf'],
  fileExts: /\.(ts|tsx|js|mjs|cjs)$/,
  violationPatterns: VIOLATION_PATTERNS,
  warningPatterns: WARNING_PATTERNS,
  allowedPatterns: ALLOWED_EXCEPTIONS,
  skipTestPaths: false,
});

process.exit(violations.length > 0 ? 1 : 0);
