# Legacy Replacement Plan

This document details the hybrid architecture of the NEURODECK frontend and serves as a roadmap for the subsequent frontend migration sprints.

## Hybrid Frontend Architecture

NEURODECK’s frontend currently runs in a hybrid state:
1. **Modern React Shell**: The core view controller, layouts, settings panels, and new feature views are written in React 19 + TypeScript + Tailwind CSS (contained in `frontend/src/react/`).
2. **Vanilla JS Legacy Systems**: Certain highly complex, monolithic subsystems (such as the main `chat.js`, live code runner `canvas.js`, PTY terminal orchestration `terminal.js`, and gamepad polling loops) are still active as vanilla JS scripts.

> [!NOTE]
> These vanilla JS modules are **NOT** dead code. Fallow analysis confirms they are active production files imported and executed by `frontend/src/main.js` during runtime bootstrap.

## Core Legacy Files & Status

| Legacy Filename | Subsystem | React Counterpart | Migration Status |
|---|---|---|---|
| `frontend/src/chat.js` | LLM Chat & RAG Context Drawer | None | Scheduled for Sprint 3 |
| `frontend/src/canvas.js` | Code Editor & Collab Room | None | Scheduled for Sprint 4 |
| `frontend/src/terminal.js` | PTY Session Orchestrator | None | Scheduled for Sprint 3 |
| `frontend/src/gamepad.js` | Gamepad D-pad Polling & Navigation | None | Scheduled for Sprint 5 |
| `frontend/src/main.js` | Bootstrap & View Switching | React Root shell | Partially replaced; completely replaced in Sprint 6 |

## Migration Guidelines (Next Sprint)

- Do not attempt to refactor `chat.js` or `canvas.js` in-place.
- When migrating a subsystem to React, build it as a standalone feature folder under `frontend/src/react/features/` with full TypeScript bindings.
- Once the React version of the feature is verified, delete the corresponding vanilla JS module and its import from `main.js`.
