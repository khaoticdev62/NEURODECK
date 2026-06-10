# NEURODECK Full Screen Catalog Implementation Prompt v1.0

You are a senior Electron, React, TypeScript, Tailwind, accessibility, and Steam Deck UX engineer.

Implement the NEURODECK screen system using the following authoritative documents:

- `NEURODECK_Canonical_Production_PRD_v1.0.md`
- `NEURODECK_Electron_SDS_v1.0.md`
- `NEURODECK_IPC_Contract_Registry_v1.0.md`
- `NEURODECK_Design_Tokens_Component_Library_v1.0.md`
- `NEURODECK_Full_Screen_Catalog_v1.0.md`
- `NEURODECK_Route_Map_v1.0.md`
- `NEURODECK_Controller_Focus_Graph_v1.0.md`

## Mission

Build the route/screen implementation foundation for NEURODECK v1.0.

## Required Stack

- Electron
- React
- TypeScript strict mode
- Tailwind CSS
- Secure preload bridge
- Typed IPC contracts
- Playwright tests
- Accessibility testing

## Required Screens

Implement route shells, state contracts, and test scaffolds for:

- `internal://boot` — SCR-BOOT — Boot / Startup Screen
- `/onboarding` — SCR-ONB — First-Run Onboarding
- `/workspace` — SCR-WKS — AI Workspace
- `overlay://command-palette` — SCR-CMD — Command Palette Overlay
- `/models` — SCR-MDL — Model Manager
- `/agents` — SCR-AGT — Agent Manager
- `/memory` — SCR-MEM — Memory and Context Manager
- `/sessions` — SCR-SES — Session Browser
- `/extensions` — SCR-PLG — Plugins and Hermes Extensions
- `/settings` — SCR-SET — Settings Hub
- `/settings/security` — SCR-SEC — Security and Privacy Center
- `/diagnostics` — SCR-DIAG — Diagnostics Dashboard
- `/settings/themes` — SCR-THEME — Theme Manager
- `/exports` — SCR-EXP — Export Manager
- `/maintenance` — SCR-UPD — Update and Maintenance
- `/recovery` — SCR-ERR — Error Recovery Center


## Rules

1. Do not add new routes without updating the screen registry.
2. Do not invent new design tokens.
3. Do not access Node APIs from renderer code.
4. Do not create arbitrary IPC channels.
5. Do not expose secrets to renderer.
6. Do not ship a screen without loading, error, and recovery state.
7. Do not ship P0 screens without controller focus tests.
8. Do not use placeholder lorem ipsum in production UI copy.
9. Do not use heavy blur, shader effects, or expensive animation.
10. Do not remove accessibility behavior to simplify implementation.

## Implementation Sequence

1. Create route registry.
2. Create AppShell and system route handling.
3. Create focus management primitives.
4. Create shared screen state components: Loading, Empty, Error, Recovery.
5. Implement P0 route shells.
6. Wire typed IPC mocks.
7. Add Playwright route navigation tests.
8. Add 1280×800 visual tests.
9. Add accessibility checks.
10. Implement remaining P1 screens.

## Expected Deliverables

- `src/renderer/routes/` route modules
- `src/renderer/router/routeRegistry.ts`
- `src/renderer/focus/focusGraph.ts`
- `src/renderer/components/states/LoadingState.tsx`
- `src/renderer/components/states/EmptyState.tsx`
- `src/renderer/components/states/ErrorState.tsx`
- `src/renderer/components/states/RecoveryActions.tsx`
- Playwright tests for all P0 routes
- Controller navigation test utilities
- Route-level accessibility tests

Build this as production scaffolding. No demo-only shortcuts.
