# Fallow Baseline Audit — UI Redesign Phase 1 (Real Data)

> Date: 2026-06-17
> Fallow version: 2.98.0
> Command: `npx fallow` (health, dupes, dead-code, audit)

## Executive Summary

- **Files analyzed:** 473
- **Functions analyzed:** 8272
- **Functions above complexity threshold:** 921
- **Critical severity findings:** 276
- **High severity findings:** 229
- **Moderate severity findings:** 416
- **Dead-code issues:** 311 (unused files: 48, unused exports: 217)
- **Duplication:** 2.91% (3031 lines, 116 clone groups)
- **Audit verdict:** FAIL

## Top 25 Complexity Hotspots

| Rank | File | Score | Commits | Fan In | Trend | Action |
|---|---|---|---|---|---|---|
| 1 | `frontend/src/react/services/bridgeAdapter.ts` | 49 | 47 | 70 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 2 | `frontend/src/react/App.tsx` | 39.9 | 40 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 3 | `frontend/src/react/features/ide/IDEView.tsx` | 23 | 22 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 4 | `electron/main.js` | 22.5 | 23 | 18 | accelerating | high complexity combined with frequent changes makes this a maintenance risk |
| 5 | `frontend/src/react/state/useNeuroDeckState.ts` | 22.2 | 16 | 3 | cooling | high complexity combined with frequent changes makes this a maintenance risk |
| 6 | `frontend/src/react/components/layout/PrimarySidebar.tsx` | 21.8 | 25 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 7 | `frontend/src/react/features/terminal/TerminalScreen.tsx` | 18.4 | 15 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 8 | `frontend/src/react/features/torrent/TorrentView.tsx` | 18.1 | 16 | 2 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 9 | `frontend/src/react/features/orchestrator/OrchestratorView.tsx` | 17.8 | 17 | 2 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 10 | `frontend/vite.config.ts` | 16.9 | 11 | 0 | accelerating | high complexity combined with frequent changes makes this a maintenance risk |
| 11 | `frontend/src/react/features/browser/BrowserView.tsx` | 16.4 | 27 | 2 | cooling | high complexity combined with frequent changes makes this a maintenance risk |
| 12 | `frontend/src/react/features/settings/SettingsView.tsx` | 16.2 | 31 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 13 | `frontend/src/react/features/prompt-lab/PromptLabView.tsx` | 16.2 | 17 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 14 | `frontend/src/react/features/workspace/WorkspaceView.tsx` | 15.7 | 13 | 1 | cooling | high complexity combined with frequent changes makes this a maintenance risk |
| 15 | `frontend/src/react/features/share/ShareView.tsx` | 15.7 | 20 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 16 | `frontend/src/react/features/plugins/PluginsView.tsx` | 15.7 | 19 | 3 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 17 | `frontend/src/react/components/onboarding/OnboardingModal.tsx` | 14.6 | 16 | 2 | accelerating | high complexity combined with frequent changes makes this a maintenance risk |
| 18 | `frontend/src/react/features/memory/MemoryView.tsx` | 14.1 | 18 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 19 | `frontend/src/react/features/remote/RemoteView.tsx` | 13.7 | 15 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 20 | `frontend/src/react/features/models/ModelsView.tsx` | 12.4 | 15 | 1 | cooling | high complexity combined with frequent changes makes this a maintenance risk |
| 21 | `frontend/src/react/features/canvas/CanvasView.tsx` | 12.4 | 19 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 22 | `frontend/src/react/features/docs/DocsView.tsx` | 12.2 | 14 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 23 | `frontend/src/react/components/command/CommandPalette.tsx` | 11.6 | 19 | 1 | accelerating | high complexity combined with frequent changes makes this a maintenance risk |
| 24 | `frontend/src/react/features/cli-maker/CliMakerView.tsx` | 11.1 | 16 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |
| 25 | `frontend/src/react/features/diagnostics/DiagnosticsView.tsx` | 11.1 | 15 | 1 | stable | high complexity combined with frequent changes makes this a maintenance risk |

## Top 25 Largest Functions

| Rank | File | Function | Line | Lines |
|---|---|---|---|---|
| 1 | `frontend/src/react/App.tsx` | App | 158 | 1368 |
| 2 | `frontend/src/react/features/terminal/TerminalScreen.tsx` | TerminalScreen | 239 | 1300 |
| 3 | `frontend/src/react/features/settings/SettingsView.tsx` | SettingsView | 287 | 1241 |
| 4 | `frontend/src/react/features/ide/IDEView.tsx` | IDEView | 121 | 918 |
| 5 | `frontend/src/react/features/plugins/PluginsView.tsx` | PluginsView | 27 | 889 |
| 6 | `electron/ipc-handlers.js` | registerIpcHandlers | 39 | 858 |
| 7 | `frontend/src/react/features/cli-maker/CliMakerView.tsx` | CliMakerView | 141 | 815 |
| 8 | `frontend/src/react/features/wallpapers/CanvasWallpaperRenderer.tsx` | CanvasWallpaperRenderer | 44 | 733 |
| 9 | `frontend/src/react/components/onboarding/OnboardingModal.tsx` | SetupOnboardingModal | 105 | 713 |
| 10 | `frontend/src/react/features/browser/hooks/useBrowser.ts` | useBrowser | 13 | 643 |
| 11 | `frontend/src/react/features/torrent/TorrentView.tsx` | TorrentView | 127 | 620 |
| 12 | `frontend/src/react/features/prompt-lab/PromptLabView.tsx` | PromptLabView | 43 | 614 |
| 13 | `frontend/src/react/features/memory/MemoryView.tsx` | MemoryView | 49 | 552 |
| 14 | `frontend/src/react/features/share/ShareView.tsx` | WarpinatorPanel | 204 | 482 |
| 15 | `frontend/src/react/features/themes/ThemesView.tsx` | ThemesView | 50 | 465 |
| 16 | `frontend/src/react/features/diagnostics/DiagnosticsView.tsx` | DiagnosticsView | 44 | 441 |
| 17 | `frontend/src/react/features/orchestrator/OrchestratorView.tsx` | OrchestratorView | 144 | 441 |
| 18 | `frontend/src/react/features/security/SecurityView.tsx` | SecurityView | 50 | 399 |
| 19 | `frontend/src/react/features/git/GitView.tsx` | GitView | 54 | 397 |
| 20 | `frontend/src/react/features/browser-vpn/BrowserVpnPanel.tsx` | BrowserVpnPanel | 46 | 392 |
| 21 | `frontend/src/react/input/controller/ControllerProvider.tsx` | ControllerProvider | 94 | 369 |
| 22 | `frontend/src/react/features/terminal/TerminalViewport.tsx` | TerminalViewport | 66 | 367 |
| 23 | `frontend/src/react/features/mcp/MCPView.tsx` | MCPView | 82 | 365 |
| 24 | `docs/legacy-js-archive/main.js` | initVirtualKeyboard | 9645 | 363 |
| 25 | `frontend/src/react/features/remote/RemoteView.tsx` | RemoteView | 26 | 358 |

## Top 25 Duplication Candidates

| Rank | Lines | Tokens | Instances | Files |
|---|---|---|---|---|
| 1 | - | - | 2 |  |
| 2 | - | - | 3 |  |
| 3 | - | - | 2 |  |
| 4 | - | - | 2 |  |
| 5 | - | - | 2 |  |
| 6 | - | - | 2 |  |
| 7 | - | - | 2 |  |
| 8 | - | - | 2 |  |
| 9 | - | - | 2 |  |
| 10 | - | - | 2 |  |
| 11 | - | - | 2 |  |
| 12 | - | - | 2 |  |
| 13 | - | - | 2 |  |
| 14 | - | - | 2 |  |
| 15 | - | - | 2 |  |
| 16 | - | - | 2 |  |
| 17 | - | - | 2 |  |
| 18 | - | - | 2 |  |
| 19 | - | - | 2 |  |
| 20 | - | - | 2 |  |
| 21 | - | - | 2 |  |
| 22 | - | - | 2 |  |
| 23 | - | - | 2 |  |
| 24 | - | - | 2 |  |
| 25 | - | - | 2 |  |

## UI / Component Duplication Clusters

Fallow detected **0** clone groups touching React/design-system code.

| Rank | Lines | Instances | Files |
|---|---|---|---|

## Dead Code / Remnant Candidates

### Top Unused Files

| File | Action |
|---|---|
| `docs/design-mockups/workstation-ui-kit/ChatWorkspace.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/CommandPalette.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/FeatureViews.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/InputConsole.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/NavRail.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/Shell.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/StatusBar.tsx` | Delete this file |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | Delete this file |
| `docs/legacy-js-archive/agent.js` | Delete this file |
| `docs/legacy-js-archive/api_lab.js` | Delete this file |
| `docs/legacy-js-archive/canvas.js` | Delete this file |
| `docs/legacy-js-archive/chat.js` | Delete this file |
| `docs/legacy-js-archive/cli_maker.js` | Delete this file |
| `docs/legacy-js-archive/ctrl_prompt.js` | Delete this file |
| `docs/legacy-js-archive/dashboard.js` | Delete this file |
| `docs/legacy-js-archive/git.js` | Delete this file |
| `docs/legacy-js-archive/graph_view.js` | Delete this file |
| `docs/legacy-js-archive/haptics.js` | Delete this file |
| `docs/legacy-js-archive/haptics.test.js` | Delete this file |
| `docs/legacy-js-archive/icons.js` | Delete this file |
| `docs/legacy-js-archive/icons.test.js` | Delete this file |
| `docs/legacy-js-archive/ide_view.js` | Delete this file |
| `docs/legacy-js-archive/lsp_client.js` | Delete this file |
| `docs/legacy-js-archive/main.js` | Delete this file |
| `docs/legacy-js-archive/markdownWorker.ts` | Delete this file |

### Top Unused Exports

| File | Export | Type |
|---|---|---|
| `docs/design-mockups/workstation-ui-kit/ChatWorkspace.tsx` | ChatWorkspace | - |
| `docs/design-mockups/workstation-ui-kit/CommandPalette.tsx` | CommandPalette | - |
| `docs/design-mockups/workstation-ui-kit/FeatureViews.tsx` | ModelsView | - |
| `docs/design-mockups/workstation-ui-kit/FeatureViews.tsx` | AgentsView | - |
| `docs/design-mockups/workstation-ui-kit/FeatureViews.tsx` | SessionsView | - |
| `docs/design-mockups/workstation-ui-kit/FeatureViews.tsx` | DiagnosticsView | - |
| `docs/design-mockups/workstation-ui-kit/InputConsole.tsx` | InputConsole | - |
| `docs/design-mockups/workstation-ui-kit/NavRail.tsx` | NavRail | - |
| `docs/design-mockups/workstation-ui-kit/StatusBar.tsx` | StatusBar | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | NDIcon | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconTerminal | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconBox | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconBot | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconDatabase | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconHistory | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconPuzzle | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconActivity | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconSettings | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconCommand | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconSend | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconPlus | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconX | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconSearch | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconWifiOff | - |
| `docs/design-mockups/workstation-ui-kit/icons.tsx` | IconCpu | - |

## Dependency Hygiene

- **Unused dependencies:** 3
- **Unresolved imports:** 34
- **Unlisted dependencies:** 6
- **Circular dependencies:** 3

## Architecture Drift Findings

- **Boundary violations:** 0
- **Boundary coverage violations:** 0
- **Boundary call violations:** 0
- **Policy violations:** 0

## Audit Verdict Details

- **Verdict:** fail
- **Dead-code issues:** 3 (has errors: true)
- **Complexity findings:** 87
- **Max cyclomatic complexity:** 59
- **Duplication clone groups:** 35

## Initial Pass/Warn/Fail Status

- **TypeScript:** Pass
- **Lint:** Pass with warnings (102 `any` warnings)
- **Production cleanup gate:** Pass
- **Fallow health:** Warn (276 critical, 229 high)
- **Fallow duplication:** Warn (2.91% duplication)
- **Fallow dead-code:** Fail (311 issues)
- **Fallow audit verdict:** Fail

## Recommendations for Phase 2

1. Refactor the top hotspots only if they are touched during screen redesign; avoid broad rewrites purely for Fallow scores.
2. Consolidate UI duplication clusters when multiple screens share the same layout patterns.
3. Do not blindly delete dead-code findings; many are likely false positives from dynamic imports, barrel exports, or Storybook entry points.
4. Focus Phase 2 on shared components and shell; revisit Fallow metrics after Phase 4.
