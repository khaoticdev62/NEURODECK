# AGENTS.md — NeuroDeck OS / NDX Harness

Agent-facing orientation for anyone (Kimi, Claude, or future agents) working in this repository. Read this before touching code.

## 1. What this project is

**NeuroDeck OS** ("NDX Harness") is a controller-native AI operating harness that runs above SteamOS. It unifies local and cloud AI, project workspaces, code editing, terminal control, file management, browser sessions, workflows, remote systems, learning modules, and system utilities into one coherent interface — designed like a console operating system, not a desktop app stretched onto an 800p screen.

- **Target platform:** Steam Deck LCD/OLED, SteamOS Game Mode and Desktop Mode
- **Primary resolution:** 1280 × 800 (16:10); secondary docked layouts at 1920×1080 and 2560×1440
- **Input requirement:** 100% operable with Steam Deck controls — no required mouse, touchscreen, or external keyboard
- **Tech stack:** Electron + React 19 + TypeScript + Tailwind CSS v4, with a hardened local core service layer (TypeScript/Node)
- **Build tool:** electron-vite
- **Package manager:** npm
- **Maturity target:** Production architecture from day one — not an MVP or visual prototype

## 2. Source-of-truth documents (read in this order)

All implementation work is governed by the documents in `specs/`. Do not invent architecture, screens, or rules that contradict them.

1. `specs/START_HERE_NeuroDeck_OS_Complete_Platform.md` — execution order and agent instructions for the whole set.
2. `specs/NeuroDeck_OS_Controller_Wireframe_Spec.md` — **design source of truth.** Defines the original 56 controller-native screens (ND-001–ND-056), shell anatomy, controller contract, spatial focus engine, global components, and UX states.
3. `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` — **core implementation spec.** Electron security baseline, project structure, IPC contracts, AI safety runtime, all 13 core services, Epics 0–12, validation commands, and final acceptance gates.
4. `specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md` — **platform-completion supplement.** Run only after document 3. Adds 70 more screens and the remaining must-have platform systems (apps/packages, extensions/marketplace, SDK/CLI, knowledge vault, voice, sync/backup, devices, scheduler, profiles, privacy). Epics X1–X15. **Must extend the shared services from document 3 — never duplicate permissions, notifications, settings, task queues, search, recovery, controller handling, or file-access systems.**

### Conflict precedence (highest wins)

1. Security, data integrity, user control, and recoverability
2. The wireframe spec (`NeuroDeck_OS_Controller_Wireframe_Spec.md`)
3. Existing production behavior proven by tests and real integrations
4. Existing repository architecture and coding standards
5. Existing visual design tokens aligned with the wireframe spec
6. The implementation prompts
7. Agent assumptions

When a real conflict is found: record it, explain the impact, choose the safest production-compatible resolution, and update code/tests/docs together. Do not preserve obsolete behavior just because it already exists.

## 3. Current state (as of last handoff)

- **Phase A (Epics 0–12) is in progress. Phase B (Epics X1–X15) must not start until Phase A is complete.**
- **Epics 0, 1, 2:** complete.
- **Epic 3:** 6 of 12 screens real; 6 deferred.
- **Epic 4:** core AI safety pipeline real (Plan schema, ToolRegistry, PermissionBroker, ActionQueue, AuditLog, typed IPC).
- **Epic 5:** workspace and file read/write core real; advanced file ops deferred.
- **Epic 6:** local PTY terminal and most Git operations real; advanced modes and recovery Git ops deferred.
- **Epic 7:** Build Studio real editing + save landed in Epic 11; structural/AI editing deferred.
- **Epic 8:** Workflow Engine real; Agent Runtime core lifecycle, IPC, UI, ActionQueue-backed tool submission, pause/resume, and child-agent bounds real; richer run tabs/e2e remain.
- **Epic 9:** Model Router complete for OpenAI-compatible chat and managed Ollama endpoints; broader modalities/provider metadata remain.
- **Epic 10:** Browser System (ND-030/ND-031) real (scoped); SSH Remote Systems (ND-040/ND-041) real; Learning Hub/Guided Lab untouched.
- **Epic 11:** Recovery Service, System Metrics Service, ND-042 System Dashboard, ND-043 Controller Settings, ND-044 Display/Theme Settings, ND-046 Privacy/Permissions, ND-051 Power Menu, and ND-056 About/Diagnostics are real; remaining settings integrations deferred.
- **Epic 12:** not started.

See `HANDOFF.md` for the exhaustive current-state list, real bugs found and fixed, and load-bearing gotchas. See `IMPLEMENTATION_CHECKLIST.md` for the story-level checklist. See `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` for epic-by-epic evidence and decisions.

## 4. Non-negotiable rules

These override convenience or speed. Full detail lives in the specs; the short version:

- **No mock production behavior.** No fake metrics, canned IPC responses, simulated terminal/Git/model/agent output, fake provider connectivity, "coming soon" controls in required flows, or empty shells presented as complete screens. Mocks/fixtures are test-code only.
- **No unrestricted renderer privileges.** No Node integration, unrestricted filesystem/process access, raw secret-store access, or arbitrary IPC in the renderer. Use the narrow, typed, frozen preload bridge (`window.ndx`).
- **No controller cheating.** Every required path must work with a controller alone — no mouse-hover-only, drag-and-drop-only, or external-keyboard-only flows. Touch/trackpad are optional accelerators, never requirements.
- **No unreviewed destructive AI execution.** All meaningful AI actions flow through: `Intent → Structured plan → Policy evaluation → Permission evaluation → User review when required → Typed tool invocation → Validation → Audit → Recovery checkpoint`.
- **No false completion claims.** A screen/feature/story is not done until the route exists, renders real state, passes controller traversal, has loading/empty/error/offline/restricted states where applicable, has typed IPC connected, has tests (unit/integration/E2E for primary workflow), passes build/typecheck, has no critical console errors, and has ledger evidence.
- **No duplicate platform silos** (Phase B work). Extend shared settings/permissions/notifications/logging/task-queue/model-routing/file-access/controller/recovery/search/provider/secret-storage services rather than building parallel ones.
- **No cloud dependency for core/offline operation.** Shell nav, local workspaces, files, terminal, local Git, installed local models, local search, local workflows, controller settings, recovery, and installed docs must work offline.

## 5. Architecture summary

```text
SteamOS
└── NeuroDeck OS Harness
    ├── NDX Shell (Global Nav, Workspace Manager, Command Palette, Notification Center, Quick Overlay)
    ├── Controller Runtime (Gamepad Adapter, Spatial Focus Engine, Haptics, Input Profile Manager)
    ├── AI Runtime (Model Router, Agent Manager, Context Broker, Prompt/Tool Policy Layer)
    ├── Execution Runtime (Typed Tool Registry, Permission Broker, Action Queue, Validation Layer, Recovery Manager)
    ├── Workstation Services (Files, Terminal/PTY, Git, Browser, Code/LSP, SSH/Remote, Workflow Engine)
    └── Storage (JSON state, encrypted secrets, workspace snapshots, logs, preferences)
```

Process boundaries:

```text
Electron Renderer → typed frozen preload API (`window.ndx`) → Electron Main Process
  → authenticated local RPC/service boundary → NDX Core
      (Action/Tool Registry, Permission Broker, Model Router, Agent Runtime,
       Workflow Runtime, Workspace/File/Terminal/Git/Browser/Remote/System
       services, Recovery, Notification, Audit, Settings)
```

- **Renderer:** presentation, focus state, controller UX, view-level state, accessibility. Never touches the filesystem, shell, secrets, or DB directly.
- **Preload:** narrow typed bridge only — no business logic, no raw `ipcRenderer`, no dynamic channel names.
- **Main process:** window lifecycle, permission requests, secure BrowserWindow config, IPC routing, core-service lifecycle, crash recovery, updates.
- **Core service:** real tools/integrations, long-running tasks, policy evaluation, audit, persistence, cancellation, resource management.

Every production `BrowserWindow` must set `contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false`, validate all IPC payloads with a runtime schema (Zod), and apply a strict CSP.

## 6. How to work in this repo

1. Work through `IMPLEMENTATION_CHECKLIST.md` in order: Phase A (Epics 0–12) before Phase B (Epics X1–X15).
2. Before writing code for the first time, do a first-pass repository discovery and keep `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` current.
3. For every story, record completion using the **Story Completion Template** (mega-prompt §38) for core work, or the **Supplemental Story Completion Contract** (supplemental §56) for platform-completion work.
4. Never declare a screen/epic complete without satisfying the **Final Acceptance Gates** (mega-prompt §40) and, for Phase B work, the **Supplemental Acceptance Gates** (supplemental §57).
5. Search explicitly for danger patterns before trusting any code as real (`mock`, `fake`, `stub`, `placeholder`, `TODO`, `setTimeout`, `Math.random`, `sampleData`, `any`, `@ts-ignore`, `eslint-disable`, `catch {}`, etc.). Classify each finding rather than deleting blindly.
6. Prefer the repository's own package manager, build scripts, linting, test framework, and LSP/semantic tools over inventing new tooling.
7. Keep `HANDOFF.md` current when the high-level state changes.

## 7. Validation commands

```bash
npm install        # install dependencies
npm run typecheck  # TypeScript check (node + web tsconfigs)
npm run lint       # ESLint (includes Prettier check)
npm run format     # Prettier write (use --check in CI)
npm run test       # unit/integration tests (Vitest + Testing Library, jsdom)
npm run build      # production build (typecheck + electron-vite build)
npm run test:e2e   # Electron E2E (Playwright, launches the built app)
npm run build:linux # Linux package (electron-builder)
npm run dev        # Vite dev server + Electron main
```

Run targeted checks after each module and the full suite before any completion claim. Never weaken assertions or skip suites to make checks pass.

## 8. Load-bearing gotchas (read carefully)

These are real issues that have already bitten this project. Do not repeat them.

### 8.1 Preload dependency externalization is load-bearing

The preload script runs **sandboxed** (`sandbox: true`). A sandboxed preload cannot `require()` npm packages. `electron-vite` externalizes dependencies by default, which breaks the preload silently.

- **Fix location:** `electron.vite.config.ts` → `preload.build.externalizeDeps.exclude`.
- **Rule:** any npm package imported into `src/preload/index.ts` or anything it imports (including all of `shared/contracts/`) must be added to that `exclude` list, or the entire `window.ndx` bridge will silently disappear and every screen will show its "bridge unavailable" fallback.
- **Verification:** after any preload dependency change, sanity-check a real packaged launch (`npm run build:linux` or `npm run build:win` and run the output), not just unit tests. The e2e test now asserts `typeof window.ndx === 'object'` first thing to guard against regressions.

### 8.2 `npm run build` passing does not mean `npm run dev` works

Bundler-order-sensitive bugs (e.g., imports moved to the wrong line) can crash dev mode while leaving production builds green. If a bug is reported for dev mode, reproduce and verify it in dev mode (`npm run dev`, Playwright against `http://localhost:5173`), not only in production build.

### 8.3 A real screen passing tests is not enough — verify navigation

Several real, working, tested screens had no path to them anywhere in the UI. Always verify the actual navigation path (primary rail, dashboard link, Command Palette, route link) rather than assuming the route alone makes the screen reachable.

### 8.4 File writes must always be recovery-checkpointed

Any new file-write feature must go through `RecoveryService.recordCheckpoint()` before `FileService.write()`, every time. Follow the orchestration pattern in `registerFileHandlers.ts`'s `fileWrite` handler (read previous content → checkpoint → write). Do not add a second write path that skips this.

### 8.5 Secrets must use `safeStorage`

Any new secret (API key, token, credential) that needs to persist must go through a `SecretCipher`-style injected interface backed by `safeStorage`, never a homegrown cipher or plaintext JSON field. Follow `core/models/SecretCipher.ts` / `src/main/security/electronSecretCipher.ts` as the template.

### 8.6 Follow the established typed IPC pattern

`shared/contracts/` → `src/main/ipc/` → `src/preload/index.ts` (`window.ndx`) → `src/renderer/src/services/ipc/`. Add new methods to the `NdxBridge` interface in `shared/contracts/bridge.ts` and new channel names to `shared/contracts/ipcChannels.ts`.

### 8.7 `react-hooks/set-state-in-effect` lint rule

Any new fetch-on-mount effect must avoid calling a function that sets state synchronously before its first `await` directly in an effect body. Inline the fetch so all `setState` calls are inside the `.then()`/await continuation, or seed initial state from props/dependencies.

### 8.8 Monaco Editor must stay locally bundled

`loader.config({ monaco })` in `CodeEditor.tsx` enforces local bundling; do not remove it. If `dompurify` (a Monaco transitive dependency) gets a new CVE, check `package.json`'s `overrides` entry first.

### 8.9 `ActionQueue.submit()` parks ungranted capabilities as `pending-approval`

When testing code that submits through the real `ActionQueue`, grant the capability first in test setup (or call `queue.approve()`) if the test expects auto-execution. This is correct, intentional behavior, not a bug.

### 8.10 Steam Input / native adapter gap

Physical Steam Deck rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button are not reachable via the standard Gamepad API. Do not pretend these inputs exist without Steam Input or a native adapter. The gap is documented; revisit if/when it becomes a priority.

## 9. Where to continue from Claude's last session

Claude's most recent commit added SSH Remote Systems and e2e route coverage. The working tree shows ongoing work on **ND-013 AI Command Canvas** (`src/renderer/src/features/ai-canvas/AICommandCanvas.tsx`, `planPreview.ts`, and their tests), plus routing and test updates. This is the natural continuation point.

### Suggested first actions

1. **Stabilize the in-flight ND-013 work.**
   - Run `npm run typecheck && npm run lint && npm run test` to see if the uncommitted AI Command Canvas changes are green.
   - If any check fails, fix the code before declaring ND-013 done.
2. **Verify the ND-013 screen is reachable** from the primary nav, System Dashboard, or Command Palette.
3. **Update `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`** with the ND-013 evidence, then update `IMPLEMENTATION_CHECKLIST.md` and `HANDOFF.md` if the status changes.
4. After ND-013 is closed, the next highest-value open items in Phase A are:
   - Epic 3 deferred screens: ND-001 Boot/Session Start, ND-005 AI Provider Setup, ND-006 Workspace Discovery, ND-007 Guided Controller Tutorial, ND-010 Global Search.
   - Epic 6 remaining Git/Terminal work.
   - Epic 8 richer Agent Runtime run tabs/logs and end-to-end UI coverage.
   - Epic 11 remaining settings integrations (Network/VPN, Integrations, Updates, Quick Access Overlay, Error Recovery).
   - Epic 12 packaging/hardening.

Do not start Phase B until Phase A is complete.

## 10. Quick reference

| Question                         | Look here                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| What screen should I build next? | `IMPLEMENTATION_CHECKLIST.md`                                                                  |
| What's already real vs. mocked?  | `HANDOFF.md` §2, `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`                            |
| How do IPC contracts work?       | `shared/contracts/`, `src/main/ipc/`, `src/preload/index.ts`, `src/renderer/src/services/ipc/` |
| Where's the focus engine?        | `src/renderer/src/controller/focus/`                                                           |
| Where's the AI safety pipeline?  | `src/renderer/src/ai-safety/`                                                                  |
| Where are system screens?        | `src/renderer/src/features/system/`                                                            |
| Where are tests?                 | Co-located `__tests__` folders; `e2e/app.spec.ts`                                              |
| Security posture                 | `docs/security/NDX_SECURITY_ARCHITECTURE.md`                                                   |
| Design source of truth           | `specs/NeuroDeck_OS_Controller_Wireframe_Spec.md`                                              |
