# NEURODECK UI Audit Repo Map

Date: 2026-06-15
Scope: blocker-first UI/UX, navigation, design-system, accessibility, controller, and E2E repair pass.

## Stack And Runtime

- App shell: Electron desktop app.
- Renderer: React 19, TypeScript, Vite, Tailwind CSS.
- Backend bridge: Rust sidecar under `src-tauri/`, exposed to the renderer through HTTP/WebSocket bridge adapters.
- Primary target: Steam Deck LCD 1280x800, controller-first, desktop-compatible.

## Package And Build Files

- Root package: `package.json`
- Root lockfile: `package-lock.json`
- Frontend package: `frontend/package.json`
- E2E package: `e2e/package.json`
- Vite config: `frontend/vite.config.ts`
- Tailwind config: `frontend/tailwind.config.js`
- TypeScript configs: `frontend/tsconfig.json`, `frontend/tsconfig.node.json`
- Electron builder/config scripts: `electron/`, root npm scripts

## Electron Surface

- Main process: `electron/main.js`
- Preload: `electron/preload.js`
- Dev launcher: `electron/scripts/dev-launcher.js`
- Security model: context isolation, renderer sandbox, no node integration, CSP injection, permission deny-by-default with notifications allowed.

## Renderer Entry And App Shell

- Renderer HTML: `frontend/index.html`
- React entry: `frontend/src/react/main.tsx`
- App composition: `frontend/src/react/App.tsx`
- Shell/layout components:
  - `frontend/src/react/components/layout/TitleBar.tsx`
  - `frontend/src/react/components/layout/PrimarySidebar.tsx`
  - `frontend/src/react/components/layout/SecondaryRail.tsx`
  - `frontend/src/react/components/layout/NeurodeckShell.tsx`
- View registry and seed navigation data: `frontend/src/react/types/seed.ts`
- App state: `frontend/src/react/state/useNeuroDeckState.ts`

## Feature Views

- Browser: `frontend/src/react/features/browser/`
- Terminal: `frontend/src/react/features/terminal/`
- SSH: `frontend/src/react/features/ssh/`
- Canvas: `frontend/src/react/features/canvas/`
- Prompt Lab: `frontend/src/react/features/prompt-lab/`
- Memory: `frontend/src/react/features/memory/`
- Settings: `frontend/src/react/features/settings/`
- Share, Remote, Tunnel, Docs, Security/Ops, Models, Plugins, and other lazy views are mounted through `App.tsx`.

## Design System

- Canonical source: `frontend/src/design-system/`
- Unified CSS tokens: `frontend/src/design-system/tokens/tokens.css`
- Token JSON: `frontend/src/design-system/tokens.json`
- Theme modifiers:
  - `frontend/src/design-system/themes/blacksite.css`
  - `frontend/src/design-system/themes/tactical-glass.css`
  - `frontend/src/design-system/themes/high-contrast.css`
  - `frontend/src/design-system/themes/colorblind-safe.css`
- Runtime theme injection: `frontend/src/react/theme/cssVariableInjector.ts`
- Global CSS imports: `frontend/src/react/index.css`
- Component registry: `frontend/src/design-system/component-registry.json`
- DS validation: `scripts/validate-design-system.js`

## Component Systems

- React primitive adapters: `frontend/src/react/components/primitives/`
- Cards: `frontend/src/react/components/cards/`
- Command surfaces: `frontend/src/react/components/command/`
- Controller/input system: `frontend/src/react/input/`
- Workstation UI kit: `frontend/src/design-system/ui_kits/workstation/`

## IPC And API Clients

- Renderer bridge adapter: `frontend/src/react/services/bridgeAdapter.ts`
- Electron API typings: `frontend/src/react/types/vite-env.d.ts`
- Rust bridge command dispatch: `src-tauri/src/commands/mod.rs`
- Bridge/event server: `src-tauri/src/bridge.rs`

## Tests And QA

- Frontend unit tests: `frontend/src/react/__tests__/`
- Playwright E2E: `e2e/tests/`
- E2E page objects: `e2e/pages/`
- E2E bridge mock: `e2e/support/tauri-mock.ts`
- Playwright web config: `e2e/playwright.config.ts`
- Electron Playwright config: `e2e/playwright.electron.config.ts`
- Controller checks:
  - `scripts/check-focus-graphs.cjs`
  - `scripts/check-controller-actions.cjs`

## Assets

- Static assets: `assets/`
- E2E visual baselines: `e2e/tests/*-snapshots/`
- Frontend public assets: `frontend/public/`

## Audit Baseline Commands

- `node scripts\validate-design-system.js`
- `npm.cmd run frontend:typecheck`
- `npm.cmd -w frontend run lint`
- `npm.cmd run frontend:build`
- `npm.cmd run check:focus-graphs`
- `npm.cmd run check:controller-actions`
- `npx.cmd playwright test navigation-validation.spec.ts command-palette.spec.ts design-system-audit.spec.ts --config playwright.config.ts --project chromium-desktop` from `e2e/`
