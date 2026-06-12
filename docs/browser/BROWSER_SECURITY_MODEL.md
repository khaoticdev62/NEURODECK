# Browser Security Model

This document outlines the security controls, boundary limits, and isolation policies of the **NeuroBrowse** subsystem.

## 1. WebPreferences Isolation
Every guest `WebContentsView` is instantiated with the following mandatory security flags:
```ts
{
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  javascript: true
}
```

## 2. Navigation Control Gating
- **Allowed Schemes**: `https:`, `http:`, and `about:blank`.
- **Blocked Schemes**: `javascript:`, `data:` (top-level), `ftp:`, and custom external protocols (unless confirmed by user dialogue).
- **Local Files**: `file://` schemes are strictly blocked for remote sites. A local preview feature may use `file://` only under a sandboxed directory limit.
- **External Links**: Handled via `shell.openExternal` after checking against a strict domain whitelist and sanitizing the URL string to prevent shell argument injections.

## 3. Preload & Privileged Scope
- Preload scripts are NOT injected into guest browser web contents.
- Direct `ipcRenderer` calls are not exposed to guest pages.
- Standard Electron `session.setPermissionCheckHandler` blocks any request from a guest page attempting to read device geolocation, clipboard, or media, unless matching a pre-approved site permission entry.
