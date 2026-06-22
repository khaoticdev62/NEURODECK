# CLAUDE.md — NeuroDeck OS / NDX Harness

This file orients any Claude Code session (or other coding agent) working in this repository. Read it before touching code.

## 1. What this project is

**NeuroDeck OS** ("NDX Harness") is a controller-native AI operating harness that runs above SteamOS. It unifies local and cloud AI, project workspaces, code editing, terminal control, file management, browser sessions, workflows, remote systems, learning modules, and system utilities into one coherent interface — designed to behave like a console operating system, not a desktop app stretched onto an 800p screen.

- **Target platform:** Steam Deck LCD/OLED, SteamOS Game Mode and Desktop Mode
- **Primary resolution:** 1280 × 800 (16:10); secondary docked layouts at 1920×1080 and 2560×1440
- **Input requirement:** 100% operable with Steam Deck controls — no required mouse, touchscreen, or external keyboard
- **Tech stack:** Electron + React + TypeScript + Tailwind CSS, with a hardened local core service (TypeScript/Node, with Rust permitted for performance/security-critical pieces only)
- **Maturity target:** Production architecture from day one — not an MVP or visual prototype

**Current repository state:** Epics 0–2 complete; Epics 3, 4, and 5 partially complete by design, and Epic 6 is active. The partial ND-025 Git Control Center is real. Epic 6 now also has a real `node-pty` backend: multiple workspace-scoped local shell sessions, resize, streaming output, bounded snapshots, cancellation, exit status, and typed IPC/preload/client plumbing. Shell working directories are realpath-confined to registered workspace roots and inherited secret-like environment variables are removed. ND-028/ND-029 UI, terminal history/search/copy, remote SSH, structured proposals/intent mode, and privileged-command review remain incomplete. Steam Input/native-adapter support is still an explicit, documented gap. Routes without a real screen yet render an honest placeholder naming the screen ID and owning epic. See `HANDOFF.md` and `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` for current state and next steps.

## 2. Source-of-truth documents (read in this order)

All implementation work is governed by the documents in `specs/`. Do not invent architecture, screens, or rules that contradict them.

1. [`specs/START_HERE_NeuroDeck_OS_Complete_Platform.md`](specs/START_HERE_NeuroDeck_OS_Complete_Platform.md) — execution order and agent instructions for the whole set.
2. [`specs/NeuroDeck_OS_Controller_Wireframe_Spec.md`](specs/NeuroDeck_OS_Controller_Wireframe_Spec.md) — **design source of truth.** Defines the original 56 controller-native screens (ND-001–ND-056), shell anatomy, controller contract, spatial focus engine, global components, and UX states.
3. [`specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md`](specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md) — **core implementation spec.** Electron security baseline, project structure, IPC contracts, AI safety runtime, all 13 core services, Epics 0–12, validation commands, and final acceptance gates.
4. [`specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md`](specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md) — **platform-completion supplement.** Run only after document 3. Adds 70 more screens and the remaining must-have platform systems (apps/packages, extensions/marketplace, SDK/CLI, knowledge vault, voice, sync/backup, devices, scheduler, profiles, privacy). Epics X1–X15. **Must extend the shared services from document 3 — never duplicate permissions, notifications, settings, task queues, search, recovery, or controller systems.**

### Conflict precedence (highest wins)

1. Security, data integrity, user control, and recoverability
2. The wireframe spec (`NeuroDeck_OS_Controller_Wireframe_Spec.md`)
3. Existing production behavior proven by tests and real integrations
4. Existing repository architecture and coding standards
5. Existing visual design tokens aligned with the wireframe spec
6. The implementation prompts
7. Agent assumptions

When a real conflict is found: record it, explain the impact, choose the safest production-compatible resolution, and update code/tests/docs together. Do not preserve obsolete behavior just because it already exists.

## 3. Non-negotiable rules

These override convenience or speed. Full detail lives in the specs; the short version:

- **No mock production behavior.** No fake metrics, canned IPC responses, simulated terminal/Git/model/agent output, fake provider connectivity, "coming soon" controls in required flows, or empty shells presented as complete screens. Mocks/fixtures are test-code only.
- **No unrestricted renderer privileges.** No Node integration, unrestricted filesystem/process access, raw secret-store access, or arbitrary IPC in the renderer. Use a narrow, typed, frozen preload bridge.
- **No controller cheating.** Every required path must work with a controller alone — no mouse-hover-only, drag-and-drop-only, or external-keyboard-only flows. Touch/trackpad are optional accelerators, never requirements.
- **No unreviewed destructive AI execution.** All meaningful AI actions flow through: `Intent → Structured plan → Policy evaluation → Permission evaluation → User review when required → Typed tool invocation → Validation → Audit → Recovery checkpoint`.
- **No false completion claims.** A screen/feature/story is not done until the route exists, renders real state, passes controller traversal, has loading/empty/error/offline/restricted states where applicable, has typed IPC connected, has tests (unit/integration/E2E for primary workflow), passes build/typecheck, has no critical console errors, and has ledger evidence.
- **No duplicate platform silos** (supplemental work). Extend shared settings/permissions/notifications/logging/task-queue/model-routing/file-access/controller/recovery/search/provider/secret-storage services rather than building parallel ones.
- **No package-manager lies, no unsafe extension freedom, no invisible AI memory, no background surprises, no cloud dependency for core/offline operation, no false hardware assumptions.** (See supplemental spec §3 for full detail.)

## 4. Architecture summary

```text
SteamOS
└── NeuroDeck OS Harness
    ├── NDX Shell (Global Nav, Workspace Manager, Command Palette, Notification Center, Quick Overlay)
    ├── Controller Runtime (Steam Input Adapter, Spatial Focus Engine, Haptics, Input Profile Manager)
    ├── AI Runtime (Model Router, Agent Manager, Context Broker, Prompt/Tool Policy Layer)
    ├── Execution Runtime (Typed Tool Registry, Permission Broker, Action Queue, Validation Layer, Recovery Manager)
    ├── Workstation Services (Files, Terminal/PTY, Git, Browser, Code/LSP, SSH/Remote, Workflow Engine)
    └── Storage (SQLite state, encrypted secrets, workspace snapshots, logs, preferences)
```

Process boundaries (target architecture):

```text
Electron Renderer → typed frozen preload API → Electron Main Process
  → authenticated local RPC/service boundary → NDX Core
      (Action/Tool Registry, Permission Broker, Model Router, Agent Runtime,
       Workflow Runtime, Workspace/File/Terminal/Git/Browser/Remote/System
       services, Recovery, Notification, Audit, Settings)
```

- **Renderer:** presentation, focus state, controller UX, view-level state, accessibility. Never touches the filesystem, shell, secrets, or DB directly.
- **Preload:** narrow typed bridge only — no business logic, no raw `ipcRenderer`, no dynamic channel names.
- **Main process:** window lifecycle, permission requests, secure BrowserWindow config, IPC routing, core-service lifecycle, crash recovery, updates.
- **Core service:** real tools/integrations, long-running tasks, policy evaluation, audit, persistence, cancellation, resource management.

Every production `BrowserWindow` must set `contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false`, validate all IPC payloads with a runtime schema (e.g. Zod), and apply a strict CSP. Full baseline in mega-prompt §6.

Target `src/` layout is defined in mega-prompt §7 (`app/`, `controller/`, `features/`, `components/`, `state/`, `services/`, `shared/`, `main/`, `preload/`, `core/`). Adapt to whatever scaffolding tool is chosen, but converge toward this ownership boundary — avoid giant generic utility folders.

## 5. How to work in this repo

1. Work through [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md) in order: Phase A (Epics 0–12, core mega-prompt) before Phase B (Epics X1–X15, supplemental).
2. Before writing code for the first time, do a first-pass repository discovery (mega-prompt §4) and create/maintain `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` — repository baseline, architecture/security/controller findings, mock/stub inventory, screen inventory status, IPC inventory, test inventory, decisions/assumptions, completed items with evidence, remaining risks.
3. For every story, record completion using the **Story Completion Template** (mega-prompt §38) for core work, or the **Supplemental Story Completion Contract** (supplemental §56) for platform-completion work. Both require: requirement, implementation, real integration, controller behavior, states, security, tests, evidence, remaining risks.
4. Never declare a screen/epic complete without satisfying the **Final Acceptance Gates** (mega-prompt §40: architecture, controller, AI safety, functionality, UI, quality) and, for Phase B work, the **Supplemental Acceptance Gates** (supplemental §57).
5. Search explicitly for danger patterns before trusting any code as real (`mock`, `fake`, `stub`, `placeholder`, `TODO`, `setTimeout`, `Math.random`, `sampleData`, `any`, `@ts-ignore`, `eslint-disable`, `catch {}`, etc. — mega-prompt §4.2). Classify each finding rather than deleting blindly.
6. Prefer the repository's own package manager, build scripts, linting, test framework, and LSP/semantic tools over inventing new tooling.

## 6. Validation commands

The project is scaffolded (electron-vite + React 19 + TypeScript + Tailwind v4). Real equivalents of mega-prompt §39:

```bash
npm install        # install
npm run typecheck  # typecheck (node + web tsconfigs)
npm run lint       # lint (ESLint, includes Prettier check)
npm run format     # format-check equivalent (writes; use --check in CI)
npm run test       # unit-tests (Vitest + Testing Library, jsdom)
npm run build      # production-build (typecheck + electron-vite build)
npm run test:e2e   # electron-e2e (Playwright, launches the built app)
npm run build:linux # linux-package (electron-builder)
```

`focus-graph-audit` and `accessibility-tests` have no equivalent yet — they land with the controller runtime (Epic 2) and accessibility pass (Epic 12) respectively. Run targeted checks after each module and the full suite before any completion claim. Never weaken assertions or skip suites to make checks pass. See `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` for the current validation evidence baseline.
