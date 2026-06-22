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

[`src/preload/index.ts`](../../src/preload/index.ts) exposes exactly one global via `contextBridge.exposeInMainWorld`:

- `window.ndx` — a narrow, typed bridge (`NdxBridge`, defined in `src/shared/contracts/bridge.ts`): `workspaces.{list,create,remove,pickFolder}` and `files.{list,read}`. Each method maps to exactly one `ipcRenderer.invoke(channel, payload)` call against a channel name from `src/shared/contracts/ipcChannels.ts` — never a raw `send`/`on`/`invoke` passthrough, never a dynamic channel name.

The non-isolated fallback branch (`window.electron = electronAPI` without `contextBridge`) that ships in the electron-vite template was **removed** during Epic 0, because `contextIsolation: true` is now mandatory and that branch could never execute in this codebase — keeping it would have been dead code masquerading as a safety fallback.

**Resolved in Epic 5:** the generic `@electron-toolkit/preload` `electronAPI`/`window.electron`/`window.api` wrapper this section originally flagged as "wider than spec's narrowly-scoped, typed APIs requirement" has been **removed and uninstalled**. It was confirmed unused by any feature code before removal. The real narrow bridge above replaces it, built specifically to support Epic 5's workspace persistence and file access — the first features that genuinely need main-process (Node `fs`) access.

## 5. IPC payload validation

**Status:** Implemented (Epic 5). Every IPC handler in `src/main/ipc/` (`registerWorkspaceHandlers.ts`, `registerFileHandlers.ts`) parses its payload against the matching Zod schema (`src/shared/contracts/{workspace,file}.ts`) before any handler logic runs; a failed parse returns a typed `NdxResult` validation error rather than touching the store/service. No handler throws across the IPC boundary — every path, success or failure, resolves to `{ ok: true, data }` or `{ ok: false, error: NdxError }` (`src/shared/contracts/error.ts`).

## 6. Process responsibility boundaries

Matches mega-prompt §5.1:

- **Renderer** (`src/renderer/src/**`): presentation, focus state, controller UX, view-level state only. No direct filesystem/shell/secret/DB access — every file/workspace operation goes through `window.ndx` → validated IPC → core service.
- **Preload** (`src/preload/**`): narrow bridge only, no business logic — `window.ndx` exposes exactly the methods in `NdxBridge`, each a single-purpose `ipcRenderer.invoke` call.
- **Main** (`src/main/**`): window lifecycle, navigation policy, security baseline, plus (Epic 5) IPC handler registration (`src/main/ipc/`) — handlers validate input and delegate to `src/core/`, no business logic lives in the handlers themselves.
- **Core** (`src/core/**`): persistence, workspace, file, local Git, and local PTY terminal services are real. Remaining ownership directories land in their assigned epics.

## 7. Dependency security

`npm audit` (run at Epic 0 baseline, see ledger for full output) reports 5 vulnerabilities (3 moderate, 1 high, 1 critical), **all confined to Vitest's bundled dev-server/UI dependency chain** (`esbuild` → `vite` → `vite-node`/`@vitest/mocker` → `vitest`). These are devDependencies only:

- Not bundled into the packaged Electron app (`electron-builder` only packages `out/` and runtime `dependencies`, not `devDependencies`).
- The "critical" finding specifically concerns the optional Vitest UI server (`vitest --ui`), which this project does not run.
- The "high" finding concerns Vite's own dev server path traversal, not applicable to the production build output.

**Decision:** Accepted as a tracked risk rather than forcing a breaking Vitest 4 migration during Epic 0. **Action item for Epic 12 (packaging and hardening / security pass):** re-run `npm audit`, and either upgrade to a patched Vitest major version or confirm the dev-server-only exposure is still accurate before release.

## 9. File access security (Epic 5)

`src/core/files/FileService.ts` is the only path through which the renderer can read filesystem content, and every call is scoped to a workspace's registered root:

- **Path traversal defense:** `resolveWithinRoot()` calls `fs.realpath` on both the workspace root and the resolved target path, then verifies the target's path-relative-to-root doesn't escape upward (`..`) or resolve to an absolute path outside the root. Using `realpath` (not just string normalization) means this catches **symlink-based escapes** too — a symlink placed inside the workspace pointing to a directory outside it is rejected, not just a literal `../` in the request. Verified with a real test that creates an actual symlink via `fs.symlink` (`src/core/files/__tests__/FileService.test.ts`).
- **No arbitrary path access:** the IPC handlers (`registerFileHandlers.ts`) only ever pass a `workspaceId` + `relativePath` from the renderer; the absolute root path always comes from the server-side `WorkspaceStore`, never from the renderer's request payload. The renderer cannot supply an absolute path and have it trusted.
- **Read-only today:** no write/copy/move/rename/delete/compress/extract/secure-delete handlers exist. This is deliberate, not an oversight — see ledger Epic 5 "Scope decision." When those are built, they must integrate with Epic 11's Recovery Service from the start, not retrofit it later.

## 8. Outstanding items for later epics

| Item                                                                         | Owning epic              | Why deferred                                                                               |
| ---------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Permission broker, audit log, destructive-action review pipeline             | Epic 4 (done)            | Real as of Epic 4 — `ActionQueue`/`PermissionBroker`/`AuditLog`, demonstrated end to end   |
| Typed, Zod-validated IPC contracts replacing the generic preload wrapper     | Epic 5 (done)            | Real as of Epic 5 — `shared/contracts/`, `src/main/ipc/`, `window.ndx`                     |
| Destructive file operations (write/copy/move/rename/delete/compress/extract) | Epic 11                  | Need the Recovery Service's checkpoint/undo path before any destructive op can ship safely |
| Secrets vault / encrypted storage                                            | Epic 10 (identity) / X10 | No credential-requiring feature exists yet (no AI provider connections, no remote auth)    |
| `applyNavigationPolicy` integration test against a live `BrowserWindow`      | Epic 12 security pass    | Requires Electron test harness beyond current unit-test scope                              |
| Vitest dependency chain vulnerabilities                                      | Epic 12 security pass    | Dev-only exposure, breaking upgrade out of scope for baseline                              |

## 10. Terminal security (Epic 6 partial)

- Interactive shells use `node-pty`; no `child_process.exec` fallback exists.
- The renderer supplies only a registered `workspaceId` and optional relative directory. `resolveTerminalCwd()` realpaths the workspace and target and rejects traversal, files, and symlink escapes.
- The renderer cannot choose an executable or inject spawn arguments. The main process selects the platform shell.
- PTY input is runtime-schema limited to 64 KiB per message; geometry and session counts are bounded; retained output is capped at 1 MiB per session.
- Secret-like inherited variables (`TOKEN`, `SECRET`, `PASSWORD`, `API_KEY`, private-key and authorization names) are removed before shell creation.
- Streaming event payloads are validated again in preload before renderer listeners receive them.
- ND-028 renders terminal bytes through xterm.js as terminal data, never with `innerHTML`; web-link activation is not enabled. Snapshot/event sequence numbers prevent duplicate or reordered hydration at view mount.
- Termination uses the shared confirmation surface and states that foreground processes will stop.
- Direct user terminal input is allowed. AI-generated/intent commands are not implemented; any future model proposal must enter the same plan/policy/permission/review pipeline now used by ND-029 structured user proposals.
- ND-029 structured commands serialize values/paths with platform-shell quoting and emit pipes, redirects, and conditionals only from enumerated operator blocks. Risk classification is deterministic and advisory; it is not treated as the sole security boundary.
- All Command Builder submissions use fixed registered tools and revoke prior terminal grants before submission, forcing a new approval. Approval cards show the exact command and terminal target from action arguments before execution. Privileged patterns require `terminal.privileged`; other commands require `terminal.execute`.

## 11. Git security (Epic 6)

- `GitService` calls the system `git` binary via `execFile('git', [...argsArray], { cwd })` exclusively — no shell string is ever constructed, so commit messages, branch names, paths, and remote names can never be interpreted as shell syntax regardless of their content.
- `checkout()` validates the requested branch against the real local branch list before invoking Git; `fetch()`/`pull()`/`push()` validate the remote name against the real configured remote list the same way. An unrecognized branch/remote throws before any process spawns — this is the same closed-set validation pattern as `FileService`'s path-traversal checks, applied to Git's argument surface instead of the filesystem.
- `push()` has no force flag and no code path that could add one; force push (flagged "critical risk" in mega-prompt §22) is simply not implemented, not merely defaulted off.
- Push is never bundled with commit. `WorkspaceGitTab` always opens a separate `ConfirmationDialog` for push, showing the exact branch, remote name, and push URL — a user cannot push by accident while reviewing a commit.
- All Git IPC handlers (`registerGitHandlers.ts`) validate their payload against a Zod schema before calling `GitService`, matching the pattern from `registerFileHandlers.ts`/`registerWorkspaceHandlers.ts`.
- Restore/discard (history-rewriting or working-tree-destroying operations) remain unimplemented — they need Epic 11's Recovery Service or an explicit irreversibility warning the UI doesn't have yet, per §22's "discard requires recovery support or explicit irreversibility warning."
