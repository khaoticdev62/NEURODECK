# NEURODECK Implementation Plan
## Sprint Roadmap and Integration Ledger
### Last Updated: 2026-05-24 | KFMS: v1.2.0-ra | Active Branch: `feature/sprint-5.1-real-time-collab`

---

## KFMS Snapshot

<!-- KFMS:PLAN_SNAPSHOT:BEGIN -->
- Version: `1.2.1`
- Codename: `Ra`
- Tag: `v1.2.1-ra`
- Workspace state: `manual-uncommitted`
- Last stamped build: `2026-05-26T03:18:41Z`
<!-- KFMS:PLAN_SNAPSHOT:END -->

---

## Execution Model

NEURODECK uses a solo-dev sprint model: one sprint at a time, one shippable feature per sprint, verified before commit, and pushed to GitHub after major updates.

Definition of Done for sprint work:
- `cargo check` succeeds.
- `cargo test` succeeds or any skipped coverage is explicitly documented.
- `npm run --prefix frontend build` succeeds after frontend changes.
- `git diff --check` succeeds.
- New Tauri commands are registered in `generate_handler![]`.
- CSS changes do not add `display: flex` or `display: block` to `#view-*` ID rules.
- KFMS post-commit hook stamps `infra/meta/meta.json`.
- Commit is pushed to the active GitHub feature branch.

Long-running interactive validation:
- `npm run tauri dev` remains the required manual smoke test before final release tagging.
- Feature branches may be marked implementation-complete before `tauri dev` if automated checks pass and the interactive gap is documented.

---

## Current Integrated Baseline

The current branch includes the v1.2 Ra foundation plus the integrated sprint work listed below.

Core shipped capabilities:
- LLM chat with Gemini and Ollama provider support.
- RAG memory injection and vector memory persistence.
- PTY terminal sessions, SSH, FTP/SFTP, SteamOS tunnel, and LAN file transfer.
- Live Canvas with Monaco editor, preview, run support, AI edit, streaming exec output, and cancel support.
- Lua plugin runtime and plugin marketplace install/uninstall flow.
- Settings, themes, personas, onboarding, boot sequence, notifications, and gamepad navigation.
- Whisper.cpp configuration/download path and offline STT command path.
- Computer-use command layer with user approval flow.
- Encrypted cloud sync for memory records and saved sessions.
- Real-time LAN collaborative workspaces for Canvas code, presence, chat, invite payloads, and shared agent approvals.

---

## Status Legend

| Status | Meaning |
|---|---|
| COMPLETE | Implemented on the current branch and pushed. |
| BRANCH-COMPLETE | Implemented on another feature branch but not integrated into the current branch. |
| PARTIAL | Some capability exists, but the sprint's original acceptance criteria are not fully satisfied. |
| PLANNED | Not implemented in the current branch. |
| DEFERRED | Intentionally postponed or superseded by a leaner MVP. |

---

## Sprint Status Matrix

| Sprint | Feature | Status | Current Evidence / Branch |
|---|---|---|---|
| 3.1 | Monaco Editor Integration | COMPLETE | `frontend/src/canvas.js`, `frontend/src/app.css`, commit `56c547e` |
| 3.2 | Whisper STT Upgrade | COMPLETE | `src-tauri/src/whisper.rs`, Settings Whisper panel, branch `origin/feature/sprint-3.2-whisper` |
| 3.3 | Knowledge Graph View | BRANCH-COMPLETE | Branch `origin/feature/sprint-3.3-knowledge-graph`; not present on current branch |
| 3.4 | Task Scheduler | BRANCH-COMPLETE | Branch `origin/feature/sprint-3.4-scheduler`; not present on current branch |
| 3.5 | Git Integration | BRANCH-COMPLETE | Local branch `feature/sprint-3.5-git`; integration audit still required |
| 4.1 | Workflow Visual Builder | BRANCH-COMPLETE | Local branch `feature/sprint-4.1-workflow`; integration audit still required |
| 4.2 | Multi-Agent Orchestrator | BRANCH-COMPLETE | Local branch `feature/sprint-4.2-orchestrator`; integration audit still required |
| 4.3 | Browser Automation | COMPLETE | Headless session command set implemented in `src-tauri/src/commands/browser.rs` and wired into the agent loop |
| 4.4 | Plugin Marketplace | COMPLETE | `src-tauri/src/plugin_mgr.rs`, Settings Marketplace UI |
| 4.5 | Desktop Computer Use | COMPLETE | `src-tauri/src/computer_use.rs`, approval UI, agent tool wiring, commit `7a25eca` |
| 4.6 | Cloud Sync | COMPLETE | `src-tauri/src/sync.rs`, Settings Sync UI, commit `0c29d8c` |
| 5.1 | Real-Time Collaborative Workspaces | COMPLETE | Multi-peer `canvas_collab.rs`, workspace UI, commit `24b1348` |
| 5.2 | Mobile Companion App | PLANNED | Native iOS/Android app not started |

---

## Phase 3 - Anubis: IDE Layer and Intelligence Upgrade

### Sprint 3.1 - Monaco Editor Integration
Status: COMPLETE

Delivered:
- Monaco-backed Canvas editor with language mapping for HTML, CSS, JavaScript, Markdown, Bash, Python, and Lua.
- Fallback textarea path when Monaco CDN fails.
- Live preview debounce and Ctrl+Enter run shortcut.
- AI Edit modal and command integration.
- Collaboration sync now reads from the Monaco model.

Remaining release smoke:
- Open Canvas in `npm run tauri dev`.
- Confirm Monaco CDN load, fallback behavior, language switching, AI Edit, and live collaboration sync.

### Sprint 3.2 - Whisper STT Upgrade
Status: COMPLETE

Delivered:
- `whisper.rs` wrapper for whisper.cpp CLI binaries.
- Settings panel for binary/model paths.
- Model download command with `whisper_download_progress` events.
- `get_whisper_status`, `set_whisper_config`, and `transcribe_audio_whisper` commands.
- Existing STT path attempts Whisper when a configured model exists.

Remaining release smoke:
- Validate local microphone recording with an installed whisper.cpp binary and model.
- Confirm Windows/Linux behavior separately because audio capture differs by OS.

### Sprint 3.3 - Knowledge Graph View
Status: BRANCH-COMPLETE

Current state:
- Work exists on `origin/feature/sprint-3.3-knowledge-graph`.
- The current branch does not contain the graph module/view.

Integration tasks:
- Cherry-pick or merge the branch into the current sprint line.
- Resolve conflicts with the current modular frontend and Canvas changes.
- Re-run `cargo check`, `cargo test`, frontend build, and gamepad/navigation smoke.

### Sprint 3.4 - Task Scheduler
Status: BRANCH-COMPLETE

Current state:
- Work exists on `origin/feature/sprint-3.4-scheduler`.
- The current branch does not contain the scheduler module/view.

Integration tasks:
- Audit persistence path and scheduler startup behavior.
- Ensure scheduled agent runs use the current agent command path.
- Add UI smoke for add, toggle, run now, delete, and persistence.

### Sprint 3.5 - Git Integration
Status: BRANCH-COMPLETE

Current state:
- Local branch `feature/sprint-3.5-git` exists.
- The current branch does not expose Git commands or UI.

Integration tasks:
- Inspect branch diff before merge.
- Confirm no unsafe repository path handling.
- Verify status, diff, stage, commit, log, and generated commit message flow.

---

## Phase 4 - Osiris: Orchestration and Autonomy

### Sprint 4.1 - Workflow Visual Builder
Status: BRANCH-COMPLETE

Current state:
- Local branch `feature/sprint-4.1-workflow` exists.
- The current branch does not contain workflow runtime or view files.

Integration tasks:
- Audit workflow execution for shell/file/HTTP safety.
- Make workflow persistence compatible with current data directory conventions.
- Verify view layout inside 1280x800.

### Sprint 4.2 - Multi-Agent Orchestrator
Status: BRANCH-COMPLETE

Current state:
- Local branch `feature/sprint-4.2-orchestrator` exists.
- The current branch still uses the existing agent loop and profile system.

Integration tasks:
- Audit agent task planning, cancellation, and result aggregation.
- Confirm no duplicate app state structs or stale frontend selectors.
- Verify stop behavior under concurrent agent tasks.

### Sprint 4.3 - Browser Automation
Status: COMPLETE

Delivered on current branch:
- Secure embedded browser window commands:
  - `browser_open`
  - `browser_navigate`
  - `browser_hide`
  - `browser_show`
  - `browser_get_url`
  - `browser_exec`
- Headless browser session commands:
  - `browser_open_session`
  - `browser_navigate_session`
  - `browser_get_content`
  - `browser_click`
  - `browser_fill`
  - `browser_screenshot`
  - `browser_evaluate_js`
  - `browser_close_session`
- URL scheme allowlist for `http` and `https`.
- Agent loop support for `action: "browser"` tool calls.

### Sprint 4.4 - Plugin Marketplace
Status: COMPLETE

Delivered:
- GitHub-hosted plugin registry fetch through `fetch_plugin_registry`.
- Marketplace metadata merge into `list_plugins`.
- Registry install/uninstall commands with GitHub-only download validation.
- Lua runtime reload after install/uninstall.
- Settings Marketplace UI with install state and registry refresh flow.

Security notes:
- Marketplace downloads are restricted to validated GitHub raw/plugin URLs.
- Plugin file names are validated to prevent path traversal.

### Sprint 4.5 - Desktop Computer Use Layer
Status: COMPLETE

Delivered:
- `computer_use.rs` command layer:
  - `computer_screenshot`
  - `computer_mouse_move`
  - `computer_mouse_click`
  - `computer_type`
  - `computer_key`
  - `computer_find_text`
- Approval-gated frontend flow before potentially dangerous actions.
- Agent tool integration for computer-use calls.
- OCR TSV parsing tests and input validation tests.

Remaining release smoke:
- Validate real screenshot/mouse/keyboard behavior on each target OS.
- Validate OCR availability when Tesseract is installed.

### Sprint 4.6 - Cloud Sync
Status: COMPLETE

Delivered:
- `sync.rs` encrypted sync module for memory records and saved chat sessions.
- AES-GCM payload encryption through `ring`.
- Commands:
  - `start_sync`
  - `get_sync_status`
  - `sync_now`
  - `configure_sync`
- Settings Sync panel with opt-in toggles, API URL, device ID, last sync, pending count, and conflict count.
- `sync_progress` events for collecting, pushing, pulling, merging, and done states.

Known boundary:
- The desktop client side is implemented.
- Production cloud API deployment remains a release/infrastructure task.

---

## Phase 5 - Horus: Collaboration and Companion Surfaces

### Sprint 5.1 - Real-Time Collaborative Workspaces
Status: COMPLETE

Delivered:
- Canvas collaboration host upgraded from one peer to a multi-peer LAN room.
- Host relays inbound peer messages to other connected peers.
- Sender IDs prevent local clients from applying their own echoed payloads.
- Workspace protocol carries:
  - live code sync
  - language sync
  - presence
  - invite metadata
  - shared chat
  - shared agent approval requests/responses
- Commands:
  - `canvas_collab_host`
  - `canvas_collab_join`
  - `canvas_collab_send`
  - `canvas_collab_broadcast`
  - `canvas_collab_status`
  - `canvas_collab_stop`
- Canvas Collab modal now includes workspace name, invite JSON, peer count, presence list, shared chat, and approval controls.

Deferred from original full scope:
- WebSocket transport.
- CRDT conflict-free text editing.
- QR image generation for invites.

Decision:
- The shipped Sprint 5.1 is the lean LAN-first MVP. WebSocket/CRDT should be a later hardening sprint if multi-device editing conflict behavior becomes a real user need.

### Sprint 5.2 - NEURODECK Mobile Companion
Status: PLANNED

Target:
- Native iOS/Android companion beyond the existing web remote.
- Push notifications for agent completion and scheduled tasks.
- Native voice-to-AI.
- Session browser and memory viewer.
- Approval surface for computer-use and shared agent actions.

Recommended MVP scope:
- Reuse current remote-control HTTP/WebSocket concepts.
- Build a minimal React Native or Expo client only after cloud sync and auth are stable.
- Start with read-only session/memory browsing plus approvals before adding command execution.

---

## Backlog Priority

Immediate integration backlog:
1. Integrate Sprint 3.3 Knowledge Graph from `origin/feature/sprint-3.3-knowledge-graph`.
2. Integrate Sprint 3.4 Task Scheduler from `origin/feature/sprint-3.4-scheduler`.
3. Audit and integrate Sprint 3.5 Git from `feature/sprint-3.5-git`.
4. Audit and integrate Sprint 4.1 Workflow from `feature/sprint-4.1-workflow`.
5. Audit and integrate Sprint 4.2 Orchestrator from `feature/sprint-4.2-orchestrator`.
6. Validate Sprint 4.3 browser automation on target machines with installed Chromium/Chrome.

Next net-new sprint:
1. Sprint 5.2 Mobile Companion App.

Release hardening backlog:
1. Run `npm run tauri dev` and smoke test every completed current-branch feature.
2. Validate Steam Deck 1280x800 layout for Canvas, Settings, Collab, Sync, and Computer Use.
3. Run `cargo clippy -- -D warnings` and either fix or document warnings.
4. Build production package with `npm run build` and platform package scripts.
5. Cut KFMS release tag only after the current integration branches are reconciled.

---

## Quick Reference Checklist

Current branch complete:
- [x] Sprint 3.1 Monaco Editor
- [x] Sprint 3.2 Whisper STT
- [x] Sprint 4.4 Plugin Marketplace
- [x] Sprint 4.5 Desktop Computer Use
- [x] Sprint 4.6 Cloud Sync
- [x] Sprint 5.1 Real-Time Collaborative Workspaces

Completed elsewhere, needs integration:
- [ ] Sprint 3.3 Knowledge Graph View
- [ ] Sprint 3.4 Task Scheduler
- [ ] Sprint 3.5 Git Integration
- [ ] Sprint 4.1 Workflow Visual Builder
- [ ] Sprint 4.2 Multi-Agent Orchestrator

Partial or follow-up:
- [x] Sprint 4.3 Browser Automation full headless tool layer
- [ ] Sprint 5.1 WebSocket/CRDT collaboration hardening

Planned:
- [ ] Sprint 5.2 Mobile Companion App

---

## KFMS Version Map

| Sprint | Version Line | Codename | Status |
|---|---:|---|---|
| 3.1 Monaco | v1.3.0 | Anubis | COMPLETE |
| 3.2 Whisper | v1.3.1 | Anubis | COMPLETE |
| 3.3 Knowledge Graph | v1.3.2 | Anubis | BRANCH-COMPLETE |
| 3.4 Scheduler | v1.3.3 | Anubis | BRANCH-COMPLETE |
| 3.5 Git | v1.3.4 | Anubis | BRANCH-COMPLETE |
| 4.1 Workflow | v2.0.0 | Osiris | BRANCH-COMPLETE |
| 4.2 Multi-Agent | v2.0.1 | Osiris | BRANCH-COMPLETE |
| 4.3 Browser Automation | v2.0.2 | Osiris | COMPLETE |
| 4.4 Marketplace | v2.0.3 | Osiris | COMPLETE |
| 4.5 Computer Use | v2.0.4 | Osiris | COMPLETE |
| 4.6 Cloud Sync | v2.0.5 | Osiris | COMPLETE |
| 5.1 Collaborative Workspaces | v2.5.0 | Horus | COMPLETE |
| 5.2 Mobile Companion | v2.5.1 | Horus | PLANNED |
