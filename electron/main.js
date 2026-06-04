const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, protocol } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Register neurodeck:// as a privileged scheme before app ready.
// This gives us a stable origin for localStorage/sessionStorage
// (unlike file:// which varies by path).
protocol.registerSchemesAsPrivileged([
  { scheme: 'neurodeck', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const SIDECAR_NAME = process.platform === 'win32' ? 'neurodeck.exe' : 'neurodeck';
const DEFAULT_PORT = 9477;

let mainWindow = null;
let splashWindow = null;
let tray = null;
let sidecar = null;
let sidecarRestartTimer = null;
let isQuitting = false;
let bridgePort = DEFAULT_PORT;

// ─────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────

function getSidecarPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, SIDECAR_NAME);
  }
  // Dev: look for cargo-built binary
  // Workspace builds go to root target/; single-crate builds go to src-tauri/target/
  const candidates = [
    path.join(__dirname, '..', 'target', 'release', process.platform === 'win32' ? 'app.exe' : 'app'),
    path.join(__dirname, '..', 'src-tauri', 'target', 'release', process.platform === 'win32' ? 'app.exe' : 'app'),
    path.join(__dirname, '..', 'target', 'debug', process.platform === 'win32' ? 'app.exe' : 'app'),
    path.join(__dirname, '..', 'src-tauri', 'target', 'debug', process.platform === 'win32' ? 'app.exe' : 'app'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]; // fallback
}

function getResourcesDir() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.join(__dirname, '..');
}

function findFreePort(start = DEFAULT_PORT, max = start + 100) {
  return new Promise((resolve) => {
    function tryPort(port) {
      if (port > max) {
        resolve(DEFAULT_PORT);
        return;
      }
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    }
    tryPort(start);
  });
}

// ─────────────────────────────────────────────────────────
// Sidecar Lifecycle
// ─────────────────────────────────────────────────────────

function spawnSidecar(port) {
  if (sidecar) {
    try { sidecar.kill(); } catch {}
    sidecar = null;
  }

  const bin = getSidecarPath();
  if (!fs.existsSync(bin)) {
    dialog.showErrorBox('Sidecar Not Found', `Could not find Rust sidecar at:\n${bin}\n\nBuild it first with: cd src-tauri && cargo build --release`);
    app.quit();
    return;
  }

  const env = {
    ...process.env,
    NEURODECK_PORT: String(port),
  };

  // Set working directory to resources dir so llm-term.toml and plugins/ resolve
  const cwd = getResourcesDir();

  console.log(`[sidecar] Spawning ${bin} --bridge on port ${port} (cwd: ${cwd})`);
  sidecar = spawn(bin, ['--bridge'], { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });

  sidecar.stdout.on('data', (data) => {
    const line = data.toString().trimEnd();
    if (line.includes('NEURODECK_READY')) {
      console.log('[sidecar] Ready');
    } else {
      console.log('[sidecar stdout]', line);
    }
  });

  sidecar.stderr.on('data', (data) => {
    console.error('[sidecar stderr]', data.toString().trimEnd());
  });

  sidecar.on('exit', (code, signal) => {
    console.log(`[sidecar] Exited code=${code} signal=${signal}`);
    sidecar = null;
    if (!isQuitting) {
      const delay = 2000;
      console.log(`[sidecar] Auto-restarting in ${delay}ms...`);
      sidecarRestartTimer = setTimeout(() => spawnSidecar(port), delay);
    }
  });

  sidecar.on('error', (err) => {
    console.error('[sidecar] Spawn error:', err);
  });
}

function killSidecar() {
  if (sidecarRestartTimer) {
    clearTimeout(sidecarRestartTimer);
    sidecarRestartTimer = null;
  }
  if (!sidecar) return;
  console.log('[sidecar] Killing...');
  try {
    sidecar.kill('SIGTERM');
    // Force kill after 3s if still alive
    setTimeout(() => {
      if (sidecar && !sidecar.killed) {
        sidecar.kill('SIGKILL');
      }
    }, 3000);
  } catch (e) {
    console.error('[sidecar] Kill error:', e);
  }
}

async function waitForHealth(port, retries = 60, interval = 500) {
  const url = `http://127.0.0.1:${port}/health`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log('[health] Sidecar ready:', data.status || 'ok');
        return true;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Sidecar health check failed after ${retries} retries`);
}

// ─────────────────────────────────────────────────────────
// Window Management
// ─────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 640,
    height: 480,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      offscreen: true,
    },
  });
  // Render nothing — the frontend has its own boot overlay.
  // We just use this window to block input until ready.
  splashWindow.show();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    backgroundColor: '#06090c',
    title: 'NEURODECK',
    icon: path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Dev: load Vite dev server
  // Prod: load built frontend via neurodeck://app custom protocol
  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL('http://localhost:1420');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('neurodeck://app/index.html');
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs — open in system browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─────────────────────────────────────────────────────────
// Tray
// ─────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('NEURODECK');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => { if (mainWindow) mainWindow.show(); } },
    { label: 'Hide', click: () => { if (mainWindow) mainWindow.hide(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]));
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// ─────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Register neurodeck:// file protocol so the frontend has a stable origin
  protocol.registerFileProtocol('neurodeck', (request, callback) => {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    const filePath = path.join(__dirname, '..', 'frontend', 'dist', pathname);
    callback({ path: filePath });
  });

  const port = await findFreePort();
  bridgePort = port;
  console.log(`[electron] Using bridge port ${port}`);

  // Store port so preload/neurobridge can read it
  process.env.NEURODECK_PORT = String(port);

  createSplashWindow();
  spawnSidecar(port);

  try {
    await waitForHealth(port);
  } catch (err) {
    dialog.showErrorBox('Sidecar Failed', `The NEURODECK backend did not start:\n${err.message}`);
    if (splashWindow) splashWindow.close();
    app.quit();
    return;
  }

  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// ─────────────────────────────────────────────────────────
// IPC Handlers (for preload API)
// ─────────────────────────────────────────────────────────

ipcMain.handle('get-bridge-port', () => bridgePort);

ipcMain.handle('open-external', (_event, url) => {
  return shell.openExternal(url);
});

ipcMain.handle('show-save-dialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('safe-storage-available', () => {
  return require('electron').safeStorage.isEncryptionAvailable();
});

ipcMain.handle('safe-storage-encrypt', (_event, plain) => {
  return require('electron').safeStorage.encryptString(plain).toString('base64');
});

ipcMain.handle('safe-storage-decrypt', (_event, encrypted) => {
  const buf = Buffer.from(encrypted, 'base64');
  return require('electron').safeStorage.decryptString(buf);
});

ipcMain.handle('set-kiosk', (_event, enabled) => {
  if (mainWindow) {
    mainWindow.setKiosk(enabled);
    mainWindow.setFullScreen(enabled);
  }
  return enabled;
});

ipcMain.handle('get-is-kiosk', () => {
  return mainWindow ? mainWindow.isKiosk() : false;
});

ipcMain.handle('request-notification-permission', () => {
  return Notification.permission;
});

app.on('before-quit', () => {
  isQuitting = true;
  killSidecar();
});

app.on('window-all-closed', () => {
  // On macOS keep app running until quit; on Win/Linux quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
