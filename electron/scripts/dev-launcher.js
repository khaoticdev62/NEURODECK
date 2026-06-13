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
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const VITE_PORT = 1420;
const VITE_HMR_PORT = 24678;
const POLL_INTERVAL_MS = 300;
const VITE_TIMEOUT_MS = 90_000;

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
    .then(launchElectron)
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

// ── Launch Electron once Vite is ready ──────────────────────────────────────
function launchElectron() {
  console.log(`[dev-launcher] Vite ready on :${VITE_PORT}, launching Electron...`);

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

  electron.on('close', (code) => {
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
