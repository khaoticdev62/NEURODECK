# NeuroDeck OS — Handoff Document

## Current state

**Epic 0 (Baseline and safety) complete.** The repository has a working, validated Electron + React + TypeScript + Tailwind v4 scaffold (via electron-vite) with the mandatory security baseline applied. No feature work (Epic 1 onward) has started yet.

### What exists right now

```text
Neurodeck/
├── NeuroDeck_OS_Complete_Platform_Implementation_Bundle.zip   (original, untouched)
├── specs/                          (4 spec documents — source of truth)
├── docs/
│   ├── security/NDX_SECURITY_ARCHITECTURE.md
│   └── implementation/NDX_IMPLEMENTATION_LEDGER.md
├── src/
│   ├── main/                       (window lifecycle, security baseline)
│   │   └── security/               (windowSecurity.ts, urlPolicy.ts + tests)
│   ├── preload/                    (narrow contextBridge, no business logic)
│   ├── renderer/src/
│   │   ├── App.tsx, main.tsx, assets/  (real baseline shell, Tailwind wired up)
│   │   ├── app/ controller/ features/ components/ state/ services/   (empty ownership dirs, Epic 1+)
│   │   └── __tests__/
│   ├── shared/                     (contracts/schemas/errors/constants/types — empty, Epic 4+)
│   └── core/                       (actions/permissions/models/... — empty, Epic 4+)
├── e2e/app.spec.ts                 (Playwright Electron boot smoke test)
├── electron.vite.config.ts, tsconfig*.json, vitest.config.mts, playwright.config.ts
├── package.json                    (scripts: typecheck, lint, test, test:e2e, build, build:linux/win/mac)
├── CLAUDE.md / IMPLEMENTATION_CHECKLIST.md / HANDOFF.md
```

All ownership directories from mega-prompt §7 exist (as empty `.gitkeep`-marked folders) so later epics have a clear place to land — see `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` for the one documented deviation (renderer-owned folders live under `src/renderer/src/` to match electron-vite's actual build boundaries, not directly under `src/`).

**Validation, all currently green:**

```bash
npm run typecheck   # 0 errors
npm run lint         # 0 errors, 0 warnings
npm run test         # 12/12 unit tests passing
npm run build        # electron-vite build succeeds
npm run test:e2e     # 1/1 Playwright Electron smoke test passing
```

## What to do next

1. **Epic 1 — Shell and design system.** Build design tokens (mega-prompt §8.1), core primitives (§8.2), the shell anatomy (top system rail, primary nav rail, bottom controller rail, context panel), the five display modes (Standard/Focus/Split/Overlay/Theater), global modals/overlays, error boundaries, and the route registry. This replaces the current placeholder `App.tsx`.
2. **Epic 2 — Controller runtime** should follow closely — most later screens assume the Spatial Focus Engine and semantic controller actions already exist.
3. Keep `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` current as each epic lands — it's not a one-time Epic 0 artifact.
4. **Phase A (core, Epics 0–12) must fully land before Phase B (platform completion, Epics X1–X15) begins.** Explicit instruction from `specs/START_HERE_NeuroDeck_OS_Complete_Platform.md`.
5. Record every story using the Story Completion Template (mega-prompt §38) or Supplemental Story Completion Contract (supplemental §56), and check it against the Acceptance Gates in `IMPLEMENTATION_CHECKLIST.md` before marking anything done.

## Key open decisions (need a product/owner call before or during Epic 9 / Epic X4)

- **AI provider(s) for v1.** The spec defines a Model Router and routing profiles (mega-prompt §18) but does not mandate a specific provider. Decide which cloud and/or local model providers ship first.
- **Extension marketplace scope for v1.** Epic X3 (signed extension marketplace, SDK, CLI) is platform-completion work — confirm whether it's in scope for the first shippable release or deferred to a later milestone.
- **Distribution/packaging target confirmation.** The spec assumes SteamOS Game Mode + Desktop Mode (Epic 12). Confirm no additional Linux distro targets are required for v1.
- **Sync provider(s) for Epic X7.** Supplemental §20.3 implies pluggable sync providers; none are named. Decide default provider(s) before building the sync engine.

## Risks and constraints to carry forward

- **No mocked completion is acceptable anywhere.** A coding agent must not report a screen, service, or epic complete based on routes, UI scaffolds, static cards, or mocked data. Completion requires real services, typed IPC, controller traversal, failure states, tests, and ledger evidence.
- **Controller-first is a hard requirement, not a stretch goal.** Every feature must be fully usable with a controller alone from the moment it ships; touch/mouse are optional accelerators only.
- **AI destructive actions always require the full review pipeline** (Intent → Plan → Policy → Permission → Review → Typed tool call → Validation → Audit → Recovery checkpoint).
- **Offline-first is non-negotiable** for the systems listed in supplemental §3.6 (shell nav, local workspaces, files, terminal, local Git, installed local models, local search, local workflows, controller settings, recovery, installed docs).
- The wireframe spec outranks the implementation prompts whenever they conflict — see the precedence order in `CLAUDE.md` §2.
- **Tracked, accepted risk:** `npm audit` reports 5 vulnerabilities, all confined to Vitest's dev/UI server dependency chain (devDependency only, never packaged). Revisit at the Epic 12 security pass — see `docs/security/NDX_SECURITY_ARCHITECTURE.md` §7.
- **Forward note for Epic 4:** the preload bridge currently exposes `@electron-toolkit/preload`'s generic IPC wrapper (unused by any feature). It must be replaced by typed, Zod-validated contracts before any IPC-using feature ships — don't let it become a back door for ad hoc channels.

## Where to look for detail

- Screen-by-screen UX requirements (layout, states, controller actions): wireframe spec §8 (ND-001 through ND-056) and supplemental §5 for the additional screens.
- IPC/service contracts: mega-prompt §14, §19–§30; supplemental §50.
- Test strategy: mega-prompt §34; supplemental §52.
- Performance budgets: mega-prompt §33; supplemental §53.
- Security gates: mega-prompt §6, §40; supplemental §54, §57.
- Epic 0 evidence and decisions: `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`.
- Current security posture: `docs/security/NDX_SECURITY_ARCHITECTURE.md`.
