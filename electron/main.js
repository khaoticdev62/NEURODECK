const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, protocol, safeStorage, session } = require('electron');
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

// Only allow http/https URLs to be opened externally — blocks javascript:, file://, etc.
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:']);

let mainWindow = null;
let splashWindow = null;
let tray = null;
let sidecar = null;
let sidecarRestartTimer = null;
let isQuitting = false;
let bridgePort = DEFAULT_PORT;

// ─────────────────────────────────────────────────────────
// Global Error Handlers (H1)
// ─────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});

// ─────────────────────────────────────────────────────────
// Safe URL Helper (C1, C2, C3)
// Only opens URLs with http or https protocol in the OS browser.
// ─────────────────────────────────────────────────────────

function safeOpenExternal(url) {
  if (typeof url !== 'string') return;
  try {
    const parsed = new URL(url);
    if (ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      shell.openExternal(url);
    }
  } catch {
    // malformed or disallowed URL — ignore
  }
}

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
    dialog.showErrorBox('Sidecar Not Found', `Could not find Rust sidecar at:
${bin}

Build it first with: cd src-tauri && cargo build --release`);
    app.quit();
    return;
  }

  const env = {
    ...process.env,
    NEURODECK_PORT: String(port),
  };

  const cwd = getResourcesDir();
  console.log(`[sidecar] Spawning ${bin} --bridge on port ${port}`);

  // Windows MSYS2/bash workaround: GUI-subsystem Rust binaries crash with
  // STATUS_DLL_NOT_FOUND (0xC0000135) when spawned with redirected stdio
  // under MSYS2. Use PowerShell Start-Process without redirection.
  const isMsys = process.platform === 'win32' && (process.env.MSYSTEM || process.env.MSYS);
  if (isMsys && !app.isPackaged) {
    spawnSidecarMsys(bin, port, cwd, env);
    return;
  }

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

// MSYS2-specific sidecar spawn using PowerShell Start-Process.
// Output redirection is omitted because it triggers STATUS_DLL_NOT_FOUND
// (0xC0000135) when combined with Start-Process under MSYS2.
// We detect readiness by polling the HTTP bridge port instead.
function spawnSidecarMsys(bin, port, cwd, env) {
  const psCmd = [
    `$env:NEURODECK_PORT = '${port}';`,
    `$env:PATH = '${(env.PATH || '').replace(/'/g, "''")}';`,
    `Set-Location '${cwd.replace(/'/g, "''")}';`,
    `$p = Start-Process -FilePath '${bin.replace(/'/g, "''")}' -ArgumentList '--bridge' -WindowStyle Hidden -PassThru;`,
    `Write-Output $p.Id;`,
  ].join(' ');

  const ps = spawn('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

  let sidecarPid = null;
  ps.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (/^\d+$/.test(text)) {
      sidecarPid = parseInt(text, 10);
      console.log(`[sidecar] MSYS2 mode — PID ${sidecarPid}`);
    }
  });

  ps.stderr.on('data', (data) => {
    console.error('[sidecar stderr]', data.toString().trimEnd());
  });

  ps.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[sidecar] PowerShell spawn failed with code ${code}`);
    }
  });

  // Poll the bridge HTTP port to detect readiness and crashes.
  // We can't use stdout/stderr because redirection triggers the MSYS2 crash.
  let readyLogged = false;
  const pollInterval = setInterval(() => {
    if (!sidecarPid || isQuitting) {
      clearInterval(pollInterval);
      return;
    }
    const client = net.connect({ port: parseInt(port, 10), host: '127.0.0.1' }, () => {
      if (!readyLogged) {
        console.log('[sidecar] Ready (HTTP port up)');
        readyLogged = true;
      }
      client.end();
    });
    client.on('error', () => {
      // Port not up yet — check if process is still alive
      const check = spawn('powershell.exe', ['-NoProfile', '-Command', `try { Get-Process -Id ${sidecarPid} -ErrorAction Stop | Out-Null; Write-Output 'alive' } catch { Write-Output 'dead' }`], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      let result = '';
      check.stdout.on('data', (d) => { result += d.toString(); });
      check.on('exit', () => {
        if (result.trim() !== 'alive' && !isQuitting) {
          console.log(`[sidecar] PID ${sidecarPid} not found — crashed or exited`);
          clearInterval(pollInterval);
          sidecar = null;
          const delay = 2000;
          console.log(`[sidecar] Auto-restarting in ${delay}ms...`);
          sidecarRestartTimer = setTimeout(() => spawnSidecar(port), delay);
        }
      });
    });
  }, 2000);

  // C5: Capture the original kill method before overriding to prevent infinite recursion.
  const originalKill = ps.kill.bind(ps);
  ps.kill = () => {
    clearInterval(pollInterval);
    if (sidecarPid) {
      spawn('powershell.exe', ['-NoProfile', '-Command', `Stop-Process -Id ${sidecarPid} -Force -ErrorAction SilentlyContinue`], { stdio: 'ignore', windowsHide: true });
    }
    try { originalKill(); } catch {}
  };

  sidecar = ps;
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
    // H6: explicit security defaults even for the splash window
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true,
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
      // H3: sandbox isolates the renderer at the OS level (separate from contextIsolation).
      // Safe here because preload only uses contextBridge + ipcRenderer (both sandbox-compatible).
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // M1: only enable DevTools in dev mode
      devTools: !!process.env.ELECTRON_DEV,
    },
  });

  // Dev: load Vite dev server if running, otherwise fall back to built files
  if (process.env.ELECTRON_DEV) {
    const client = new net.Socket();
    client.setTimeout(200);
    const fallback = () => {
      client.destroy();
      console.log('[main] Vite dev server not running on port 1420. Loading built production files.');
      mainWindow.loadURL('neurodeck://app/index.html');
    };
    client.once('connect', () => {
      client.destroy();
      mainWindow.loadURL('http://localhost:1420');
      mainWindow.webContents.openDevTools();
    });
    client.once('error', fallback);
    client.once('timeout', fallback);
    client.connect(1420, '127.0.0.1');
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

  // C1: Validate URL protocol before opening externally — blocks javascript:, file://, etc.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      safeOpenExternal(url);
    }
  });

  // C2: Same validation for new window requests from renderer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
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
  // C4: Register neurodeck:// file protocol with path traversal protection.
  // Validates the resolved path stays inside frontend/dist before serving.
  protocol.registerFileProtocol('neurodeck', (request, callback) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || pathname === '') pathname = '/index.html';

      const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
      const filePath = path.resolve(distDir, pathname.replace(/^\//, ''));

      // Ensure the resolved path is strictly inside distDir
      if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
        callback({ error: -6 }); // NET::ERR_FILE_NOT_FOUND
        return;
      }
      callback({ path: filePath });
    } catch {
      callback({ error: -6 });
    }
  });

  const port = await findFreePort();
  bridgePort = port;
  console.log(`[electron] Bridge port: ${port}`);

  // Store port so preload/neurobridge can read it
  process.env.NEURODECK_PORT = String(port);

  // H2: Deny all permission requests except notifications.
  // Camera, microphone, geolocation, MIDI, etc. are denied by default.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set(['notifications']);
    callback(allowed.has(permission));
  });

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

// C3: Validate URL protocol before opening externally
ipcMain.handle('open-external', (_event, url) => {
  safeOpenExternal(url);
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
  return safeStorage.isEncryptionAvailable();
});

// H4: Validate input type and length before passing to native safe storage
ipcMain.handle('safe-storage-encrypt', (_event, plain) => {
  if (typeof plain !== 'string' || plain.length > 65536) return null;
  return safeStorage.encryptString(plain).toString('base64');
});

ipcMain.handle('safe-storage-decrypt', (_event, encrypted) => {
  if (typeof encrypted !== 'string' || encrypted.length > 131072) return null;
  try {
    const buf = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
});

// H5: Coerce to boolean before applying to prevent unexpected behavior
ipcMain.handle('set-kiosk', (_event, enabled) => {
  const isEnabled = Boolean(enabled);
  if (mainWindow) {
    mainWindow.setKiosk(isEnabled);
    mainWindow.setFullScreen(isEnabled);
  }
  return isEnabled;
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
