# Electron Security

This document covers the security model of the NEURODECK Electron shell (`electron/main.js`, `electron/preload.js`). It is distinct from the Rust sidecar security audit (`docs/SECURITY_AUDIT_2026-05-26.md`), which covers the backend command validation, rate limiting, and injection prevention.

---

## Architecture Overview

```
Renderer (Chromium)
  │  Only has window.electronAPI + window.NEURODECK_PORT
  │  No Node.js, no ipcRenderer, no require()
  │
  ├─ contextBridge (preload.js — sandboxed)
  │    Maps named renderer calls → specific IPC channels
  │
  └─ IPC (ipcMain in main.js)
       Validates all input before acting
       Main process holds all OS privileges
```

The frontend communicates with the Rust sidecar through `neurobridge.js` (HTTP fetch + WebSocket to `127.0.0.1:{port}`), not through Electron IPC. Electron IPC is reserved for OS-level integrations: file dialogs, safe storage (OS keychain), kiosk mode, and opening external URLs.

---

## BrowserWindow Security Settings

The main window (`createMainWindow`) is created with:

| Setting | Value | Why |
|---|---|---|
| `contextIsolation` | `true` | Renderer JS cannot access the Node.js context. The preload's `contextBridge` is the only bridge. |
| `nodeIntegration` | `false` | The renderer has no access to `require`, `fs`, `child_process`, or any Node module. |
| `sandbox` | `true` | OS-level process sandbox (Chromium sandbox). Separate from contextIsolation — provides a second layer of isolation even if contextIsolation were bypassed. |
| `webSecurity` | `true` | Same-origin policy enforced. Prevents cross-origin resource loading without CORS. |
| `allowRunningInsecureContent` | `false` | Blocks mixed-content (HTTP assets in HTTPS context). |
| `devTools` | `!!ELECTRON_DEV` | DevTools are disabled in production builds. |

The splash window uses the same security defaults even though it renders nothing.

---

## Preload Script

`electron/preload.js` exposes a narrow, typed API via `contextBridge.exposeInMainWorld`. It:

- Never exposes raw `ipcRenderer`, `fs`, `shell`, `child_process`, or `process` to the renderer.
- Maps each renderer call to a specific, named IPC channel (no generic `invoke(channel, payload)` escape hatch).
- The TypeScript interface is declared in `electron/preload.d.ts`.

**Adding a new IPC channel safely:**

1. Add a named handler in `electron/main.js` with `ipcMain.handle('channel-name', ...)`.
2. Validate all input inside the handler — never trust renderer-supplied data.
3. Expose a named method in `electron/preload.js` via `contextBridge.exposeInMainWorld`.
4. Update the `ElectronAPI` interface in `electron/preload.d.ts`.
5. Do not create a generic `invoke(channel, payload)` method in the preload.

---

## URL and Navigation Security

### `will-navigate` and `setWindowOpenHandler`

Any attempt to navigate the main window away from its loaded URL (or open a popup) is intercepted. Only `http:` and `https:` URLs are passed to `shell.openExternal()`. All other protocols (`javascript:`, `file://`, `data:`, custom schemes) are silently dropped.

```js
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:']);

function safeOpenExternal(url) {
  try {
    const parsed = new URL(url);
    if (ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      shell.openExternal(url);
    }
  } catch { /* malformed URL — ignore */ }
}
```

### `open-external` IPC

The renderer calls `window.electronAPI.openExternal(url)` to open links in the system browser. The IPC handler applies the same `safeOpenExternal` validation — the renderer cannot force an arbitrary protocol to be opened.

---

## Protocol Handler Path Traversal Protection

The `neurodeck://` custom protocol serves `frontend/dist/` files. The handler validates that the resolved file path stays inside `frontend/dist/` before serving:

```js
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
const filePath = path.resolve(distDir, pathname.replace(/^\//, ''));

if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
  callback({ error: -6 }); // NET::ERR_FILE_NOT_FOUND
  return;
}
```

A URL like `neurodeck://app/../../../etc/passwd` resolves outside `distDir` and is rejected.

---

## Permission Request Handler

All permission requests (camera, microphone, geolocation, MIDI, USB, etc.) are denied by default. Only `notifications` is allowed:

```js
session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
  const allowed = new Set(['notifications']);
  callback(allowed.has(permission));
});
```

To allow a new permission, add it to the `allowed` set and document the reason.

---

## Safe Storage (OS Keychain)

The `safeStorageEncrypt` and `safeStorageDecrypt` IPC handlers wrap Electron's `safeStorage` API, which uses the OS keychain (Windows DPAPI, macOS Keychain, Linux Secret Service). Input is validated before the native call:

- Must be a string (not an object, array, or number).
- Length is capped at 64 KB (plain) / 128 KB (encrypted base64) to prevent memory abuse.

---

## IPC Handler Input Validation

All IPC handlers validate their inputs before acting. Common patterns:

- `typeof value !== 'string'` — reject non-strings
- `value.length > MAX` — reject oversized payloads
- `Boolean(value)` — coerce to boolean before calling OS APIs (e.g. kiosk mode)
- `try/catch` around native calls — return `null` on failure instead of throwing

---

## Global Error Handlers

The main process registers handlers for `uncaughtException` and `unhandledRejection`:

```js
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});
```

These prevent silent crashes and ensure errors are visible in logs.

---

## MSYS2 Sidecar Workaround

On Windows with MSYS2, the Rust sidecar is spawned via PowerShell `Start-Process` to avoid a `STATUS_DLL_NOT_FOUND` crash that occurs when stdout/stderr are redirected from an MSYS2 shell context. This is a dev-only path (`!app.isPackaged`). The production packaged app spawns the sidecar with normal `spawn()`.

The kill override in `spawnSidecarMsys` captures the original `ChildProcess.kill` method before replacing it to prevent infinite recursion.

---

## Electron Fuses (Future Work)

Electron Fuses are binary-level flags that lock down the runtime. Consider enabling in a future release:

| Fuse | Default | Recommendation |
|---|---|---|
| `runAsNode` | enabled | Disable in prod to prevent `electron --inspect` abuse |
| `enableNodeOptionsEnvironmentVariable` | enabled | Disable to prevent `NODE_OPTIONS=--require malicious.js` |
| `enableNodeCliInspectArguments` | enabled | Disable in prod to prevent debug port injection |
| `onlyLoadAppFromAsar` | disabled | Enable after verifying ASAR packaging works end-to-end |
| `embeddedAsarIntegrityValidation` | disabled | Enable when code signing is in place |

Fuse changes require binary patching post-build via `@electron/fuses`. See the [Electron Fuses docs](https://www.electronjs.org/docs/latest/tutorial/fuses).

---

## Content Security Policy

The renderer's CSP is set via a `<meta http-equiv="Content-Security-Policy">` tag in `frontend/index.html`. Key directives:

| Directive | Value | Rationale |
|---|---|---|
| `script-src` | `'self'` | No inline scripts, no CDN, no `eval` |
| `object-src` | `'none'` | Blocks Flash and plugin embedding |
| `connect-src` | `http://127.0.0.1:*`, `ws://127.0.0.1:*`, `https:` | Bridge + external APIs |
| `style-src` | `'self' 'unsafe-inline'` | Required for dynamic CSS variable injection at runtime |
| `img-src` | `'self' data: blob: https: http:` | Allows AI-generated images and external avatars |

`'unsafe-inline'` in `style-src` is intentional — the app applies theme CSS variables dynamically via `element.style`. Migrating this to CSS custom property updates via JS (rather than inline style attributes) would allow dropping `'unsafe-inline'` in a future iteration.

---

## macOS Notarization

The `electron-builder.yml` sets `hardenedRuntime: true` for macOS. The accompanying `build/entitlements.mac.plist` grants:

- `com.apple.security.cs.allow-jit` — for the Lua 5.4 JIT in the Rust sidecar
- `com.apple.security.network.client` + `.server` — for the bridge and LAN features
- `com.apple.security.device.audio-input` — for voice STT recording

`com.apple.security.app-sandbox` is intentionally `false` — the sidecar requires direct filesystem access to user config dirs, PTY sessions, and LAN sockets that are incompatible with the macOS app sandbox.
