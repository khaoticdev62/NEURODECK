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

## 12. Build Studio security (Epic 7)

- Monaco Editor and its language workers are bundled locally via Vite's `?worker` import (`monacoWorkers.ts`) and `loader.config({ monaco })` (`CodeEditor.tsx`) — there is no CDN fetch, satisfying the offline-first/no-cloud-dependency rule and avoiding a third-party script dependency in a renderer process.
- `monaco-editor@0.55.1` pulls in `dompurify@3.2.7` transitively, which has multiple known XSS CVEs (DOMPurify is used by Monaco for sanitizing hover/markdown content). Pinned via `package.json`'s `overrides` to `dompurify@^3.4.11`, which patches them. `npm audit --omit=dev` confirms zero production vulnerabilities after the override.
- Diagnostics and symbols are read from Monaco's own bundled TypeScript compiler worker (a real, sandboxed Web Worker) — no code from an opened file is ever evaluated or executed by NeuroDeck itself; Monaco's tokenizers and the TS compiler only parse and analyze text.
- **Real editing and saving landed in Epic 11**, once the Recovery Service existed to back it. File writes go through the same `FileService`/`fileWrite` IPC path described in §13 below — no separate or weaker file-write surface was introduced for Build Studio specifically.

## 13. Recovery Service security (Epic 11)

- Recovery checkpoints and their content snapshots are stored entirely outside the user's own workspace — under `app.getPath('userData')/recovery/<workspaceId>/` — so they can never be committed to the user's Git history, swept up by a `git clean`, or otherwise confused with the user's own files.
- `FileService.write()` is never reachable without a checkpoint first: `registerFileHandlers.ts`'s `fileWrite` handler always calls `fileService.readIfExists()` → `recoveryService.recordCheckpoint()` → `fileService.write()`, in that fixed order, in the main process. The renderer cannot invoke `write()` directly — only the validated `file.write` IPC channel, which always runs this sequence.
- `resolveForWrite()` (the write-safe sibling to `FileService`'s existing `resolveWithinRoot()`) still resolves the parent directory via `realpath` and rejects symlink escapes — the same path-traversal defense as `read()`/`list()`, extended to cover the "the leaf doesn't exist yet" case a write needs to support.
- Restoring a checkpoint reuses `FileService.write()` under the hood (via the `recovery.restore` handler), so a restore is itself checkpointed — there is no separate, less-validated "restore" code path that bypasses the write pipeline's protections.
- The `recovery.diff` handler computes diffs with the `diff` npm package (pure JS, no native dependency, no shell invocation) — there is no risk of command injection from file content, unlike if this had shelled out to a system `diff` binary.
- 50-checkpoint-per-workspace retention deletes pruned snapshot files for real (not just removing the index entry) — recovery storage cannot grow unbounded per workspace.

## 14. Workflow Engine security (Epic 8)

- `WorkflowEngine`'s `tool-action` steps call `queue.submit()` — the exact same `ActionQueue` entry point a Command Palette action uses. There is no separate, weaker execution path for workflow-originated tool calls: registry lookup, permission evaluation, audit logging, and (if not already granted) the real Approval Queue UI all apply identically. A workflow cannot invoke a tool that isn't registered, and cannot bypass an ungranted capability — `ActionQueue.submit()` parks it as `pending-approval` exactly as it would for any other caller.
- `condition`/`validator` expressions are structured data (`{variable, operator, value}`), evaluated by `evaluateCondition()` via a fixed `switch` over five enumerated operators — never `eval()`, `new Function()`, or any form of dynamic code execution. A malicious or malformed workflow definition cannot execute arbitrary JavaScript through a condition.
- Workflow definitions and run history are persisted via the same Zod-validated IPC pattern as every other store (`registerWorkflowHandlers.ts`) — the renderer cannot write arbitrary JSON to disk outside the validated schema.
- `user-approval` steps require a real, explicit human decision (`resolveApproval()`, wired to a UI button) before the run continues; there is no default/auto-approve path and no timeout that silently approves.

## 15. Model Router and System Metrics security (Epic 9 / Epic 11 §27)

- API keys are encrypted via Electron's `safeStorage` (OS-level: Keychain/DPAPI/libsecret) before they ever reach disk, and are decrypted only inside the main process, only for the duration of a single outbound request (`ModelProviderService.testConnection()`/`complete()`). They are never included in any IPC response — `ModelProvider` always carries `hasApiKey: boolean`, never the key itself.
- `ModelRouter.isPermitted()` enforces privacy/offline/local constraints in code, not just in the UI: Local First, Offline, Private Workspace, and Low Cost routing profiles cannot select a cloud provider, even if one is configured and enabled. A disabled or unreachable provider is filtered out before any request is attempted.
- Ollama-specific runtime calls (`/api/ps`, load, unload) are only ever sent to providers the service has detected as Ollama; a generic OpenAI-compatible endpoint never receives them, so there's no risk of sending a vendor-specific control call to an arbitrary third-party endpoint.
- NeuroDeck never installs, launches, or elevates a model runtime's privileges — Ollama (if used) must already be running and reachable; the app only calls its already-exposed local HTTP API, the same way it would call a remote one.
- `SystemMetricsService` is strictly read-only: it reads `node:os` and (on Linux) `sysfs`/`procfs` files, and never writes to any of them. All sensor access is wrapped in `try`/`catch` with an explicit `{ available: false, reason }` fallback — a missing or permission-denied sensor cannot crash the collector or silently fabricate a value.
- Every Model Router IPC handler (completion, routing, enable/disable, Ollama runtime status/load/unload/benchmark) is Zod-validated like every other surface in the app — no unvalidated payload reaches `core/models/`.
- **ND-042 addendum**: `systemMetrics.collect` (the IPC channel backing the System Dashboard) takes no renderer-supplied input, so there is no payload to validate or to attack — it can only ever return the same read-only snapshot any other caller would get. The renderer never sees process names/paths beyond what `SystemMetricsService.collect()` already exposes (process list capped at 256 entries, sorted by PID, no environment variables or command-line arguments included).

## 16. Agent Runtime security (Epic 8 addendum)

- `AgentRuntime` plans through the real Model Router and only treats model output as executable intent when it contains strict fenced JSON `toolCalls`. Ordinary natural-language output remains plan-only text.
- Every agent run has a real, enforced timeout (`resourceLimits.timeoutMs`, via `setTimeout` + `AbortController`) that genuinely aborts the in-flight provider request — a misbehaving or slow provider cannot keep a run alive indefinitely.
- Cancellation (`cancel()`) aborts the same controller a timeout would, so there is one real cancellation path, not two divergent ones.
- `AgentRuntime` enforces `toolAllowlist` and `maxToolCalls` before a tool request leaves the main process. The renderer bridge then enforces `permissionCeiling` against the registered tool capability before submitting to `ActionQueue`.
- This remains a partial security boundary: pause/resume, child-agent budgets, and richer per-run audit tabs are not implemented yet. Do not add a separate agent-only executor; the ActionQueue bridge is the only allowed tool path.
- **IPC/UI addendum**: `registerAgentHandlers.ts` validates every request with Zod like every other surface; nothing in `core/agents/` is reachable from the renderer without going through it. The `agentRun.update` push channel sends only the already-public `AgentRun` shape (objective, state, timeline, output, token counts) — no secret ever flows through it, since `AgentRuntime` never holds one (API keys stay inside `ModelProviderStore`/`ModelProviderService`, decrypted only for the duration of the model call it makes on the agent's behalf). The Agent Operations Center's tool-allowlist selector is populated from the real `ToolRegistry`, so a UI-created agent can never reference a tool ID that isn't actually registered — there's no path to configure an allowlist entry for a tool that doesn't exist.

## 17. Power Menu and Diagnostics security (Epic 11 addenda)

- `registerPowerHandlers.ts` exposes exactly two real actions — `app.relaunch()`+`app.exit()` and `app.quit()` — both already-built Electron app-lifecycle APIs with no renderer-supplied input, so there's no payload to validate or attack. Real OS-level suspend/reboot/shutdown are deliberately **not implemented anywhere in this codebase**, not merely hidden behind a flag — there is no IPC channel, no main-process code path, and no native binding that could trigger them, even if a compromised renderer tried to invent a request. Both real actions are gated behind a real `ConfirmationDialog` reviewing the action and its consequence before the IPC call fires.
- `registerDiagnosticsHandlers.ts`'s `diagnostics.get` has no renderer-supplied input either. Its response is built exclusively from `app.getVersion()`, `process.versions`, `process.platform`/`process.arch`, and `ModelProviderStore.list()` (which already excludes API keys per §15) — there is no code path by which a secret could enter the diagnostics payload.
- The About/Diagnostics clipboard export composes that same response with a live `SystemMetricsService` snapshot (§15 — read-only, no secrets) entirely in the renderer before calling `navigator.clipboard.writeText`; nothing is written to disk or sent over the network as part of the export.

## 17a. Agent tool submission bridge (Epic 8 addendum)

- Agent Runtime accepts only strict fenced JSON `toolCalls` from model output; malformed tool-call JSON fails closed, and ordinary text remains plan-only output.
- Main-process `AgentRuntime` enforces the persisted agent `toolAllowlist` and `maxToolCalls` before emitting `agentTool.request`.
- Renderer-side `AgentToolExecutionBridge` checks the registered tool's `requiredCapability` against the agent `permissionCeiling` before submitting to the existing `ActionQueue`.
- No separate agent-only executor exists. Execution still flows through the same renderer-owned `ToolRegistry` → `PermissionBroker` → Approval Queue → `AuditLog` path as Command Palette and Workflow Engine actions.
- Pending approval remains user-mediated; the agent run waits in `waiting-for-approval` until `agentTool.result` reports approval/execution, denial, cancellation, or failure.

## 18. Controller Settings security (Epic 11 addendum)

- `registerControllerSettingsHandlers.ts`'s `set` handler validates its payload with `controllerSettingsSchema` like every other surface — a malformed or out-of-enum `hapticsIntensity` value is rejected before it ever reaches `ControllerSettingsStore`.
- The persisted setting is a single enum value (`off`/`low`/`medium`/`high`); there is no free-form input, no file path, and no way for this store to be used to write arbitrary data anywhere else on disk.
- `FocusEngineProvider`'s mount-time load swallows a failed/unavailable bridge call (`.catch(() => {})`) rather than throwing, so a missing or malformed settings file can never crash app startup — it just falls back to the in-memory default (`medium`).

## 19. Display and Theme Settings security (Epic 11 addendum)

- `registerDisplaySettingsHandlers.ts`'s `set` handler validates its payload with `displaySettingsSchema` — two booleans and a three-value enum, the same low-risk shape as Controller Settings. There is no free-form input.
- The persisted settings only ever drive CSS custom-property values (`data-reduce-motion`/`data-high-contrast`/`data-text-size` attributes consumed by `tokens.css`) — there is no code path from this store to executable code, a file path, or a network request.
- `DisplaySettingsProvider`'s mount-time load uses the same `.catch(() => {})` fallback-to-default pattern as Controller Settings, for the same reason: a missing/unavailable settings file must never crash app startup.

## 20. Privacy and Permissions security (Epic 11 addendum)

- `PrivacyPermissions.tsx` is read-mostly: it surfaces real `PermissionBroker`/`AuditLog` state through existing renderer-only objects — no new IPC surface, no new persisted store, nothing new to validate at a process boundary.
- The only mutation this screen performs is `broker.revoke()`, gated behind the same `ConfirmationDialog` pattern every other medium-risk action in the app uses (action/consequence/confirm). There is no grant path here — this screen can only take capabilities away, never add one, so it cannot be used to escalate privilege.
- Because `PermissionBroker` grants are broker-wide rather than per-actor, revoking a capability here affects every tool that requires it, not just one — the screen's copy says so explicitly rather than implying a narrower, per-tool revoke that isn't real.

## 21. Browser System security (Epic 10)

- **URL scheme allowlisting**: `browserUrlPolicy.ts`'s `isAllowedBrowserUrl()` only permits `http`/`https`. It gates three independent enforcement points in `BrowserSessionService`: the IPC handler before a tab is ever created, the `will-navigate` listener on every navigation attempt inside an already-open tab, and the `setWindowOpenHandler` for any window-open attempt (e.g. `target="_blank"` links or `window.open()`). A page cannot navigate itself or trigger a popup to `javascript:`, `file:`, `data:`, or any other disallowed scheme.
- **Process/session isolation**: every browser tab's `WebContentsView` uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — the same hardened baseline as the main window — plus its own session partition scoped to the owning workspace (`persist:browser-${workspaceId}`), so cookies/storage from one workspace's browsing never leak into another's.
- **Default-deny permissions**: `setPermissionRequestHandler` always returns `false`. No website can be granted camera/microphone/geolocation/notifications/etc. through this browser until a real, reviewed permission-prompt UI is built — there is no implicit-allow path today.
- **External navigation**: the only way a browser tab can cause something to open outside its own view is `shell.openExternal()`, called only after the same `isAllowedBrowserUrl` check, and only from the window-open handler or the explicit "Open externally" UI action — never silently.
- **No filesystem/IPC bridge into tab content**: a browser tab's `WebContentsView` has no preload script and no `NdxBridge` exposure — it is a plain, sandboxed, isolated web page with zero access to anything this app's own preload script exposes to the main shell.

## 22. Preload bridge build hardening (real bug found and fixed)

A real bug surfaced after Epic 10 (see the implementation ledger's "A real, production-relevant bug found and fixed" entry for the full diagnosis): the main shell's own preload script (`src/preload/index.ts`) failed to initialize on every build, because `electron-vite` externalizes npm dependencies by default and the preload runs **sandboxed** — sandboxed preloads cannot `require()` an npm package at runtime, only a small allowlist of Node built-ins. A bare `require("zod")` in the bundled preload threw immediately, aborting the script before `contextBridge.exposeInMainWorld('ndx', ndx)` ever ran. This is security-relevant because it's a *fail-safe* failure mode, not a fail-open one — with no bridge, the renderer has zero IPC access of any kind, so no permission/validation boundary was ever actually bypassed; every feature simply showed its real "bridge unavailable" empty state. The risk was availability, not a security hole, but it's recorded here because the fix changes a security-relevant build setting (`electron.vite.config.ts`'s preload `externalizeDeps` config) that future contributors need to preserve.

- **Fix**: `preload.build.externalizeDeps.exclude: ['zod']` in `electron.vite.config.ts`, forcing the preload bundle to inline `zod` rather than leave it as an unresolvable `require()`.
- **Regression guard**: `e2e/app.spec.ts` asserts `typeof window.ndx === 'object'` as its first check, before any UI assertion — verified to genuinely fail without the fix (reverted the config, re-ran the test, confirmed the failure, restored the fix).
- **Going forward**: any new npm dependency imported into `src/preload/index.ts` or anything it transitively imports (all of `shared/contracts/`) must be added to the same `exclude` list. This is the one place in the codebase where "it built successfully" does not mean "it works" — the failure is silent at the React-rendering layer and only visible in the renderer's own console.
