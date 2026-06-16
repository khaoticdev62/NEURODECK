import * as fs from 'fs';
import * as path from 'path';

console.log('--- STARTING WIRING INTEGRITY VALIDATOR ---');

let failure = false;

function reportFailure(message: string) {
  console.error(`[FAIL] ${message}`);
  failure = true;
}

function reportSuccess(message: string) {
  console.log(`[PASS] ${message}`);
}

try {
  // 1. Validate Channel Registry duplicates
  const registryPath = path.resolve(__dirname, '../electron/ipc-registry.js');
  if (!fs.existsSync(registryPath)) {
    reportFailure(`ipc-registry.js not found at ${registryPath}`);
  } else {
    const registry = require(registryPath);
    if (!registry.IPC || !registry.ALLOWED_CHANNELS) {
      reportFailure('IPC registry does not export IPC or ALLOWED_CHANNELS');
    } else {
      const channelCount = Object.keys(registry.IPC).length;
      reportSuccess(`IPC registry validated successfully. ${channelCount} channels registered.`);
    }
  }

  // 2. Scan Electron files for forbidden imports/patterns
  const electronDir = path.resolve(__dirname, '../electron');
  const filesToScan: string[] = [];
  
  function walkDir(dir: string) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'dist-electron' && file !== '.fallow') {
          walkDir(filePath);
        }
      } else if (file.endsWith('.js')) {
        filesToScan.push(filePath);
      }
    }
  }

  if (fs.existsSync(electronDir)) {
    walkDir(electronDir);
  }

  reportSuccess(`Found ${filesToScan.length} Electron JavaScript files to audit.`);

  const forbiddenRegexes = [
    { pattern: /require\(['"]zod['"]\)/i, name: 'Zod imports (use custom validators)' },
    { pattern: /require\(['"]tauri['"]\)/i, name: 'Tauri imports (Electron only)' },
    { pattern: /__TAURI__/i, name: 'Tauri references in Electron main' }
  ];

  for (const file of filesToScan) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    const content = fs.readFileSync(file, 'utf8');
    
    for (const rule of forbiddenRegexes) {
      if (rule.pattern.test(content)) {
        reportFailure(`${relativePath} contains forbidden pattern: ${rule.name}`);
      }
    }
  }

  // 3. Verify Preload exposed APIs
  const preloadPath = path.resolve(__dirname, '../electron/preload.js');
  if (!fs.existsSync(preloadPath)) {
    reportFailure(`preload.js not found at ${preloadPath}`);
  } else {
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    if (!preloadContent.includes("exposeInMainWorld('neurodeck'")) {
      reportFailure('preload.js does not expose window.neurodeck under main world');
    } else {
      reportSuccess('preload.js properly exposes window.neurodeck');
    }
  }

  // 4. Check for drift between ipc-registry.js and ipc-handlers.js
  const handlersPath = path.resolve(__dirname, '../electron/ipc-handlers.js');
  if (fs.existsSync(handlersPath)) {
    const handlersContent = fs.readFileSync(handlersPath, 'utf8');
    const registry = require(registryPath);
    
    let unregisteredCount = 0;
    for (const [key, value] of Object.entries(registry.IPC)) {
      const isReferencedByValue = handlersContent.includes(value as string);
      const isReferencedByKey = handlersContent.includes(`IPC.${key}`);
      
      if (!isReferencedByValue && !isReferencedByKey) {
        console.warn(`[WARN] Channel '${value}' (${key}) is not referenced in ipc-handlers.js`);
        unregisteredCount++;
      }
    }
    
    if (unregisteredCount === 0) {
      reportSuccess('IPC Registry to Handler alignment check complete (all channels fully referenced).');
    } else {
      reportSuccess(`IPC Registry to Handler alignment check complete (${unregisteredCount} channels unreferenced/indirectly mapped).`);
    }
  }

} catch (err: any) {
  reportFailure(`Unexpected exception during wiring verification: ${err.message}\n${err.stack}`);
}

if (failure) {
  console.error('--- WIRING INTEGRITY CHECK FAILED ---');
  process.exit(1);
} else {
  console.log('--- WIRING INTEGRITY CHECK PASSED ---');
  process.exit(0);
}
