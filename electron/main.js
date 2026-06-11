const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, protocol, safeStorage, session, Notification, WebContentsView } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { IPC, ALLOWED_CHANNELS } = require('./ipc-channels');

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
let browserView = null;
let browserBounds = { x: 0, y: 0, width: 1280, height: 600 };

/* ── Browser state: bookmarks, history, ad-block, downloads ─────────────── */

const BOOKMARKS_PATH = path.join(app.getPath('userData'), 'browser-bookmarks.json');
const MAX_HISTORY = 200;
let browserHistory = [];
let adBlockEnabled = true;
let activeDownloads = new Map();

// Conservative ad/tracker domain blocklist (~100 entries)
const AD_BLOCK_DOMAINS = new Set([
  'googleads.g.doubleclick.net','googlesyndication.com','google-analytics.com',
  'googletagmanager.com','googletagservices.com','adservice.google.com',
  'pagead2.googlesyndication.com','tpc.googlesyndication.com','fonts.gstatic.com',
  'facebook.com/tr','connect.facebook.net','an.facebook.com',
  'amazon-adsystem.com','s.amazon-adsystem.com','c.amazon-adsystem.com',
  'ads.yahoo.com','analytics.yahoo.com','gemini.yahoo.com',
  'ads.twitter.com','analytics.twitter.com','static.ads-twitter.com',
  'ads.linkedin.com','analytics.linkedin.com',
  'ads.reddit.com','events.reddit.com',
  'ads.tiktok.com','analytics.tiktok.com',
  'outbrain.com','taboola.com','criteo.com','criteo.net',
  'adnxs.com','appnexus.com','openx.net','rubiconproject.com',
  'pubmatic.com','indexww.com','sovrn.com','lijit.com',
  'doubleclick.net','doubleverify.com','adsafeprotected.com',
  'moatads.com','adsystem.com','adsrvr.org','advertising.com',
  'adform.net','adroll.com','adsymptotic.com','adsrvr.org',
  'bounceexchange.com','quantserve.com','scorecardresearch.com',
  'krxd.net','demdex.net','omtrdc.net','everesttech.net',
  'adsystem.amazon.com','adsystem.google.com','adsystem.microsoft.com',
  'hotjar.com','clarity.ms','segment.io','segment.com',
  'mixpanel.com','amplitude.com','heap.io','fullstory.com',
  'intercom.io','intercomcdn.com','zendesk.com','freshdesk.com',
  'driftt.com','hubspot.com','marketo.net','pardot.com',
  'salesforce.com','eloqua.com','optimizely.com','vwo.com',
  'crazyegg.com','luckyorange.com','mouseflow.com','sessioncam.com',
  'datadoghq.com','newrelic.com','sentry.io','bugsnag.com',
  'rollbar.com','logrocket.com','fullstory.com',
  'cdn.heapanalytics.com','cdn.segment.com','cdn.amplitude.com',
  'cdn.mxpnl.com','cdn.mouseflow.com','cdn.hotjar.com',
  'browser.sentry-cdn.com','js.sentry-cdn.com',
]);

function loadBookmarks() {
  try {
    if (fs.existsSync(BOOKMARKS_PATH)) {
      return JSON.parse(fs.readFileSync(BOOKMARKS_PATH, 'utf-8'));
    }
  } catch (e) { console.error('[browser] failed to load bookmarks:', e); }
  return [];
}

function saveBookmarks(bookmarks) {
  try {
    fs.writeFileSync(BOOKMARKS_PATH, JSON.stringify(bookmarks, null, 2));
  } catch (e) { console.error('[browser] failed to save bookmarks:', e); }
}

function addHistoryEntry(url, title = '') {
  if (!url || url.startsWith('about:') || url.startsWith('chrome:')) return;
  browserHistory = browserHistory.filter((h) => h.url !== url);
  browserHistory.unshift({ url, title, timestamp: Date.now() });
  if (browserHistory.length > MAX_HISTORY) browserHistory = browserHistory.slice(0, MAX_HISTORY);
}

function shouldBlockAd(details) {
  if (!adBlockEnabled) return false;
  try {
    const hostname = new URL(details.url).hostname.toLowerCase();
    for (const blocked of AD_BLOCK_DOMAINS) {
      if (hostname === blocked || hostname.endsWith('.' + blocked)) return true;
    }
  } catch (_) {}
  return false;
}

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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[webContents] did-fail-load: ${errorCode} - ${errorDescription} (URL: ${validatedURL})`);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error(`[webContents] crashed (killed: ${killed})`);
  });

  mainWindow.webContents.on('console-message', (event) => {
    console.log(`[renderer console] [Level ${event.level}] ${event.message} (Source: ${event.sourceId}:${event.lineNumber})`);
  });

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

  // C1: Allowlist the only two valid app origins.
  // Any other URL (including javascript:, file://, or external https://) is blocked
  // and, if it looks like a web URL, opened in the OS browser instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const ALLOWED_ORIGINS = [
      'neurodeck://',
      ...(process.env.ELECTRON_DEV ? ['http://localhost:1420'] : []),
    ];
    if (ALLOWED_ORIGINS.some((prefix) => url.startsWith(prefix))) return;
    event.preventDefault();
    safeOpenExternal(url);
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
      const relative = path.relative(distDir, filePath);
      const isInside = !relative.startsWith('..') && !path.isAbsolute(relative);
      if (!isInside) {
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

  // H2b: Also gate direct capability checks (complements the request handler above).
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = new Set(['notifications']);
    return allowed.has(permission);
  });

  // H7: Content Security Policy.
  // Injected on all responses so the renderer cannot load external scripts,
  // fetch arbitrary hosts, or embed frames.
  // unsafe-inline is required because the frontend uses vanilla JS/CSS without
  // a nonce/hash system; removing it would require a larger frontend refactor.
  const bridgeOrigin = `http://127.0.0.1:${port}`;
  const wsBridgeOrigin = `ws://127.0.0.1:${port}`;
  const devExtras = process.env.ELECTRON_DEV
    ? ` http://localhost:1420 ws://localhost:1420 ws://localhost:24678`
    : '';
  const CSP = [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `connect-src 'self' ${bridgeOrigin} ${wsBridgeOrigin}${devExtras}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only inject CSP for the app's own pages — external sites loaded in the
    // browser WebContentsView must not receive our restrictive CSP.
    const isAppUrl = details.url.startsWith('neurodeck://') ||
                     details.url.startsWith('http://localhost:1420') ||
                     details.url.startsWith('http://127.0.0.1:1420');
    if (isAppUrl) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [CSP],
        },
      });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
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

  // Initialize secure service layer
  const LspManager = require('./services/lsp/lsp-manager');
  const ConnectionRegistry = require('./services/diagnostics/connection-registry');
  const HealthProbeRunner = require('./services/diagnostics/health-probe-runner');
  const { registerIpcHandlers } = require('./ipc-handlers');

  const isDev = !!process.env.ELECTRON_DEV;
  const lspManager = new LspManager(mainWindow, isDev);
  global.lspManager = lspManager; // Keep reference for cleanup
  const connectionRegistry = new ConnectionRegistry(mainWindow);
  const healthProbeRunner = new HealthProbeRunner(
    connectionRegistry,
    lspManager,
    bridgePort,
    app.getPath('userData')
  );

  lspManager.setWorkspaceRoot(path.join(app.getPath('userData'), 'workspace'));

  registerIpcHandlers(
    mainWindow,
    lspManager,
    connectionRegistry,
    healthProbeRunner,
    bridgePort,
    isDev
  );

  // Run initial diagnostics probes in background
  setTimeout(() => {
    healthProbeRunner.runAllProbes().catch(err => console.error('[main] Initial health probe failed:', err));
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// ─────────────────────────────────────────────────────────
// IPC Allowlist Guard
// Blocks any channel not in ipc-channels.js from ever being handled.
// Must be registered before individual handlers so it runs first.
// ─────────────────────────────────────────────────────────

ipcMain.on('ipc-message', (_event, channel) => {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.warn(`[ipc] Blocked unknown channel: ${channel}`);
  }
});

// ─────────────────────────────────────────────────────────
// IPC Handlers (for preload API)
// ─────────────────────────────────────────────────────────

// Sanitize dialog options: only pass through known-safe properties.
// Prevents a compromised renderer from injecting securityScopedBookmarks,
// arbitrary defaultPath traversals, or other privileged dialog flags.
const SAFE_SAVE_DIALOG_KEYS = new Set(['title', 'defaultPath', 'buttonLabel', 'filters', 'properties', 'message', 'nameFieldLabel', 'showsTagField']);
const SAFE_OPEN_DIALOG_KEYS = new Set(['title', 'defaultPath', 'buttonLabel', 'filters', 'properties', 'message']);

function sanitizeDialogOptions(raw, allowed) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const safe = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      safe[key] = raw[key];
    }
  }
  return safe;
}

ipcMain.handle(IPC.GET_BRIDGE_PORT, () => bridgePort);

// C3: Validate URL protocol before opening externally
ipcMain.handle(IPC.OPEN_EXTERNAL, (_event, url) => {
  safeOpenExternal(url);
});

ipcMain.handle(IPC.SHOW_SAVE_DIALOG, async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showSaveDialog(mainWindow, sanitizeDialogOptions(options, SAFE_SAVE_DIALOG_KEYS));
});

ipcMain.handle(IPC.SHOW_OPEN_DIALOG, async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showOpenDialog(mainWindow, sanitizeDialogOptions(options, SAFE_OPEN_DIALOG_KEYS));
});

ipcMain.handle(IPC.SAFE_STORAGE_AVAILABLE, () => {
  return safeStorage.isEncryptionAvailable();
});

// H4: Validate input type and length before passing to native safe storage.
// Returns { ok: false } on invalid input rather than silently returning null.
ipcMain.handle(IPC.SAFE_STORAGE_ENCRYPT, (_event, plain) => {
  if (typeof plain !== 'string') return { ok: false, error: 'Input must be a string' };
  if (plain.length > 65536) return { ok: false, error: 'Input exceeds maximum length' };
  try {
    const ciphertext = safeStorage.encryptString(plain).toString('base64');
    return { ok: true, ciphertext };
  } catch (e) {
    return { ok: false, error: 'Encryption failed' };
  }
});

ipcMain.handle(IPC.SAFE_STORAGE_DECRYPT, (_event, encrypted) => {
  if (typeof encrypted !== 'string') return { ok: false, error: 'Input must be a string' };
  if (encrypted.length > 131072) return { ok: false, error: 'Input exceeds maximum length' };
  try {
    const buf = Buffer.from(encrypted, 'base64');
    const plaintext = safeStorage.decryptString(buf);
    return { ok: true, plaintext };
  } catch {
    return { ok: false, error: 'Decryption failed' };
  }
});

// H5: Coerce to boolean before applying to prevent unexpected behavior
ipcMain.handle(IPC.SET_KIOSK, (_event, enabled) => {
  const isEnabled = Boolean(enabled);
  if (mainWindow) {
    mainWindow.setKiosk(isEnabled);
    mainWindow.setFullScreen(isEnabled);
  }
  return isEnabled;
});

ipcMain.handle(IPC.GET_IS_KIOSK, () => {
  return mainWindow ? mainWindow.isKiosk() : false;
});

ipcMain.handle(IPC.REQUEST_NOTIFICATION_PERMISSION, () => {
  // Notification.isSupported() is the correct Electron API — Notification.permission
  // is a Web API that does not exist in the main process (Node.js context).
  return Notification.isSupported() ? 'granted' : 'denied';
});

// ─────────────────────────────────────────────────────────
// Browser (WebContentsView)
// ─────────────────────────────────────────────────────────

// Standard Chrome User-Agent — hides "Electron" to avoid UA-based blocking
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

// Forwards browser navigation events to all renderer processes so the UI can update
function broadcastBrowserEvent(event, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser-event', { event, payload });
  }
}

function ensureBrowserView() {
  if (browserView) return;
  if (!mainWindow) return;
  browserView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });
  // Mask Electron in User-Agent so sites like Reddit/Facebook don't block us
  browserView.webContents.setUserAgent(CHROME_USER_AGENT);
  // Disable automation flag (navigator.webdriver) which anti-bot scripts detect
  browserView.webContents.on('dom-ready', () => {
    browserView.webContents.executeJavaScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      if (window.chrome && window.chrome.runtime) {
        // keep chrome.runtime as-is; some sites check for it
      }
    `).catch(() => {});
  });
  // Log load failures for debugging
  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[browser] did-fail-load: ${errorCode} - ${errorDescription} (URL: ${validatedURL})`);
  });
  browserView.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    console.log(`[browser console] [${levels[level] || level}] ${message} (at ${sourceId}:${line})`);
  });
  // Allow common permissions for the browser (media, notifications, etc.)
  browserView.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = new Set(['notifications', 'fullscreen', 'clipboard-sanitized-write']);
    callback(allowed.has(permission));
  });
  // Handle new-window / target="_blank" links by opening in the same view
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    browserView.webContents.loadURL(url);
    return { action: 'deny' };
  });
  // Ad-blocker: block requests to known ad/tracker domains
  browserView.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (shouldBlockAd(details)) {
      callback({ cancel: true });
      return;
    }
    callback({});
  });

  // Handle downloads with progress tracking
  browserView.webContents.session.on('will-download', (event, item, webContents) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = item.getFilename();
    const savePath = path.join(app.getPath('downloads'), filename);
    item.setSavePath(savePath);
    activeDownloads.set(id, { id, filename, savePath, totalBytes: item.getTotalBytes(), receivedBytes: 0, state: 'progressing' });
    broadcastBrowserEvent('download-started', { id, filename, totalBytes: item.getTotalBytes() });

    item.on('updated', (event, state) => {
      const dl = activeDownloads.get(id);
      if (dl) {
        dl.receivedBytes = item.getReceivedBytes();
        dl.state = state;
        broadcastBrowserEvent('download-progress', { id, receivedBytes: dl.receivedBytes, totalBytes: dl.totalBytes, state });
      }
    });

    item.once('done', (event, state) => {
      const dl = activeDownloads.get(id);
      if (dl) {
        dl.state = state;
        broadcastBrowserEvent('download-complete', { id, filename: dl.filename, savePath: dl.savePath, state });
      }
      activeDownloads.delete(id);
    });
  });
  // Forward navigation events to the renderer so the address bar updates
  browserView.webContents.on('did-navigate', (event, url) => {
    addHistoryEntry(url);
    broadcastBrowserEvent('did-navigate', { url });
  });
  browserView.webContents.on('did-navigate-in-page', (event, url, isMainFrame) => {
    if (isMainFrame) {
      addHistoryEntry(url);
      broadcastBrowserEvent('did-navigate', { url });
    }
  });
  // Forward history state changes so back/forward buttons can update
  browserView.webContents.on('did-finish-load', () => {
    broadcastBrowserEvent('history-state', {
      canGoBack: browserView.webContents.navigationHistory.canGoBack(),
      canGoForward: browserView.webContents.navigationHistory.canGoForward(),
    });
  });
  // Basic context menu (right-click)
  browserView.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.linkURL) {
      menu.append(new MenuItem({ label: 'Open Link', click: () => browserView.webContents.loadURL(params.linkURL) }));
      menu.append(new MenuItem({ label: 'Copy Link Address', click: () => require('electron').clipboard.writeText(params.linkURL) }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    if (params.hasImageContents) {
      menu.append(new MenuItem({ label: 'Copy Image', click: () => browserView.webContents.copyImageAt(params.x, params.y) }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy', click: () => browserView.webContents.copy() }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    menu.append(new MenuItem({ label: 'Back', enabled: browserView.webContents.navigationHistory.canGoBack(), click: () => browserView.webContents.navigationHistory.goBack() }));
    menu.append(new MenuItem({ label: 'Forward', enabled: browserView.webContents.navigationHistory.canGoForward(), click: () => browserView.webContents.navigationHistory.goForward() }));
    menu.append(new MenuItem({ label: 'Reload', click: () => browserView.webContents.reload() }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Reader Mode', click: () => {
      browserView.webContents.executeJavaScript(`
        (function() {
          const article = document.querySelector('article') || document.querySelector('main') || document.body;
          const title = document.querySelector('h1')?.textContent || document.title;
          const paragraphs = Array.from(article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'));
          const text = paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 0).join('\\n\\n');
          return { title, text, url: location.href };
        })()
      `).then((result) => {
        broadcastBrowserEvent('reader-mode', result);
      }).catch(() => {});
    } }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Inspect Element', click: () => browserView.webContents.inspectElement(params.x, params.y) }));
    menu.popup({ window: mainWindow });
  });
  mainWindow.contentView.addChildView(browserView);
  browserView.setBounds(browserBounds);
}

function syncBrowserViewBounds() {
  if (browserView && mainWindow) {
    browserView.setBounds(browserBounds);
  }
}

ipcMain.handle(IPC.BROWSER_OPEN, (_event, url) => {
  if (!mainWindow) return { success: false };
  ensureBrowserView();
  if (browserView) {
    browserView.webContents.loadURL(url);
    browserView.setVisible(true);
    browserView.webContents.focus();
    syncBrowserViewBounds();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_NAVIGATE, (_event, url) => {
  if (browserView) {
    browserView.webContents.loadURL(url);
    browserView.webContents.focus();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_BACK, () => {
  if (browserView && browserView.webContents.navigationHistory.canGoBack()) {
    browserView.webContents.navigationHistory.goBack();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_FORWARD, () => {
  if (browserView && browserView.webContents.navigationHistory.canGoForward()) {
    browserView.webContents.navigationHistory.goForward();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_RELOAD, () => {
  if (browserView) {
    browserView.webContents.reload();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_GET_URL, () => {
  if (browserView) {
    return { url: browserView.webContents.getURL() };
  }
  return { url: '' };
});

ipcMain.handle(IPC.BROWSER_HIDE, () => {
  if (browserView) {
    browserView.setVisible(false);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_SHOW, () => {
  if (browserView) {
    browserView.setVisible(true);
    browserView.webContents.focus();
    syncBrowserViewBounds();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_SET_BOUNDS, (_event, bounds) => {
  if (bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number' &&
      typeof bounds.width === 'number' && typeof bounds.height === 'number') {
    browserBounds = bounds;
    syncBrowserViewBounds();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_GET_CONTENT, async () => {
  if (browserView) {
    try {
      const content = await browserView.webContents.executeJavaScript('document.documentElement.outerHTML');
      return { content };
    } catch {
      return { content: '' };
    }
  }
  return { content: '' };
});

ipcMain.handle(IPC.BROWSER_SAVE_TO_MEMORY, async () => {
  if (!browserView) return { success: false, error: 'No browser page open' };
  try {
    const [title, url, text] = await Promise.all([
      browserView.webContents.executeJavaScript('document.title'),
      browserView.webContents.executeJavaScript('location.href'),
      browserView.webContents.executeJavaScript(
        'document.body ? document.body.innerText.replace(/\\s+/g, " ").slice(0, 4000) : ""'
      ),
    ]);
    const content = `[Browser Save] ${title} (${url})\n\n${text}`.trim();
    const res = await fetch(`http://127.0.0.1:${bridgePort}/api/memory_add_fact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return { success: false, error: `Sidecar error: ${res.status}` };
    const data = await res.json();
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

ipcMain.handle(IPC.BROWSER_ZOOM_IN, () => {
  if (browserView) {
    const level = browserView.webContents.getZoomLevel();
    browserView.webContents.setZoomLevel(level + 0.5);
    return { zoomLevel: level + 0.5 };
  }
  return { zoomLevel: 0 };
});

ipcMain.handle(IPC.BROWSER_ZOOM_OUT, () => {
  if (browserView) {
    const level = browserView.webContents.getZoomLevel();
    browserView.webContents.setZoomLevel(level - 0.5);
    return { zoomLevel: level - 0.5 };
  }
  return { zoomLevel: 0 };
});

ipcMain.handle(IPC.BROWSER_ZOOM_RESET, () => {
  if (browserView) {
    browserView.webContents.setZoomLevel(0);
    return { zoomLevel: 0 };
  }
  return { zoomLevel: 0 };
});

ipcMain.handle(IPC.BROWSER_FIND, (_event, text) => {
  if (browserView && text) {
    browserView.webContents.findInPage(text, { findNext: false });
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle(IPC.BROWSER_STOP_FIND, () => {
  if (browserView) {
    browserView.webContents.stopFindInPage('clearSelection');
    return { success: true };
  }
  return { success: false };
});

/* ── Bookmarks ───────────────────────────────────────────────────────────── */

ipcMain.handle(IPC.BROWSER_BOOKMARK_ADD, (_event, { title, url }) => {
  const bookmarks = loadBookmarks();
  if (!bookmarks.some((b) => b.url === url)) {
    bookmarks.push({ title: title || url, url, createdAt: Date.now() });
    saveBookmarks(bookmarks);
  }
  return { success: true, bookmarks };
});

ipcMain.handle(IPC.BROWSER_BOOKMARK_REMOVE, (_event, { url }) => {
  let bookmarks = loadBookmarks();
  bookmarks = bookmarks.filter((b) => b.url !== url);
  saveBookmarks(bookmarks);
  return { success: true, bookmarks };
});

ipcMain.handle(IPC.BROWSER_BOOKMARK_LIST, () => {
  return { bookmarks: loadBookmarks() };
});

/* ── History ─────────────────────────────────────────────────────────────── */

ipcMain.handle(IPC.BROWSER_HISTORY_LIST, () => {
  return { history: browserHistory };
});

ipcMain.handle(IPC.BROWSER_HISTORY_CLEAR, () => {
  browserHistory = [];
  return { success: true };
});

/* ── Reader Mode ─────────────────────────────────────────────────────────── */

ipcMain.handle(IPC.BROWSER_READER_MODE, async () => {
  if (!browserView) return { success: false, title: '', text: '', url: '' };
  try {
    const result = await browserView.webContents.executeJavaScript(`
      (function() {
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        const title = document.querySelector('h1')?.textContent || document.title;
        const paragraphs = Array.from(article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'));
        const text = paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 0).join('\\n\\n');
        return { title, text, url: location.href };
      })()
    `);
    return { success: true, ...result };
  } catch (e) {
    return { success: false, title: '', text: '', url: '' };
  }
});

/* ── Ad Blocker ──────────────────────────────────────────────────────────── */

ipcMain.handle(IPC.BROWSER_ADBLOCK_TOGGLE, () => {
  adBlockEnabled = !adBlockEnabled;
  return { enabled: adBlockEnabled };
});

ipcMain.handle(IPC.BROWSER_ADBLOCK_STATUS, () => {
  return { enabled: adBlockEnabled };
});

app.on('before-quit', async (e) => {
  isQuitting = true;
  if (global.lspManager) {
    e.preventDefault();
    try {
      await global.lspManager.destroyAll();
    } catch (_) {}
    global.lspManager = null;
    killSidecar();
    app.exit(0);
  } else {
    killSidecar();
  }
});

app.on('window-all-closed', () => {
  // On macOS keep app running until quit; on Win/Linux quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
