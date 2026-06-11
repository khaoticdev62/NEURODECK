/**
 * Dev launcher — starts Vite dev server and Electron concurrently.
 *
 * Waits for Vite to be ready on port 1420 before launching Electron so
 * main.js always loads from the live dev server (HMR enabled). Also clears
 * ELECTRON_RUN_AS_NODE which some IDEs (Cursor, Antigravity) inject and
 * which causes Electron to run as plain Node, breaking the main process.
 */
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT = path.resolve(__dirname, '..', '..');
const VITE_PORT = 1420;
const VITE_HMR_PORT = 24678;
const POLL_INTERVAL_MS = 150;
const VITE_TIMEOUT_MS = 30_000;

// ── Start Vite dev server ────────────────────────────────────────────────────
const vite = spawn(
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

// ── Poll until Vite is ready on port 1420 ───────────────────────────────────
function waitForVite() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + VITE_TIMEOUT_MS;
    const check = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`Vite did not start within ${VITE_TIMEOUT_MS / 1000}s`));
      }
      const socket = new net.Socket();
      socket.setTimeout(POLL_INTERVAL_MS);
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => { socket.destroy(); setTimeout(check, POLL_INTERVAL_MS); });
      socket.once('timeout', () => { socket.destroy(); setTimeout(check, POLL_INTERVAL_MS); });
      socket.connect(VITE_PORT, '127.0.0.1');
    };
    check();
  });
}

// ── Launch Electron once Vite is ready ──────────────────────────────────────
waitForVite()
  .then(() => {
    console.log(`[dev-launcher] Vite ready on :${VITE_PORT}, launching Electron...`);

    const env = {
      ...process.env,
      ELECTRON_DEV: '1',
      VITE_PORT: String(VITE_PORT),
      VITE_HMR_PORT: String(VITE_HMR_PORT),
    };
    delete env.ELECTRON_RUN_AS_NODE;

    const electronPath = require('electron');
    const electron = spawn(electronPath, ['.', '--remote-debugging-port=9222'], {
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
  })
  .catch((err) => {
    console.error('[dev-launcher]', err.message);
    vite.kill();
    process.exit(1);
  });

// Clean up Vite if this process is killed
process.on('SIGINT', () => { vite.kill(); process.exit(0); });
process.on('SIGTERM', () => { vite.kill(); process.exit(0); });
