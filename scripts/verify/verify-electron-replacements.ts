#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const MATRIX_PATH = path.join(ROOT, 'docs', 'cleanup', 'ELECTRON_REPLACEMENT_MATRIX.md');
const CHANNELS_PATH = path.join(ROOT, 'electron', 'ipc-channels.js');
const PRELOAD_PATH = path.join(ROOT, 'electron', 'preload.js');

console.log('\n=== verify-electron-replacements ===\n');

if (!fs.existsSync(MATRIX_PATH)) {
  console.error(`✗ Matrix file not found: ${MATRIX_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(CHANNELS_PATH)) {
  console.error(`✗ Channels file not found: ${CHANNELS_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(PRELOAD_PATH)) {
  console.error(`✗ Preload file not found: ${PRELOAD_PATH}`);
  process.exit(1);
}

const matrixContent = fs.readFileSync(MATRIX_PATH, 'utf8');
const channelsContent = fs.readFileSync(CHANNELS_PATH, 'utf8');
const preloadContent = fs.readFileSync(PRELOAD_PATH, 'utf8');

// Parse markdown table rows
const lines = matrixContent.split('\n');
let inTable = false;
const channels: string[] = [];
const wrappers: string[] = [];

for (const line of lines) {
  if (line.includes('|') && line.includes('---')) {
    inTable = true;
    continue;
  }
  if (inTable && line.trim() === '') {
    inTable = false;
    continue;
  }
  if (inTable && line.includes('|')) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 4) {
      const channelPart = parts[2];
      const wrapperPart = parts[3];
      
      // Extract channels (could be comma separated)
      if (channelPart && channelPart !== 'Electron Main Process IPC Channel') {
        const list = channelPart.split(',').map(c => c.trim().replace(/`/g, ''));
        channels.push(...list);
      }
      
      // Extract wrappers (could be comma separated)
      if (wrapperPart && wrapperPart !== 'Electron Preload API Wrapper') {
        const list = wrapperPart.split(',').map(w => w.trim().replace(/`/g, '').replace('window.', ''));
        wrappers.push(...list);
      }
    }
  }
}

let violations = 0;

// Verify IPC Channels in ipc-channels.js or handled in main process files
const mainContent = fs.readFileSync(path.join(ROOT, 'electron', 'main.js'), 'utf8') +
                     fs.readFileSync(path.join(ROOT, 'electron', 'ipc-handlers.js'), 'utf8') +
                     fs.readFileSync(path.join(ROOT, 'electron', 'ipc-registry.js'), 'utf8');

console.log('Verifying IPC Channels...');
for (const chan of channels) {
  if (chan.includes('*') || chan === 'etc.') continue;
  
  const isRegistered = channelsContent.includes(chan) || mainContent.includes(chan);
  if (!isRegistered) {
    console.error(`✗ IPC Channel "${chan}" is not registered in ipc-channels.js or handled in main process files.`);
    violations++;
  } else {
    console.log(`✓ Channel "${chan}" verified.`);
  }
}

// Verify Preload API Wrappers in preload.js
console.log('\nVerifying Preload API Wrappers...');
for (const wrap of wrappers) {
  if (wrap.includes('*') || wrap === 'etc.') continue;
  
  const parts = wrap.split('.');
  const method = parts[parts.length - 1];
  
  const isExposed = preloadContent.includes(method);
  if (!isExposed) {
    console.error(`✗ Preload API method "${method}" (from ${wrap}) is not exposed in preload.js.`);
    violations++;
  } else {
    console.log(`✓ Preload wrapper "${wrap}" verified.`);
  }
}

console.log(`\nScan complete. Found ${violations} violation(s).`);
process.exit(violations > 0 ? 1 : 0);
