# NEURODECK Implementation Plan
## Sprint Roadmap and Integration Ledger
### Last Updated: 2026-05-29 | KFMS: v1.6.0-bastet | Active Branch: `master`

---

## KFMS Snapshot

<!-- KFMS:PLAN_SNAPSHOT:BEGIN -->
- Version: `1.8.0`
- Codename: `Ptah`
- Tag: `v1.8.0-ptah`
- Workspace state: `manual-uncommitted`
- Last stamped build: `2026-06-14T02:30:17Z`
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
- Git integration panel (status, diff, stage, commit, log, branch, remote, SSH key management).
- Knowledge Graph visualization (D3.js force-directed memory graph).
- Task Scheduler (cron-style agent runs with tokio-cron-scheduler).
- Workflow Visual Builder (drag-drop automation with node-based editor).
- API Lab (HTTP request builder with collections, curl import/export).
- CLI Maker (custom command builder with hooks and Lua export).
- IDE tab (workspace file explorer, tabbed Monaco editor, output panel).
- Command Palette (`Ctrl+K` fuzzy search across views, commands, and plugins).
- **JPE Diagnostics & Manual UI** (searchable, collapsible manual with real-time capability health checks).
- **Hermes 3 Native Integration** (built-in agent, `plugins/hermes.lua` extension, and advanced reasoning persona).

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
| 3.1 | Monaco Editor Integration | COMPLETE | `frontend/src/canvas.js`, `frontend/src/app.css`, IDE tab |
| 3.2 | Whisper STT Upgrade | COMPLETE | `src-tauri/src/whisper.rs`, Settings Whisper panel |
| 3.3 | Knowledge Graph View | COMPLETE | `frontend/src/graph_view.js`, `get_memory_graph_data` command, Graph tab |
| 3.4 | Task Scheduler | COMPLETE | `src-tauri/src/scheduler.rs`, `scheduler::*` commands, Scheduler tab |
| 3.5 | Git Integration | COMPLETE | `src-tauri/src/commands/git.rs`, 20+ git commands, Git tab |
| 4.1 | Workflow Visual Builder | COMPLETE | `src-tauri/src/workflow.rs`, `workflow::*` commands, Workflow tab |
| 4.2 | Multi-Agent Orchestrator | COMPLETE | `src-tauri/src/orchestrator.rs`, `#view-orchestrator` node builder, and Agent tab integration |
| 4.3 | Browser Automation | COMPLETE | `src-tauri/src/commands/browser.rs`, headless + embedded browser commands |
| 4.3 | Command Palette | COMPLETE | `frontend/src/main.js` palette overlay, `Ctrl+K`, fuzzy search |
| 4.4 | Plugin Marketplace | COMPLETE | `src-tauri/src/plugin_mgr.rs`, Settings Marketplace UI |
| 4.5 | Desktop Computer Use | COMPLETE | `src-tauri/src/computer_use.rs`, approval UI, agent tool wiring |
| 4.6 | Cloud Sync | COMPLETE | `src-tauri/src/sync.rs`, Settings Sync UI |
| 5.1 | Real-Time Collaborative Workspaces | COMPLETE | `src-tauri/src/canvas_collab.rs`, multi-peer LAN workspace UI |
| 5.2 | Mobile Companion App | PLANNED | Native iOS/Android app not started |
| 5.4 | JPE Diagnostics & Manual UI | COMPLETE | `frontend/src/main.js`, `#manual-modal` |
| 5.5 | Hermes 3 Native Integration | COMPLETE | `src-tauri/src/lib.rs`, `plugins/hermes.lua`, `main.js` |

---

## Phase 3 - Isis: IDE Layer and Intelligence Upgrade

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
Status: COMPLETE

Current state:
- Frontend: `frontend/src/graph_view.js` with D3.js force-directed graph.
- Backend: `get_memory_graph_data` command returns node/edge data from the vector DB.
- UI: Graph tab (`#view-graph`) with navigation and gamepad support.

Remaining release smoke:
- Validate graph render performance with 500+ memory records.
- Confirm click-to-jump-to-chat-context works.

### Sprint 3.4 - Task Scheduler
Status: COMPLETE

Current state:
- Backend: `src-tauri/src/scheduler.rs` with tokio-cron-scheduler.
- Commands: `list_scheduled_tasks`, `add_scheduled_task`, `delete_scheduled_task`, `toggle_scheduled_task`, `run_task_now`.
- UI: Scheduler tab (`#view-scheduler`) with add/toggle/run/delete controls.

Remaining release smoke:
- Validate persistence across app restarts.
- Confirm scheduled agent runs use the current `send_command` path with RAG injection.

### Sprint 3.5 - Git Integration
Status: COMPLETE

Current state:
- Backend: `src-tauri/src/commands/git.rs` (700 lines) with full git2 bindings.
- Commands: status, diff, stage, unstage, discard, commit, log, branch, checkout, push, pull, fetch, remote, SSH key generation, credential store, LLM commit message generation.
- UI: Git tab (`#view-git`) with two-pane layout.

Remaining release smoke:
- Validate on real repositories (stage → commit → push flow).
- Confirm SSH key generation and credential storage work across OS keychains.

---

## Phase 4 - Osiris: Orchestration and Autonomy

### Sprint 4.1 - Workflow Visual Builder
Status: COMPLETE

Current state:
- Backend: `src-tauri/src/workflow.rs` with node-based execution engine.
- Commands: `list_workflows`, `load_workflow`, `save_workflow`, `delete_workflow`.
- UI: Workflow tab (`#view-workflow`) with drag-drop node editor.

Remaining release smoke:
- Audit workflow execution for shell/file/HTTP safety.
- Validate 1280×800 layout with 8+ nodes.

### Sprint 4.2 - Multi-Agent Orchestrator
Status: COMPLETE

Current state:
- Backend: `src-tauri/src/orchestrator.rs` with task decomposition and parallel agent execution.
- Commands: `start_orchestrated_task`, `get_orchestration_status`, `stop_orchestration`, plus pipeline persistence logic.
- Frontend: Dedicated `#view-orchestrator` tab (visual Multi-Agent Pipeline Builder) with drag-and-drop nodes.
- Secondary UI: Native integration into the Agent tab (`#view-agent`) for "Auto-Plan" mode and real-time status tracking.
- Navigation: Accessible via standard sidebar tabs, radial menu (`network` icon), and Command Palette.

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

### Immediate Hardening (v1.3.0-Isis Blockers)
1. **Orchestrator Frontend** — Build `#view-orchestrator` tab or integrate into Agent tab as "Orchestrate" mode.
2. **Command Palette Hardening** — Verify fuzzy search covers all 19 views and plugin commands; test gamepad invocation.
3. **FTP Streaming + Progress** — Replace `retr_as_buffer` with disk stream; emit progress events.
4. **`pty_spawn` Timeout** — Add 30s timeout with auto-cleanup for hung SSH handshakes.
5. **Config Path Migration** — Move from `../llm-term.toml` fallback to `app_config_dir()` with auto-migration.
6. **Canvas Run UX** — Wire Python/Bash Run button to existing `pty_execute` path.

### Release Validation
1. Run `npm run tauri dev` and smoke test every view (19 tabs + palette + radial menu).
2. Validate Steam Deck 1280×800 layout for all views, especially new Git, Graph, Scheduler, Workflow, and IDE tabs.
3. Run `cargo clippy` and fix or document warnings.
4. Build production AppImage (`scripts/shell/build_appimage.sh`) and verify on SteamOS.
5. Cut KFMS release tag `v1.3.0-isis` after all blockers pass.

### Sprint 5.3 - Multi-LSP Client (v1.3.x / Isis)

**Status:** Shipped — integrated into Mini IDE view

**Scope:**
- `src-tauri/src/lsp.rs` — LspManager, stdio JSON-RPC framing, Content-Length parser, reader/writer tasks, multi-server lifecycle, diagnostics routing via Tauri events
- `frontend/src/lsp_client.js` — frontend LSP client: server config persistence, document sync (open/change/close), completions popup, hover tooltip, diagnostic rendering
- `frontend/src/ide_view.js` — IDE integration: switchTab notifies LSP, save syncs LSP, duplicate listener guard, deactivateIdeView teardown
- `frontend/src/settings.js` — LSP settings panel (toggle servers, configure executables, start/stop)
- Supported servers: rust-analyzer, pylsp, typescript-language-server, lua-language-server, clangd, gopls, bash-language-server
- AAAA audit pass: Windows URI fix, mutex poison recovery, path traversal pre-validation, ARIA roles on completions/hover/status bar

### Sprint 5.4 - JPE Diagnostics & Manual UI (v1.4.0 / Osiris)
**Status:** Shipped

**Scope:**
- **Frontend:** Searchable, collapsible accordion UI for the User Manual.
- **Diagnostics:** Real-time health metrics checking PTY binaries, network connectivity, and keychain access directly inside the modal.

### Sprint 5.5 - Hermes 3 Native Integration (v1.4.0 / Osiris)
**Status:** Shipped

**Scope:**
- **Backend (`lib.rs`):** Added `hermes3:8b` native agent to `default_agents()` and created the advanced reasoning `Hermes` persona.
- **Frontend:** Updated placeholders and settings to feature `hermes3:8b`.
- **Plugin:** Bundled `plugins/hermes.lua` extension to instantly load the Hermes persona via `/hermes` and provide setup instructions via `/hermes_config`.

### Next Net-New Sprint (v1.5+ / Horus)
1. Mobile Companion App (Sprint 5.2) — deferred until cloud sync auth is production-stable.

---

## Development Workflow — PromptFlow Integration

As of v1.8.0-ptah, all development work is driven through the **Production Code Prompt System** (`production_code_prompt_system/`). This replaces ad-hoc AI prompting with a structured, repeatable, auditable workflow.

### What changed
- `promptflow.yaml` at repo root defines NEURODECK-specific config + custom sequences.
- npm scripts added: `npm run promptflow:audit`, `npm run promptflow:security`, `npm run promptflow:release`, etc.
- Wrapper scripts: `scripts/promptflow-run.sh` (Unix) and `scripts/promptflow-run.ps1` (Windows).
- `AGENTS.md` updated with PromptFlow as the canonical development workflow.

### Custom sequences for NEURODECK
| Sequence | Stages | Use When |
|---|---|---|
| `audit-only` | 14 → 01 | Starting a new feature or refactor |
| `security` | 14 → 03 → 13 → 12 → 04 | After security-sensitive changes |
| `refactor` | 14 → 01 → 04 → 06 → 07 → 15 | Deep refactoring work |
| `frontend` | 14 → 11 → 05 → 04 → 10 | UI/UX focused work |
| `build-repair` | 14 → 08 → 09 → 10 | CI/CD or dependency issues |
| `release-certification` | 14 → 15 | Before cutting a release tag |
| `rust-only` | 14 → 01 → 03 → 04 → 06 → 12 → 15 | Backend-only changes |
| `electron-only` | 14 → 01 → 11 → 05 → 04 → 10 → 15 | Frontend-only changes |
| `pre-release` | 14 → 01 → 03 → 04 → 08 → 09 → 15 | Comprehensive pre-release gate |
| `quick-check` | 14 → 01 → 15 | Fast sanity check |

### How to use
```bash
# Manual mode (default) — writes prompt to file, you paste into AI tool
npm run promptflow:audit

# Or use a provider for automatic execution
python -m promptflow run --sequence pre-release --provider openai

# Review results
npm run promptflow:report
npm run promptflow:export   # zip the full run package
```

### Rule
**No release is certified without a PromptFlow run.** The `release-certification` or `pre-release` sequence must output `APPROVED` or `APPROVED WITH WARNINGS` before tagging.

---

## Quick Reference Checklist

Current branch complete:
- [x] Sprint 3.1 Monaco Editor
- [x] Sprint 3.2 Whisper STT
- [x] Sprint 3.3 Knowledge Graph View
- [x] Sprint 3.4 Task Scheduler
- [x] Sprint 3.5 Git Integration
- [x] Sprint 4.1 Workflow Visual Builder
- [x] Sprint 4.2 Multi-Agent Orchestrator
- [x] Sprint 4.3 Browser Automation
- [x] Sprint 4.4 Plugin Marketplace
- [x] Sprint 4.5 Desktop Computer Use
- [x] Sprint 4.6 Cloud Sync
- [x] Sprint 5.1 Real-Time Collaborative Workspaces
- [x] Sprint 5.3 Multi-LSP Client
- [x] Sprint 5.4 JPE Diagnostics & Manual UI
- [x] Sprint 5.5 Hermes 3 Native Integration

Partial or follow-up:
- [ ] Sprint 5.1 WebSocket/CRDT collaboration hardening

Planned:
- [ ] Sprint 5.2 Mobile Companion App

---

## KFMS Version Map

| Sprint | Version Line | Codename | Status |
|---|---:|---|---|
| 3.1 Monaco | v1.3.0 | Isis | COMPLETE |
| 3.2 Whisper | v1.3.0 | Isis | COMPLETE |
| 3.3 Knowledge Graph | v1.3.0 | Isis | COMPLETE |
| 3.4 Scheduler | v1.3.0 | Isis | COMPLETE |
| 3.5 Git | v1.3.0 | Isis | COMPLETE |
| 4.1 Workflow | v1.3.0 | Isis | COMPLETE |
| 4.2 Multi-Agent | v1.3.0 | Isis | COMPLETE |
| 4.3 Browser Automation | v1.3.0 | Isis | COMPLETE |
| 4.3 Command Palette | v1.3.0 | Isis | COMPLETE |
| 4.4 Marketplace | v1.3.0 | Isis | COMPLETE |
| 4.5 Computer Use | v1.3.0 | Isis | COMPLETE |
| 4.6 Cloud Sync | v1.3.0 | Isis | COMPLETE |
| 5.1 Collaborative Workspaces | v1.3.0 | Isis | COMPLETE |
| 5.3 Multi-LSP Client | v1.3.0 | Isis | COMPLETE |
| 5.4 JPE Diagnostics & Manual UI | v1.4.0 | Osiris | COMPLETE |
| 5.5 Hermes 3 Integration | v1.4.0 | Osiris | COMPLETE |
| 5.2 Mobile Companion | v1.5.0+ | Horus | PLANNED |
