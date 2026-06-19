/**
 * verify-no-mock-browser-data.ts
 * Checks that bookmarks and history services do not contain hardcoded static mock records.
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const BOOKMARK_SERVICE_PATH = path.resolve(__dirname, '../../electron/dist/main/services/browser/browserBookmarkService.js');
const HISTORY_SERVICE_PATH = path.resolve(__dirname, '../../electron/dist/main/services/browser/browserHistoryService.js');

function main() {
  info('--- Audit Bookmarks Service ---');
  if (!fs.existsSync(BOOKMARK_SERVICE_PATH)) {
    fail(`browserBookmarkService.js not found`);
    process.exit(1);
  }
  
  const bookmarkContent = fs.readFileSync(BOOKMARK_SERVICE_PATH, 'utf8');
  // Check if there are static mock urls in code
  const hasMockUrl = bookmarkContent.includes('google.com') || bookmarkContent.includes('reddit.com') || bookmarkContent.includes('github.com');
  if (hasMockUrl) {
    fail('Found hardcoded mock/fallback bookmarks in bookmark service source code.');
  } else {
    pass('No hardcoded mock bookmarks found in bookmark service code.');
  }

  info('--- Audit History Service ---');
  if (!fs.existsSync(HISTORY_SERVICE_PATH)) {
    fail(`browserHistoryService.js not found`);
    process.exit(1);
  }

  const historyContent = fs.readFileSync(HISTORY_SERVICE_PATH, 'utf8');
  const hasMockHistoryUrl = historyContent.includes('example.com') || historyContent.includes('google.com');
  if (hasMockHistoryUrl) {
    fail('Found hardcoded mock/fallback history entries in history service source code.');
  } else {
    pass('No hardcoded mock history entries found in history service code.');
  }

  console.log(`\n=== verify-no-mock-browser-data: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
