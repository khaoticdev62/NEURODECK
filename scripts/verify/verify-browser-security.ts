/**
 * verify-browser-security.ts
 * Verifies URL safety audits and web preference boundaries for Chromium guest views.
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const SECURITY_SERVICE_PATH = path.resolve(__dirname, '../electron/dist/main/services/browser/browserSecurityService.js');

function main() {
  info('--- BrowserSecurityService File Existence ---');
  if (!fs.existsSync(SECURITY_SERVICE_PATH)) {
    fail(`browserSecurityService.js not found at ${SECURITY_SERVICE_PATH}`);
    process.exit(1);
  }
  pass('browserSecurityService.js found');

  info('--- Loading BrowserSecurityService ---');
  let service: any;
  try {
    const mod = require(SECURITY_SERVICE_PATH);
    service = mod.browserSecurityService;
    if (!service) throw new Error('browserSecurityService singleton not exported');
    pass('BrowserSecurityService loaded successfully');
  } catch (e) {
    fail(`Cannot load BrowserSecurityService: ${e}`);
    process.exit(1);
  }

  info('--- Testing URL Validation Policy ---');
  const allowedUrls = [
    'https://google.com',
    'http://example.com/index.html',
    'https://github.com/trending?since=daily',
  ];

  const blockedUrls = [
    'file:///etc/passwd',
    'chrome://settings',
    'javascript:alert(1)',
    'neurodeck://privileged-api',
  ];

  for (const url of allowedUrls) {
    const res = service.validateUrl(url);
    if (res.allowed) {
      pass(`URL allowed as expected: "${url}"`);
    } else {
      fail(`URL should be allowed, but was blocked: "${url}" (Reason: ${res.error})`);
    }
  }

  for (const url of blockedUrls) {
    const res = service.validateUrl(url);
    if (!res.allowed) {
      pass(`URL blocked as expected: "${url}" (Reason: ${res.error})`);
    } else {
      fail(`URL should be blocked, but was allowed: "${url}"`);
    }
  }

  info('--- Auditing WebPreferences Security Guidelines ---');
  const safePrefs = {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
  };

  const auditSafe = service.auditGuestWebPreferences(safePrefs);
  if (auditSafe.safe) {
    pass('Safe webPreferences audit succeeds with zero issues');
  } else {
    fail(`Safe webPreferences audit failed: ${JSON.stringify(auditSafe.issues)}`);
  }

  const unsafePrefs = {
    nodeIntegration: true,
    contextIsolation: false,
    sandbox: false,
    webSecurity: false,
  };

  const auditUnsafe = service.auditGuestWebPreferences(unsafePrefs);
  if (!auditUnsafe.safe && auditUnsafe.issues.length === 4) {
    pass('Unsafe webPreferences audit flags all four violations (Node, Context Isolation, Sandbox, Web Security)');
  } else {
    fail(`Unsafe webPreferences audit expected 4 issues, got ${auditUnsafe.issues.length}: ${JSON.stringify(auditUnsafe.issues)}`);
  }

  console.log(`\n=== verify-browser-security: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
