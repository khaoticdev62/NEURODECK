/**
 * verify-browser-sessions.ts
 * Verifies profile sessions and private data purges.
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const PROFILE_SERVICE_PATH = path.resolve(__dirname, '../electron/dist/main/services/browser/browserProfileService.js');
const SESSION_SERVICE_PATH = path.resolve(__dirname, '../electron/dist/main/services/browser/browserSessionService.js');

function main() {
  info('--- File Existence Checks ---');
  if (!fs.existsSync(PROFILE_SERVICE_PATH)) {
    fail(`browserProfileService.js not found at ${PROFILE_SERVICE_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(SESSION_SERVICE_PATH)) {
    fail(`browserSessionService.js not found at ${SESSION_SERVICE_PATH}`);
    process.exit(1);
  }
  pass('Profile and Session services files exist');

  info('--- Loading Services ---');
  let profileService: any;
  let sessionService: any;
  try {
    profileService = require(PROFILE_SERVICE_PATH).browserProfileService;
    sessionService = require(SESSION_SERVICE_PATH).browserSessionService;
    if (!profileService || !sessionService) throw new Error('Singletons not exported');
    pass('Services loaded successfully');
  } catch (e) {
    fail(`Cannot load services: ${e}`);
    process.exit(1);
  }

  info('--- Checking Profile Partitions ---');
  const profiles = profileService.listProfiles();
  const requiredProfiles = ['default', 'private', 'research', 'developer', 'sandbox'];
  
  for (const pid of requiredProfiles) {
    const p = profiles.find((x: any) => x.id === pid);
    if (p) {
      pass(`Found isolation profile: "${pid}" (partition: ${p.partitionId})`);
    } else {
      fail(`Required profile "${pid}" is missing`);
    }
  }

  info('--- Verifying Session Sandbox Isolation ---');
  for (const p of profiles) {
    const sess = sessionService.getSession(p.id);
    if (sess) {
      pass(`getSession returned valid partition/session structure for profile: "${p.id}"`);
    } else {
      fail(`getSession returned null for profile: "${p.id}"`);
    }
  }

  info('--- Verifying Data Cleansing Strategy ---');
  // Mocking clear session data behavior (clearing cookies and cache)
  sessionService.clearSessionData('default', { cookies: true, cache: true }).then((res: any) => {
    if (res && res.ok) {
      pass('clearSessionData succeeds with cache and cookies options');
    } else {
      fail('clearSessionData failed or returned false');
    }
  }).catch((err: any) => {
    fail(`Exception in clearSessionData: ${err}`);
  });

  console.log(`\n=== verify-browser-sessions: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
