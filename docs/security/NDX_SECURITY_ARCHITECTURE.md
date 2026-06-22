# NDX Security Architecture

Required by `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` §6. This document tracks the actual security posture of the codebase — update it whenever the baseline changes, not just at Epic 0.

## 1. Electron hardening baseline

Every production `BrowserWindow` is constructed with `HARDENED_WEB_PREFERENCES` from [`src/main/security/windowSecurity.ts`](../../src/main/security/windowSecurity.ts):

```ts
{
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false
}
```

This is a named constant, not inline literals, so future windows cannot drift from the baseline without an explicit, reviewable change to this one file. [`src/main/index.ts`](../../src/main/index.ts) is the only place a `BrowserWindow` is currently constructed and it spreads this constant directly into `webPreferences`.

**Status:** Implemented and enforced for the single main window. The electron-vite scaffold's default (`sandbox: false`, no explicit `contextIsolation`/`webSecurity`) was identified during Epic 0 discovery and corrected.

## 2. Navigation and external link policy

[`src/main/security/urlPolicy.ts`](../../src/main/security/urlPolicy.ts) contains pure, Electron-free predicate functions (unit tested in `__tests__/urlPolicy.test.ts`):

- `isAllowedNavigation(url, allowedOrigins)` — in-app navigation (`will-navigate`) is denied unless the target origin is in an explicit allowlist (the app's own dev server origin in development, `file://` in production).
- `isAllowedExternalUrl(url)` — only `https:` and `mailto:` protocols may be opened externally; everything else (including `javascript:`, `file:`, `http:`) is rejected.

[`src/main/security/windowSecurity.ts`](../../src/main/security/windowSecurity.ts)'s `applyNavigationPolicy()` wires these into `will-navigate` and `setWindowOpenHandler` on every window. `setWindowOpenHandler` always returns `{ action: 'deny' }` — no renderer-initiated `window.open()` ever creates a new BrowserWindow; allowed external URLs are routed through `shell.openExternal` instead.

**Status:** Implemented. The scaffold's default behavior (`shell.openExternal` called unconditionally for any URL from `setWindowOpenHandler`) was identified as a risk during Epic 0 discovery and replaced with the allowlist above.

**Known gap:** no automated test yet exercises `applyNavigationPolicy` against a real `BrowserWindow` (only the pure predicates are unit tested). Add an integration/E2E case when Epic 12's security pass runs.

## 3. Content Security Policy

[`src/renderer/index.html`](../../src/renderer/index.html) sets:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```

No `unsafe-eval`, no remote script sources. `style-src 'unsafe-inline'` is required by Vite's dev-time style injection and Tailwind's runtime style tag usage; revisit whether a nonce-based policy is feasible once the design system (Epic 1) is in place.

**Status:** Implemented (inherited from scaffold, verified against spec requirements).

## 4. Preload bridge

[`src/preload/index.ts`](../../src/preload/index.ts) exposes exactly two globals via `contextBridge.exposeInMainWorld`:

- `window.electron` — `@electron-toolkit/preload`'s `electronAPI` (a scoped wrapper, not raw `ipcRenderer`).
- `window.api` — currently empty; this is where Epic 4's typed, schema-validated IPC contracts will be exposed.

The non-isolated fallback branch (`window.electron = electronAPI` without `contextBridge`) that ships in the electron-vite template was **removed** during Epic 0, because `contextIsolation: true` is now mandatory and that branch could never execute in this codebase — keeping it would have been dead code masquerading as a safety fallback.

**Known gap / forward note:** `electronAPI` from `@electron-toolkit/preload` exposes a generic `ipcRenderer.send/on/invoke` wrapper, which is wider than the spec's "narrowly scoped, typed APIs" requirement (§2.2, §6). This is acceptable as a temporary baseline because no feature code uses it yet (`api` is empty and nothing in `src/renderer` calls `window.electron.ipcRenderer` directly). **Epic 4 (AI safety runtime / typed IPC) must replace renderer-facing IPC access with the typed, Zod-validated contracts in `src/shared/contracts` and `src/shared/schemas` before any feature ships that uses IPC.** Do not let `window.electron.ipcRenderer` become a back door for ad hoc channels.

## 5. IPC payload validation

**Status:** Not yet applicable — no IPC channels are defined beyond the toolkit's generic wrapper, which is unused by application code. Epic 4 must validate every payload with a runtime schema (Zod) before any handler logic runs, per spec §6.

## 6. Process responsibility boundaries

Matches mega-prompt §5.1:

- **Renderer** (`src/renderer/src/**`): presentation, focus state, controller UX, view-level state only. No direct filesystem/shell/secret/DB access exists or is exposed.
- **Preload** (`src/preload/**`): narrow bridge only, no business logic — verified by inspection (5 lines of logic, two `contextBridge` calls).
- **Main** (`src/main/**`): window lifecycle, navigation policy, security baseline. No core-service logic lives here yet.
- **Core** (`src/core/**`): scaffolded as empty ownership directories (`actions/`, `permissions/`, `models/`, `agents/`, `workflows/`, `workspaces/`, `files/`, `terminal/`, `git/`, `browser/`, `remote/`, `system/`, `recovery/`, `audit/`, `persistence/`). No logic implemented yet — this is correct for Epic 0; real services land starting Epic 4–11.

## 7. Dependency security

`npm audit` (run at Epic 0 baseline, see ledger for full output) reports 5 vulnerabilities (3 moderate, 1 high, 1 critical), **all confined to Vitest's bundled dev-server/UI dependency chain** (`esbuild` → `vite` → `vite-node`/`@vitest/mocker` → `vitest`). These are devDependencies only:

- Not bundled into the packaged Electron app (`electron-builder` only packages `out/` and runtime `dependencies`, not `devDependencies`).
- The "critical" finding specifically concerns the optional Vitest UI server (`vitest --ui`), which this project does not run.
- The "high" finding concerns Vite's own dev server path traversal, not applicable to the production build output.

**Decision:** Accepted as a tracked risk rather than forcing a breaking Vitest 4 migration during Epic 0. **Action item for Epic 12 (packaging and hardening / security pass):** re-run `npm audit`, and either upgrade to a patched Vitest major version or confirm the dev-server-only exposure is still accurate before release.

## 8. Outstanding items for later epics

| Item                                                                     | Owning epic                          | Why deferred                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Typed, Zod-validated IPC contracts replacing the generic preload wrapper | Epic 4                               | No features need IPC yet; premature to design contracts without real tool/action requirements |
| Permission broker, audit log, destructive-action review pipeline         | Epic 4                               | Same — no AI runtime exists yet                                                               |
| Secrets vault / encrypted storage                                        | Epic 5 (workspaces) / X10 (identity) | No persistence layer exists yet                                                               |
| `applyNavigationPolicy` integration test against a live `BrowserWindow`  | Epic 12 security pass                | Requires Electron test harness beyond current unit-test scope                                 |
| Vitest dependency chain vulnerabilities                                  | Epic 12 security pass                | Dev-only exposure, breaking upgrade out of scope for baseline                                 |
