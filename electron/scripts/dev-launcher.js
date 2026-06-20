/**
 * Dev launcher — builds the main-process TypeScript services, starts Vite,
 * and then launches Electron. Waits for Vite to be ready on port 1420 before
 * launching Electron so main.js always loads from the live dev server (HMR
 * enabled). Also clears ELECTRON_RUN_AS_NODE which some IDEs (Cursor,
 * Antigravity) inject and which causes Electron to run as plain Node, breaking
 * the main process.
 *
 * Uses an HTTP GET poll instead of a raw TCP socket so the check works on
 * both IPv4 (127.0.0.1) and IPv6 (::1) — Windows 11 defaults to ::1 for
 * "localhost" which defeats a hardcoded 127.0.0.1 socket connect.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const VITE_PORT = 1420;
const VITE_HMR_PORT = 24678;
const POLL_INTERVAL_MS = 300;
const VITE_TIMEOUT_MS = 90_000;
const WATCH_DEBOUNCE_MS = 250;

// Electron's main process has no hot-reload — Vite only refreshes the renderer.
// Without this watcher, merging/pulling changes to these files while `npm run dev`
// is already running silently keeps the OLD main process alive: new IPC handlers,
// preload APIs, and main.js logic are invisible until the app is fully quit and
// relaunched, which looks indistinguishable from "the UI update didn't apply".
const REBUILD_WATCH_DIRS = ['src/main', 'src/preload', 'src/shared'].map((p) => path.join(ROOT, p));
const DIRECT_WATCH_FILES = [
  'electron/main.js',
  'electron/preload.js',
  'electron/ipc-handlers.js',
  'electron/ipc-registry.js',
].map((p) => path.join(ROOT, p));

/**
 * Run a one-shot npm script and return a promise that resolves on exit 0.
 */
function runNpmScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npm',
      ['run', script, ...args],
      {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
      }
    );

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run ${script} exited with code ${code}`));
      }
    });
  });
}

// ── Build main-process services first ────────────────────────────────────────
// electron/main.js delegates to the compiled output in electron/dist/, so it
// must be fresh before Electron starts. Without this, new IPC handlers (e.g.
// browser:create-tab) are missing and the in-app browser cannot load sites.
runNpmScript('build:main')
  .then(() => {
    console.log('[dev-launcher] Main process build complete, starting Vite...');
    startVite();
  })
  .catch((err) => {
    console.error('[dev-launcher] Main process build failed:', err.message);
    process.exit(1);
  });

// ── Start Vite dev server ────────────────────────────────────────────────────
// shell:true is required on Windows — .cmd files can't be spawned directly.
let vite;
function startVite() {
  vite = spawn(
    'npm',
    ['-w', 'frontend', 'run', 'dev'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
      shell: true,
    }
  );

  vite.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  vite.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  vite.on('error', (err) => {
    console.error('[dev-launcher] Failed to start Vite:', err.message);
    process.exit(1);
  });

  // Clean up Vite if this process is killed
  process.on('SIGINT', () => { vite.kill(); process.exit(0); });
  process.on('SIGTERM', () => { vite.kill(); process.exit(0); });

  waitForVite()
    .then(() => {
      launchElectron();
      watchMainProcess();
    })
    .catch((err) => {
      console.error('[dev-launcher]', err.message);
      vite.kill();
      process.exit(1);
    });
}

// ── Poll until Vite responds on http://localhost:PORT ───────────────────────
// HTTP GET lets Node resolve "localhost" via the OS (handles ::1 and 127.0.0.1).
function waitForVite() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + VITE_TIMEOUT_MS;
    const check = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`Vite did not start within ${VITE_TIMEOUT_MS / 1000}s`));
      }
      const req = http.get(`http://127.0.0.1:${VITE_PORT}/`, (res) => {
        res.resume();
        resolve();
      });
      req.setTimeout(POLL_INTERVAL_MS, () => req.destroy());
      req.on('error', () => setTimeout(check, POLL_INTERVAL_MS));
    };
    check();
  });
}

// ── Launch / restart Electron ────────────────────────────────────────────────
// electronProcess + restarting track the current child so the main-process
// watcher below can kill and respawn it without tearing down Vite or exiting
// the whole dev-launcher (which is what the plain 'close' handler does when
// the user actually quits the app window).
let electronProcess = null;
let restarting = false;

function launchElectron() {
  console.log(`[dev-launcher] Launching Electron...`);

  const env = {
    ...process.env,
    ELECTRON_DEV: '1',
    VITE_PORT: String(VITE_PORT),
    VITE_HMR_PORT: String(VITE_HMR_PORT),
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const electronPath = require('electron');
  const args = ['.', '--remote-debugging-port=9222'];
  if (process.platform === 'win32') {
    // Work around Windows GPU/network sandbox child-process crashes during
    // long-running dev sessions. Renderer sandbox remains enabled.
    args.push(
      '--disable-gpu-sandbox',
      '--disable-network-service-sandbox',
      '--disable-features=IsolateOrigins,site-per-process,SpareRendererForSitePerProcess',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    );
  }
  const electron = spawn(electronPath, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
  electronProcess = electron;

  electron.on('close', (code) => {
    if (restarting) {
      // This close was triggered by restartElectron() below — respawn, don't exit.
      restarting = false;
      launchElectron();
      return;
    }
    console.log('[dev-launcher] Electron exited, stopping Vite...');
    vite.kill();
    process.exit(code ?? 0);
  });

  electron.on('error', (err) => {
    console.error('[dev-launcher] Electron error:', err.message);
    vite.kill();
    process.exit(1);
  });
}

// Restart just the Electron main process (Vite keeps running, renderer reconnects
// to the same dev server) — used by the main-process file watcher.
function restartElectron(reason) {
  if (!electronProcess || electronProcess.exitCode !== null) return;
  console.log(`[dev-launcher] ${reason} — restarting Electron main process...`);
  restarting = true;
  electronProcess.kill();
}

// ── Watch main-process sources and auto-restart Electron ────────────────────
// electron/main.js, preload.js, ipc-handlers.js, ipc-registry.js run directly
// (no build step). src/main, src/preload, src/shared compile via `build:main`
// (esbuild) into electron/dist and must be rebuilt first.
//
// fs.watch on Windows fires spurious 'change' events from metadata-only
// touches (AV scanning, indexing, editor swap files) with no actual content
// change — observed directly while testing this watcher. Hashing the file
// before deciding to restart filters those out so the watcher only acts on
// genuine edits.
const knownHashes = new Map();

function hashFile(filePath) {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null; // deleted / transient — treat as "no prior content" below
  }
}

function contentActuallyChanged(filePath) {
  const hash = hashFile(filePath);
  const prev = knownHashes.get(filePath);
  if (hash === prev) return false;
  knownHashes.set(filePath, hash);
  return true;
}

function primeHashes(filePaths) {
  for (const f of filePaths) knownHashes.set(f, hashFile(f));
}

function watchMainProcess() {
  primeHashes(DIRECT_WATCH_FILES);

  let pendingRebuild = false;
  let debounceTimer = null;

  const schedule = (needsRebuild) => {
    pendingRebuild = pendingRebuild || needsRebuild;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const doRebuild = pendingRebuild;
      pendingRebuild = false;
      if (doRebuild) {
        runNpmScript('build:main')
          .then(() => restartElectron('Main-process source changed and rebuilt'))
          .catch((err) => console.error('[dev-launcher] build:main failed:', err.message));
      } else {
        restartElectron('Main-process file changed');
      }
    }, WATCH_DEBOUNCE_MS);
  };

  // Directories compiled by build:main: hash the specific file the event names
  // (relative to the watched dir) rather than re-hashing the whole tree.
  //
  // Windows can fire a recursive fs.watch callback with filename === null
  // under load (verified live: this happened mid-investigation with zero
  // actual edits to src/main|preload|shared, restarting Electron and killing
  // an unrelated debugging session). Treating that as "rebuild anyway" was
  // wrong — skip it. A real edit still fires its own named event right after,
  // so the only cost of skipping is not reacting to the rare case where an
  // edit's named event is itself lost, which is far better than a spurious
  // restart on every busy-disk hiccup.
  const watchRebuildDir = (dir) => {
    try {
      fs.watch(dir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        if (contentActuallyChanged(path.join(dir, filename))) schedule(true);
      });
    } catch (err) {
      console.warn(`[dev-launcher] Could not watch ${dir} (${err.message}); main-process auto-restart disabled for this path.`);
    }
  };

  const watchDirectFile = (file) => {
    try {
      fs.watch(file, () => {
        if (contentActuallyChanged(file)) schedule(false);
      });
    } catch (err) {
      console.warn(`[dev-launcher] Could not watch ${file} (${err.message}); main-process auto-restart disabled for this path.`);
    }
  };

  for (const dir of REBUILD_WATCH_DIRS) watchRebuildDir(dir);
  for (const file of DIRECT_WATCH_FILES) watchDirectFile(file);

  console.log('[dev-launcher] Watching main-process sources for changes (auto-restart enabled).');
}
