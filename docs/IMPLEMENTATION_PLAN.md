# NEURODECK — Implementation Plan
## Sprint Roadmap: v1.3 (Anubis) → v2.0 (Osiris)
### Last Updated: 2026-05-24 | KFMS: v1.2.x-Ra

---

> **Execution Model**: Solo-dev Agile — one sprint at a time, full files, no placeholders.
> Each sprint = 1 shippable feature. Commit after every sprint. Test in `npm run tauri dev`.
> See `CLAUDE.md` for build commands and hard constraints.

---

# CURRENT STATE BASELINE

All Phase 1 + Phase 2 features are shipped. The codebase is stable at v1.2.x (Ra).

```
Shipped Core:
✅ LLM Chat (Gemini + Ollama) with RAG
✅ Multi-agent profiles + live switching
✅ PTY shell (5 sessions) + SSH + FTP/SFTP
✅ Code canvas (HTML/Python/Bash/Lua/Markdown)
✅ Vector memory (CRUD + search + RAG injection)
✅ Autonomous agent loop (5-step)
✅ Remote control webapp (4-tab mobile UI)
✅ LAN P2P transfer + Warpinator gRPC
✅ Canvas TCP collaboration
✅ Lua plugin system (4 plugins)
✅ Gamepad navigation + radial menu + prompt picker
✅ Controller prompt picker (50+ templates)
✅ Persona system (9 built-in + custom)
✅ Theme system (6+ + custom)
✅ Prompt Lab (15 formulas)
✅ SteamOS tunnel
✅ Voice STT/TTS
✅ Onboarding wizard (6 slides)
✅ Boot sequence (cinematic)
✅ XSS hardening
✅ Security: URL allowlist + scheme check
✅ KFMS version governance
```

---

# PHASE 3 — CODENAME: ANUBIS (v1.3.x)
## Theme: IDE Layer + Intelligence Upgrade

---

## SPRINT 3.1 — Monaco Editor Integration
**Priority: HIGH | Estimated complexity: Medium**

### Goal
Replace the basic `<textarea>` in the canvas view with a full Monaco Editor instance
(the same engine as VSCode). Retain all existing language tabs and execution logic.

### What to Build

**Frontend changes (`frontend/src/main.js` + `frontend/src/app.css`)**:
- Load Monaco from CDN: `https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs/loader.js`
- Initialize `monaco.editor.create()` on the canvas container with the current language
- Wire language tab switches to `editor.getModel().setLanguage(lang)`
- Replace `canvasCode` textarea reads with `editor.getValue()`
- Wire `editor.onDidChangeModelContent()` for live HTML preview auto-refresh
- Add keyboard shortcut: `Ctrl+Enter` → run current canvas content
- Set Monaco theme to `vs-dark` with NEURODECK accent color overrides
- Inline AI edit: new button "✦ AI Edit" → sends selection + prompt to `invoke("ai_edit_code")` → applies diff

**Rust changes (`src-tauri/src/commands/`)**:
- Add `ai_edit_code { code: String, instruction: String, lang: String }` command
- Sends to active LLM: "Given this {lang} code, apply this instruction: {instruction}"
- Returns modified code string
- Register in `generate_handler![]`

**CSS**:
- `.canvas-editor-container { height: calc(100% - 96px); }` — Monaco fills panel
- Remove `textarea#canvas-code` height rules
- Add Monaco scrollbar styling to match NEURODECK theme

### Test Checklist
- [ ] Monaco loads without CDN errors in tauri dev
- [ ] Syntax highlighting works for HTML, Python, Bash, Lua, Markdown
- [ ] Run button still executes code correctly
- [ ] Live HTML preview still hot-reloads on change
- [ ] AI Edit button sends selection and applies response
- [ ] Theme matches NEURODECK dark palette
- [ ] Canvas collaboration still syncs (text sync must read from Monaco model)

---

## SPRINT 3.2 — Whisper STT Upgrade
**Priority: HIGH | Estimated complexity: Medium**

### Goal
Replace `arecord` + system transcription with local Whisper inference via `whisper-rs`
(Rust bindings to whisper.cpp). Dramatic improvement in transcription quality,
works offline, no cloud dependency.

### What to Build

**Rust changes**:
- Add `whisper-rs = "0.11"` to `Cargo.toml` (bundles whisper.cpp via bindgen)
- Download `ggml-base.en.bin` model to `data/models/whisper/` on first STT use
- New `whisper.rs` module:
  ```rust
  pub fn transcribe(audio_path: &str, model_path: &str) -> Result<String, String>
  ```
- `start_recording`: record to temp WAV file via `arecord` / Windows audio API
- `stop_recording`: call `whisper.rs::transcribe(wav_path, model_path)` → return text
- Emit `stt_progress` events: `{ status: "recording" | "transcribing" | "done" }`

**Frontend changes**:
- Listen for `stt_progress` → update mic button icon/animation accordingly
- Show "Transcribing..." spinner between stop and text return

**Model management**:
- `get_whisper_model_status` command: checks if model file exists + size
- Settings modal: "Download Whisper Base Model (148MB)" button → `download_whisper_model` command

### Test Checklist
- [ ] Records audio successfully
- [ ] Transcription returns meaningful text
- [ ] Progress events update UI correctly
- [ ] Settings shows model download status
- [ ] Falls back gracefully if model missing (shows download prompt)

---

## SPRINT 3.3 — Knowledge Graph View
**Priority: MEDIUM | Estimated complexity: High**

### Goal
Add a new `#view-graph` tab showing NEURODECK's vector memory as an interactive
force-directed knowledge graph. Users can explore concept relationships,
click nodes to open records, and see how their AI conversations are connected.

### What to Build

**Frontend — new view `frontend/src/graph_view.js`**:
- Load D3.js v7 from CDN
- `initGraphView()` — creates `<svg>` force simulation in `#view-graph`
- `loadGraphData()` — `invoke("get_memory_graph_data")` → `{ nodes, edges }`
- Node types: memory records (cyan), sessions (purple), personas (amber), tags (gray)
- Edge types: semantic similarity (solid), temporal (dashed), session-ref (dotted)
- Interactions:
  - Hover: show node preview tooltip
  - Click: open record in memory view or start chat with context
  - Drag: pin node position
  - Scroll: zoom
  - Double-click node: expand neighbors (load related records)
- Gamepad support: L-stick pan, R-stick zoom, A = select, B = back, X = expand

**Rust changes (`src-tauri/src/commands/memory.rs`)**:
- Add `get_memory_graph_data` command:
  ```rust
  pub struct GraphNode { pub id: String, pub label: String, pub node_type: String, pub weight: f32 }
  pub struct GraphEdge { pub source: String, pub target: String, pub similarity: f32 }
  pub struct GraphData { pub nodes: Vec<GraphNode>, pub edges: Vec<GraphEdge> }
  ```
- Compute edges: for each record pair with cosine_similarity > 0.6, create an edge
- Cap at top-50 nodes and top-100 edges (performance)

**CSS (`frontend/src/app.css`)**:
- `#view-graph svg` — full-size, dark background
- `.graph-node` — circle fills by type (cyan memory, purple session)
- `.graph-tooltip` — glass card positioned on hover
- `.graph-edge` — stroke-width by similarity, opacity on dim

**HTML (in main.js view template)**:
- Add `<div class="nav-tab" data-view="graph">⬡ Graph</div>` to nav
- Add `<div class="view-content" id="view-graph">...</div>`

### Test Checklist
- [ ] Graph view tab appears and is navigable
- [ ] Nodes render for memory records
- [ ] Edges connect semantically similar records
- [ ] Hover tooltip shows record text preview
- [ ] Click opens record in memory view
- [ ] Gamepad pan/zoom works
- [ ] Performance is acceptable with 50+ nodes

---

## SPRINT 3.4 — Task Scheduler
**Priority: MEDIUM | Estimated complexity: Medium**

### Goal
Add cron-style scheduled task execution. Users define recurring agent goals
(e.g. "every morning at 9am, summarize my notes") that run automatically.

### What to Build

**Rust changes**:
- Add `tokio-cron-scheduler = "0.9"` to `Cargo.toml`
- New `scheduler.rs` module:
  ```rust
  pub struct ScheduledTask { pub id: String, pub name: String, pub cron: String,
                             pub goal: String, pub enabled: bool, pub last_run: Option<String> }
  pub struct SchedulerState { pub scheduler: JobScheduler, pub tasks: Vec<ScheduledTask> }
  ```
- `AppState.scheduler: Arc<Mutex<SchedulerState>>`
- Commands: `list_scheduled_tasks`, `add_scheduled_task`, `delete_scheduled_task`,
  `toggle_scheduled_task`, `run_task_now`
- On task fire: invoke agent loop with task goal, emit `scheduled_task_started { id, name }`
- Persist tasks to `data/scheduler/tasks.json`

**Frontend — `frontend/src/scheduler_view.js`**:
- New `#view-scheduler` tab (add to nav, add to radial menu replacing least-used item)
- List of scheduled tasks: name, cron expression, last run, enabled toggle, run now, delete
- "Add Task" form: name, cron (with human-readable preview), goal text
- `listen("scheduled_task_started")` → notification + agent log highlight
- Gamepad: D-pad select, A toggle, X run now, Y add new, B delete

**CSS**: `.scheduler-task-card`, `.scheduler-cron-input`, `.scheduler-human-label`

### Test Checklist
- [ ] Can add a scheduled task with cron expression
- [ ] Cron fires correctly (test with `*/1 * * * *` = every minute)
- [ ] Task runs the agent loop with the goal
- [ ] Notification appears when task starts
- [ ] Tasks persist across app restarts
- [ ] Enable/disable toggle works

---

## SPRINT 3.5 — Git Integration
**Priority: MEDIUM | Estimated complexity: Medium**

### Goal
Add basic Git operations (status, diff, commit, log) accessible from the canvas and
terminal views. Auto-generate commit messages via LLM.

### What to Build

**Rust changes**:
- Add `git2 = "0.18"` to `Cargo.toml`
- New `git.rs` module:
  ```rust
  pub struct GitStatus { pub path: String, pub staged: Vec<String>,
                         pub unstaged: Vec<String>, pub untracked: Vec<String> }
  pub struct GitCommit { pub hash: String, pub message: String, pub author: String, pub timestamp: String }
  ```
- Commands: `git_status { path }`, `git_diff { path, file }`, `git_log { path, limit }`,
  `git_stage { path, files }`, `git_commit { path, message }`, `generate_commit_message { diff }`
- `generate_commit_message`: sends diff to active LLM with conventional commit prompt

**Frontend — git panel in canvas view**:
- "⑂ Git" button in canvas header → toggles slide-in git panel
- Git panel shows: branch name, changed files list (staged/unstaged), diff preview
- "Stage All" / "Stage Selected" buttons
- Commit message input (pre-filled by `generate_commit_message`)
- "Commit" button → `invoke("git_commit")`
- Log tab: list of recent commits with hash + message

**CSS**: `.git-panel`, `.git-file-list`, `.git-diff-preview`, `.git-commit-input`

### Test Checklist
- [ ] `git_status` returns correct changed files for a real git repo
- [ ] Diff view shows file changes
- [ ] LLM generates a meaningful conventional commit message
- [ ] Commit succeeds and appears in log
- [ ] Panel opens/closes cleanly without breaking canvas layout

---

# PHASE 4 — CODENAME: OSIRIS (v2.0.x)
## Theme: Orchestration + Autonomy

---

## SPRINT 4.1 — Workflow Visual Builder
**Priority: HIGH | Estimated complexity: High**

### Goal
A visual node editor where users drag-and-drop automation nodes to create
multi-step AI workflows. Similar to n8n, but AI-native and gamepad-friendly.

### What to Build

**Frontend — `frontend/src/workflow_view.js`**:
- Canvas with SVG node graph (no third-party dependency — custom D3-based)
- Node types:
  - **LLM Node**: send prompt to active agent → output text
  - **Shell Node**: run shell command → output stdout
  - **File Node**: read/write a file
  - **HTTP Node**: GET/POST to URL
  - **Condition Node**: if/else branch on content
  - **Memory Node**: store to / search from vector DB
  - **Notify Node**: send desktop notification
  - **Delay Node**: wait N seconds
- Edges connect output of one node to input of next
- Toolbar: run workflow, stop, save, load, schedule
- Node inspector panel (click node → configure properties)
- Live execution highlighting: nodes glow when active, green on success, red on fail

**Rust changes**:
- New `workflow.rs` module — parses and executes workflow YAML/JSON
- `WorkflowEngine` runs nodes in topological order
- Emits `workflow_node_started { id }`, `workflow_node_done { id, output }`,
  `workflow_node_error { id, error }` events
- Commands: `run_workflow`, `stop_workflow`, `save_workflow`, `load_workflow`,
  `list_workflows`, `delete_workflow`

**Persistence**: `data/workflows/*.json` — save node graph as serialized JSON

### Test Checklist
- [ ] Can place and connect nodes
- [ ] Run executes nodes in dependency order
- [ ] LLM node calls active agent and passes output to next node
- [ ] Shell node executes and captures output
- [ ] Condition node branches correctly
- [ ] Live highlighting shows execution progress
- [ ] Workflow saves and loads correctly

---

## SPRINT 4.2 — Multi-Agent Orchestrator
**Priority: HIGH | Estimated complexity: High**

### Goal
Upgrade the single-agent loop to a true multi-agent coordinator where
specialized agents run in parallel, communicate via message bus, and
coordinate toward a shared goal.

### Architecture

```
User Goal: "Build a REST API for a todo app"
     │
     ▼
Coordinator (orchestrator agent — uses LLM to plan)
     │
     ├── Agent A (Development) → generates Rust code
     ├── Agent B (Testing) → writes tests for Agent A's output
     └── Agent C (Documentation) → generates README
     │
     ▼
Coordinator aggregates results → presents to user
```

### What to Build

**Rust changes**:
- New `orchestrator.rs` module:
  ```rust
  pub struct AgentTask { pub agent_id: String, pub role: String,
                         pub goal: String, pub context: Option<String> }
  pub struct OrchestratorPlan { pub tasks: Vec<AgentTask>, pub dependencies: Vec<(String, String)> }
  ```
- `plan_agent_tasks(goal, available_agents)` — LLM call that returns `OrchestratorPlan`
- Parallel task execution via `tokio::spawn` per agent
- Message bus: `tokio::sync::mpsc` channels between agents
- Result aggregation and final synthesis LLM call
- Commands: `start_orchestrated_task { goal }`, `get_orchestration_status`,
  `stop_orchestration`
- Events: `orchestrator_plan_ready { plan }`, `agent_task_started { agent_id, role }`,
  `agent_task_done { agent_id, result }`, `orchestration_complete { summary }`

**Frontend — Multi-Agent Dashboard**:
- New view or upgrade to existing `#view-agent`
- Grid of agent cards showing: identity, current task, step, status (idle/running/done)
- Live update via events
- Timeline view: horizontal swimlanes per agent, steps as blocks
- "Start Orchestrated Task" input → orchestrator takes over

### Test Checklist
- [ ] Coordinator generates a valid plan for a complex goal
- [ ] Multiple agents execute in parallel (check timestamps)
- [ ] Inter-agent context sharing works (Agent B receives Agent A's output)
- [ ] UI shows all agents simultaneously
- [ ] Final synthesis produces coherent result
- [ ] Can stop mid-execution cleanly

---

## SPRINT 4.3 — Browser Automation
**Priority: HIGH | Estimated complexity: High**

### Goal
Add a headless browser that agents can control — navigate URLs, extract content,
fill forms, take screenshots, execute JavaScript.

### What to Build

**Rust changes**:
- Add `chromiumoxide = "0.5"` or `playwright` Rust bindings to `Cargo.toml`
- New `browser_automation.rs` module:
  ```rust
  pub struct BrowserSession { pub id: String, pub url: String }
  ```
- Commands:
  - `browser_open_session { url }` → returns session_id
  - `browser_navigate_session { session_id, url }`
  - `browser_get_content { session_id }` → returns HTML
  - `browser_click { session_id, selector }`
  - `browser_fill { session_id, selector, value }`
  - `browser_screenshot { session_id }` → returns base64 PNG
  - `browser_evaluate_js { session_id, script }` → returns result
  - `browser_close_session { session_id }`
- Agent tool calls: browser commands are available as agent tools
  (agent can call `browser_open` → `browser_get_content` → reason about HTML → `browser_click`)

**Frontend**:
- Browser view enhancement: show automation status overlay when agent is controlling browser
- Screenshot preview in agent log when `browser_screenshot` is called
- "Hand over to agent" button in browser view — gives active agent control of current page

### Test Checklist
- [ ] Can open a headless session and navigate to a URL
- [ ] Content extraction returns readable HTML/text
- [ ] Agent can use browser as a tool (search + extract + reason)
- [ ] Screenshot appears in agent log
- [ ] Form filling works on a test form page
- [ ] Sessions clean up on close

---

## SPRINT 4.4 — Plugin Marketplace
**Priority: MEDIUM | Estimated complexity: Medium**

### Goal
A built-in plugin marketplace backed by a GitHub-hosted JSON registry.
Users browse, preview, install, and manage community Lua plugins
without leaving NEURODECK.

### What to Build

**Registry format** (`https://raw.githubusercontent.com/khaoticdev62/neurodeck-plugins/main/registry.json`):
```json
{
  "plugins": [
    {
      "id": "weather",
      "name": "Weather Lookup",
      "author": "khaoticdev",
      "version": "1.0.0",
      "description": "Adds /weather command using wttr.in API",
      "tags": ["utility", "api"],
      "download_url": "...",
      "lua_file": "weather.lua"
    }
  ]
}
```

**Rust changes**:
- Add `fetch_plugin_registry` command: HTTP GET to registry URL → parse JSON
- `install_plugin_from_registry { plugin_id }`: download Lua file → save to `plugins/` → reload Lua runtime
- `uninstall_plugin { plugin_id }`: delete file + reload
- Update `list_plugins` to include registry metadata (name, description, author)

**Frontend — Plugin Marketplace tab in Settings modal**:
- Tabbed Settings: [General] [LLM] [Plugins] [Marketplace] [Themes]
- Marketplace tab: search bar + tag filter + grid of plugin cards
- Plugin card: name, author, description, tags, Install button
- Installed indicator on already-installed plugins
- "Refresh Registry" button

### Test Checklist
- [ ] Registry fetches successfully (real or mock URL)
- [ ] Plugins display in marketplace with correct metadata
- [ ] Install downloads Lua file to plugins/ directory
- [ ] Plugin is active after install (command appears)
- [ ] Uninstall removes file and command disappears
- [ ] Already-installed plugins show "Installed" state

---

## SPRINT 4.5 — Desktop Computer Use Layer
**Priority: MEDIUM | Estimated complexity: Very High**

### Goal
Enable NEURODECK agents to control the desktop — take screenshots, move the mouse,
click UI elements, type into any application. Enables true autonomous RPA.

### What to Build

**Rust changes**:
- Linux: use `xdotool` subprocess for mouse/keyboard
- Windows: use `enigo = "0.2"` crate (SendInput)
- New `computer_use.rs` module:
  ```rust
  pub fn screenshot() -> Result<Vec<u8>, String>  // PNG bytes
  pub fn mouse_move(x: i32, y: i32) -> Result<(), String>
  pub fn mouse_click(button: &str) -> Result<(), String>
  pub fn keyboard_type(text: &str) -> Result<(), String>
  pub fn keyboard_key(key: &str) -> Result<(), String>
  pub fn find_element_by_text(text: &str) -> Result<(i32, i32), String>  // OCR
  ```
- OCR: `leptess = "0.14"` (Tesseract bindings) for text → coordinate mapping
- Commands: `computer_screenshot`, `computer_mouse_move`, `computer_mouse_click`,
  `computer_type`, `computer_key`, `computer_find_text`
- Agent tool integration: all computer_use commands available as agent tools
- **Safety gate**: each computer_use tool call requires confirmation unless
  user has enabled "Auto-approve computer use" in settings

**Frontend**:
- Computer use approval modal: shows screenshot with highlighted target area
- "Approve" / "Deny" / "Approve All for this session" buttons
- Live screenshot feed in agent log when computer use is active

### Test Checklist
- [ ] Screenshot captures current desktop
- [ ] Mouse move and click work on a test application
- [ ] Keyboard type works in a text field
- [ ] OCR finds text and returns coordinates
- [ ] Approval gate appears before each action
- [ ] Agent successfully navigates a simple desktop workflow

---

## SPRINT 4.6 — Cloud Sync (Memory + Sessions)
**Priority: MEDIUM | Estimated complexity: High**

### Goal
Encrypted cloud sync for memory records and chat sessions.
Users log in with Google OAuth (already wired) and sync their
intelligence across devices.

### Backend Architecture

```
Sync flow:
NEURODECK local DB
     │ delta (changed records since last_sync_at)
     │ encrypt (user-derived key from OAuth token)
     ▼
NEURODECK Sync API (Rust backend, Railway/Fly.io)
     │ store encrypted blobs
     │ return remote delta
     ▼
NEURODECK on device B
     │ download + decrypt delta
     │ merge (last-write-wins, conflict flag on diverge)
     ▼
Local DB updated
```

**Rust changes**:
- New `sync.rs` module
- `SyncRecord { id, type, payload_encrypted, device_id, timestamp }`
- AES-256-GCM encryption with key derived from OAuth access token
- Commands: `start_sync`, `get_sync_status`, `sync_now`,
  `configure_sync { enabled, sync_memory, sync_sessions }`
- Settings: sync toggle, last sync timestamp, device count, conflict count

**Cloud API** (separate minimal Rust/Axum server):
- `POST /sync/push` — accept encrypted records
- `GET /sync/pull?since=` — return remote delta
- `POST /sync/auth` — validate OAuth token
- Deploy to Railway with PostgreSQL

### Test Checklist
- [ ] OAuth login works (already wired in infrastructure/)
- [ ] Memory records sync to cloud after opt-in
- [ ] Second device receives synced records
- [ ] Encryption is applied (server cannot read plaintext)
- [ ] Conflict detection marks diverged records
- [ ] Settings show sync status and last sync time

---

# PHASE 5 — CODENAME: HORUS (v2.5.x)
## Theme: Collaboration + Marketplace

---

## SPRINT 5.1 — Real-Time Collaborative Workspaces
**Priority: MEDIUM | Estimated complexity: Very High**

- Multi-user chat sessions with shared context
- Collaborative canvas editing (upgrade TCP collab to WebSocket + CRDT)
- User presence indicators
- Shared agent runs with approval from any member
- Invite via QR code (extend remote control system)

## SPRINT 5.2 — NEURODECK Mobile Companion (React Native)
**Priority: LOW | Estimated complexity: High**

- Native iOS/Android app (beyond current web-based remote control)
- Push notifications for agent completion, scheduled tasks
- Voice-to-AI (native microphone)
- Session browser and memory viewer
- Approves computer use actions from phone

---

# PRIORITIZED BACKLOG (Quick Reference)

```
URGENT (do next):
[ ] Monaco Editor (Sprint 3.1)
[ ] Whisper STT (Sprint 3.2)

HIGH (after urgent):
[ ] Knowledge Graph View (Sprint 3.3)
[ ] Git Integration (Sprint 3.5)
[ ] Task Scheduler (Sprint 3.4)

MEDIUM (v2.0 milestone):
[ ] Workflow Visual Builder (Sprint 4.1)
[ ] Multi-Agent Orchestrator (Sprint 4.2)
[ ] Browser Automation (Sprint 4.3)
[ ] Plugin Marketplace (Sprint 4.4)

LOWER (post v2.0):
[ ] Desktop Computer Use (Sprint 4.5)
[ ] Cloud Sync (Sprint 4.6)
[ ] Real-Time Collaboration (Sprint 5.1)
[ ] Mobile Companion App (Sprint 5.2)
```

---

# SPRINT EXECUTION RULES

1. **One sprint at a time** — start Sprint 3.1, finish it completely before 3.2
2. **Full files** — never truncate output, always complete functions
3. **Test in `npm run tauri dev`** — never mark complete without running
4. **Commit after every sprint** — message format: `feat(v1.3): sprint 3.x — description`
5. **No regressions** — run `cargo check` before commit; 0 errors required
6. **CSS specificity** — never add `display: flex` to `#view-*` ID rules
7. **Memory safety** — no `unwrap()` in Tauri handlers; use `map_err(|e| e.to_string())?`
8. **KFMS compliance** — stamp `meta.json` with new SHA after each sprint

---

# DEFINITION OF DONE (PER SPRINT)

A sprint is complete when:
- [ ] All listed test checklist items pass in `npm run tauri dev`
- [ ] `cargo check` returns 0 errors, 0 warnings (or warnings documented as acceptable)
- [ ] `npm run --prefix frontend build` succeeds
- [ ] New Tauri commands registered in `generate_handler![]`
- [ ] No CSS specificity traps introduced
- [ ] Commit pushed to `origin/master`
- [ ] `CLAUDE.md` updated if new architectural patterns introduced
- [ ] KFMS `meta.json` stamped

---

# KFMS VERSION MAP

| Sprint | Version | Tag |
|---|---|---|
| 3.1 Monaco | v1.3.0 | v1.3.0-anubis |
| 3.2 Whisper | v1.3.1 | v1.3.1-anubis |
| 3.3 Graph | v1.3.2 | v1.3.2-anubis |
| 3.4 Scheduler | v1.3.3 | v1.3.3-anubis |
| 3.5 Git | v1.3.4 | v1.3.4-anubis |
| 4.1 Workflow | v2.0.0 | v2.0.0-osiris |
| 4.2 Multi-Agent | v2.0.1 | v2.0.1-osiris |
| 4.3 Browser Auto | v2.0.2 | v2.0.2-osiris |
| 4.4 Marketplace | v2.0.3 | v2.0.3-osiris |
| 4.5 Computer Use | v2.0.4 | v2.0.4-osiris |
| 4.6 Cloud Sync | v2.0.5 | v2.0.5-osiris |
