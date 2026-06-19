/**
 * verify-browser-downloads.ts
 * Verifies filename sanitization and safe download warning evaluation.
 */
import * as path from 'path';
import * as fs from 'fs';

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

const DOWNLOAD_SERVICE_PATH = path.resolve(__dirname, '../../electron/dist/main/services/browser/browserDownloadService.js');

function main() {
  info('--- BrowserDownloadService File Existence ---');
  if (!fs.existsSync(DOWNLOAD_SERVICE_PATH)) {
    fail(`browserDownloadService.js not found at ${DOWNLOAD_SERVICE_PATH}`);
    process.exit(1);
  }
  pass('browserDownloadService.js found');

  info('--- Loading BrowserDownloadService ---');
  let service: any;
  try {
    const mod = require(DOWNLOAD_SERVICE_PATH);
    service = mod.browserDownloadService;
    if (!service) throw new Error('browserDownloadService singleton not exported');
    pass('BrowserDownloadService loaded successfully');
  } catch (e) {
    fail(`Cannot load BrowserDownloadService: ${e}`);
    process.exit(1);
  }

  info('--- Testing Filename Path-Traversal Protection ---');
  const dirtyNames = [
    { input: '../../etc/passwd', expected: 'passwd' },
    { input: 'some\\dir\\file.txt', expected: 'file.txt' },
    { input: 'normal-file.pdf', expected: 'normal-file.pdf' },
    { input: 'file\0name.exe', expected: 'file_name.exe' },
  ];

  for (const item of dirtyNames) {
    const sanitized = service.sanitizeFilename(item.input);
    if (sanitized === item.expected) {
      pass(`Sanitization matches expected: "${item.input}" → "${sanitized}"`);
    } else {
      fail(`Sanitization mismatch: "${item.input}" → expected "${item.expected}", got "${sanitized}"`);
    }
  }

  info('--- Testing High-Risk Extension Evaluation ---');
  const highRisk = ['program.exe', 'script.sh', 'installer.msi', 'setup.bat', 'macro.cmd', 'payload.js'];
  const lowRisk = ['document.pdf', 'image.png', 'archive.zip', 'text.txt', 'music.mp3'];

  for (const file of highRisk) {
    if (service.isHighRiskExtension(file)) {
      pass(`High-risk extension correctly identified: "${file}"`);
    } else {
      fail(`Failed to flag high-risk extension: "${file}"`);
    }
  }

  for (const file of lowRisk) {
    if (!service.isHighRiskExtension(file)) {
      pass(`Low-risk extension correctly cleared: "${file}"`);
    } else {
      fail(`Falsely flagged low-risk extension: "${file}"`);
    }
  }

  console.log(`\n=== verify-browser-downloads: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
