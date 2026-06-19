/**
 * verify-browser-tabs.ts
 * Verifies TabManager operations: creation, switching, duplication, closure.
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const TAB_MGR_PATH = path.resolve(__dirname, '../../electron/dist/main/services/browser/browserTabManager.js');

function main() {
  info('--- BrowserTabManager File Existence ---');
  if (!fs.existsSync(TAB_MGR_PATH)) {
    fail(`browserTabManager.js not found at ${TAB_MGR_PATH}`);
    process.exit(1);
  }
  pass('browserTabManager.js found');

  info('--- Loading BrowserTabManager ---');
  let manager: any;
  try {
    const mod = require(TAB_MGR_PATH);
    manager = mod.browserTabManager;
    if (!manager) throw new Error('browserTabManager singleton not exported');
    pass('BrowserTabManager loaded successfully');
  } catch (e) {
    fail(`Cannot load BrowserTabManager: ${e}`);
    process.exit(1);
  }

  info('--- Testing Tab Creation ---');
  const initialTabsCount = manager.listTabs().length;
  const tab1 = manager.createTab('https://google.com', 'default');
  
  if (tab1 && tab1.id && tab1.url === 'https://google.com' && tab1.profileId === 'default') {
    pass('createTab returns a valid tab with correct URL and profile');
  } else {
    fail(`createTab returned invalid tab: ${JSON.stringify(tab1)}`);
  }

  const tabsAfterCreate = manager.listTabs();
  if (tabsAfterCreate.length === initialTabsCount + 1) {
    pass('listTabs count increased after tab creation');
  } else {
    fail(`Expected listTabs length to be ${initialTabsCount + 1}, got ${tabsAfterCreate.length}`);
  }

  info('--- Testing Active Tab State ---');
  const activeId = manager.getActiveTabId();
  if (activeId === tab1.id) {
    pass('getActiveTabId returns the newly created tab ID');
  } else {
    fail(`Expected active tab ID to be ${tab1.id}, got ${activeId}`);
  }

  info('--- Testing Tab Switching ---');
  const tab2 = manager.createTab('https://github.com', 'default');
  manager.switchTab(tab2.id);
  const activeId2 = manager.getActiveTabId();
  if (activeId2 === tab2.id) {
    pass('switchTab updates the active tab ID');
  } else {
    fail(`Expected active tab ID after switch to be ${tab2.id}, got ${activeId2}`);
  }

  info('--- Testing Tab Duplication ---');
  const dup = manager.duplicateTab(tab2.id);
  if (dup && dup.url === tab2.url && dup.title.includes(tab2.title)) {
    pass('duplicateTab clones the URL and title correctly');
  } else {
    fail(`Expected duplicate tab to match original, got: ${JSON.stringify(dup)}`);
  }

  info('--- Testing Tab Closure ---');
  const preCloseCount = manager.listTabs().length;
  manager.closeTab(tab2.id);
  const postCloseCount = manager.listTabs().length;
  if (postCloseCount === preCloseCount - 1) {
    pass('closeTab decreases the total tab count');
  } else {
    fail(`Expected tab count after close to be ${preCloseCount - 1}, got ${postCloseCount}`);
  }

  console.log(`\n=== verify-browser-tabs: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
