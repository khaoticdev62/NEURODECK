# Predictive Coding Inventory

## System Overview

NEURODECK's predictive coding layer integrates LSP, language profiles, and controller input to
provide real completions without a physical keyboard.

## Implemented Components

| Component | Location | Status |
|---|---|---|
| Language profile contracts | `frontend/src/shared/contracts/ide.contracts.ts` | ✅ |
| Language profile registry | `frontend/src/shared/ide/languageProfiles.ts` | ✅ |
| Language command resolver | `frontend/src/shared/ide/languageCommands.ts` | ✅ |
| Predictive snippet registry | `frontend/src/shared/ide/predictiveSnippets.ts` | ✅ |
| Controller action definitions | `frontend/src/shared/ide/controllerActions.ts` | ✅ |
| Project detection service | `electron/services/ide/projectDetectionService.js` | ✅ |
| Safe command execution service | `electron/services/ide/safeCommandExecutionService.js` | ✅ |
| Predictive coding service | `electron/services/ide/predictiveCodingService.js` | ✅ |
| PredictiveBar UI component | `frontend/src/react/features/ide/PredictiveBar.tsx` | ✅ |
| ControllerHintBar UI component | `frontend/src/react/features/ide/ControllerHintBar.tsx` | ✅ |
| RadialCommandWheel UI component | `frontend/src/react/features/ide/RadialCommandWheel.tsx` | ✅ |
| SafeCommandConfirmModal | `frontend/src/react/features/ide/SafeCommandConfirmModal.tsx` | ✅ |
| DiagnosticFixPanel | `frontend/src/react/features/ide/DiagnosticFixPanel.tsx` | ✅ |
| LanguageModeBadge | `frontend/src/react/features/ide/LanguageModeBadge.tsx` | ✅ |
| IDE IPC channels (8) | `electron/ipc-registry.js` | ✅ |
| IDE IPC handlers | `electron/ipc-handlers.js` | ✅ |
| Preload IDE/controller namespace | `electron/preload.js` | ✅ |
| Action registry IDE bindings | `frontend/src/react/utils/controller/action-registry.ts` | ✅ |

## Language Profiles

| Language | LSP Server | Run Default |
|---|---|---|
| TypeScript/JavaScript | typescript-language-server | ✅ |
| Python | pyright-langserver | ✅ |
| Rust | rust-analyzer | ✅ |
| Go | gopls | ✅ |
| Lua | lua-language-server | ✅ |
| Bash/Shell | bash-language-server | 🔒 (confirm required) |
| HTML/CSS | vscode-html-language-server | ✅ |
| JSON/YAML/TOML/Markdown | Various | ✅ |

## Prediction Ranking

| Source | Confidence | Cap |
|---|---|---|
| LSP completions | 0.95 | 10 |
| Diagnostic fix actions | 0.85 | 1 |
| Snippets | 0.60 | 5 |
| Command templates | 0.50 | 4 |

Results are deduped by label and capped at 20 total.
