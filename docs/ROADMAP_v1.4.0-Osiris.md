# NEURODECK v1.4.0 Roadmap — Osiris
**Theme:** Resurrection — Surface the Hidden Layer  
**KFMS Codename:** Osiris (MINOR line 4)  
**Target Tag:** `v1.4.0-osiris`  
**Baseline:** `v1.3.0-isis` (master, 2026-05-27)  
**Constraint:** Zero bloat. Every item must reach production-ready status — no shipping dark.

---

## Release Philosophy

v1.3.0 (Isis) completed the control layer: all views wired, all gaps closed, AAAA premium CSS across every surface.

**v1.4.0 (Osiris) resurrects what was buried alive.**

Six frontend modules were committed to `frontend/src/` but never fully surfaced:
`workflow_view.js`, `api_lab.js`, `cli_maker.js`, `torrent.js`, `remote_control_view.js`, `ctrl_prompt.js`.

Four backend command modules exist with no full frontend counterpart:
`commands/api_lab.rs`, `commands/cli_maker.rs`, `commands/ide.rs`, plus the multi-agent orchestrator commands in `commands/agent.rs`.

Osiris **does not add new product surfaces.** It finishes what was started, hardens the data layer, and ships the P2P distribution pipeline.

| In Scope | Out of Scope (defer to v1.5+) |
|---|---|
| Workflow Visual Builder (production) | Mobile Companion App (iOS/Android) |
| Multi-Agent Orchestrator View | Cloud Sync Server (managed backend) |
| API Lab (full HTTP client) | Docker/WASM sandboxed runtimes |
| CLI Maker (full visual CLI builder) | Qdrant migration (v2.0 data-layer) |
| Remote Control (full session relay) | Wake Word / VAD |
| Torrent/P2P Distribution pipeline | gRPC streaming to external agents |
| CRDT Canvas Collaboration | |
| Advanced Memory Namespace UI | |

---

## P0 — Primary Release Blockers

These ship in v1.4.0 or the release does not cut.

---

### 1. Multi-Agent Orchestrator View

**Status:** Backend commands live in `commands/agent.rs`. Frontend view: **missing**.  
**Why P0:** Was deferred at the last moment in v1.3.0 — the backend is fully wired and the missing tab is the largest visible gap in the product.

**Acceptance criteria:**
- New `#view-orchestrator` tab in the nav strip and radial menu (segment 13).
- Visual pipeline canvas: drag-and-drop agent nodes with connection arrows (rendered via inline SVG, no external lib).
- Each node: agent selector (persona dropdown), input prompt field, output display card.
- "Run Pipeline" button → streams results step-by-step via existing `agent_loop` events.
- Pause / Resume / Cancel controls. Max 10 nodes per pipeline.
- Pipelines serialized to `data/orchestrator/pipelines.json` via new `save_pipeline` / `load_pipeline` Tauri commands.
- Radial menu updated to 13 segments.

**Files:** `frontend/src/orchestrator.js` (new), `main.js` (tab template + nav wiring), `src-tauri/src/commands/agent.rs` (add `save_pipeline`, `load_pipeline`), `lib.rs` (register handlers).

---

### 2. Workflow Visual Builder — Production Pass

**Status:** `workflow_view.js` and `workflow.rs` wired but the builder is unpolished (no visual node editor, no export, no trigger system).  
**Why P0:** Registered in the Command Palette and radial menu — users land on it. Shipping a stub damages trust.

**Acceptance criteria:**
- Node editor with three node types: **Trigger** (cron / on-event / manual), **Action** (shell / LLM / file op / PTY command), **Condition** (if-else branch).
- Node connections drawn with SVG bezier curves on a zoomable canvas (CSS transform scale).
- Workflows saved to `data/workflows/<id>.json` via existing `workflow_save` command.
- Workflow runner: execute manually via "Run Now" or on schedule via the existing `scheduler.rs` backend.
- Live execution log panel (scrollable, timestamped) beneath the canvas.
- Import / Export as `.ndwf` JSON bundle (drag-drop onto the view to import).

**Files:** `frontend/src/workflow_view.js` (full rewrite), `src-tauri/src/workflow.rs` (add `workflow_run`, `workflow_import`, `workflow_export`).

---

### 3. API Lab — Full HTTP Client

**Status:** `api_lab.js` and `commands/api_lab.rs` exist as stubs.  
**Why P0:** Registered in the Command Palette. A blank panel on a named tab is a bug, not a feature.

**Acceptance criteria:**
- Request builder: method selector (GET/POST/PUT/PATCH/DELETE), URL input, Headers editor (key-value pairs), Body editor (raw JSON / form-data toggle).
- Auth panel: None / Bearer Token / Basic Auth / API Key header.
- Response viewer: status badge, latency ms, response headers collapsible, response body with syntax highlighting (reuse Monaco or a `<pre>` with Prism via CDN).
- Request history: last 50 requests persisted to `localStorage("nd_api_lab_history")`.
- Save as collection: group requests into named collections saved to `data/api_collections/<name>.json`.
- Environment variables: `{{VAR}}` interpolation in URL and headers, resolved from a per-collection env file.
- "Send to Canvas" button: pastes the JSON response body into the Canvas editor.

**Files:** `frontend/src/api_lab.js` (full implementation), `src-tauri/src/commands/api_lab.rs` (add `api_lab_send`, `api_lab_save_collection`).

---

## P1 — High-Value Feature Completions

---

### 4. CLI Maker — Visual CLI Builder

**Status:** `cli_maker.js` and `commands/cli_maker.rs` exist as stubs.  
**What it is:** A visual tool for scaffolding and packaging custom shell CLIs as Lua plugins or standalone executables — the solo-dev equivalent of a no-code automation builder.

**Acceptance criteria:**
- Form-driven: CLI name, description, one or more subcommands (name + flag definitions + action body).
- Action body editor: Monaco instance, pre-filled with a template. Language toggle: Lua / Bash / Python.
- Preview panel: rendered `--help` output (computed from the form, no execution needed).
- "Save as Plugin" → writes a `.lua` file to `plugins/` via `cli_maker_save_plugin` command and hot-reloads.
- "Export as Script" → saves a standalone `.sh` / `.py` / `.lua` to `~/scripts/` via `cli_maker_export`.
- Generated plugins auto-register via `registerCommand` in the Lua runtime — appear in `Ctrl+K` palette immediately.

**Files:** `frontend/src/cli_maker.js` (full implementation), `src-tauri/src/commands/cli_maker.rs` (add `cli_maker_save_plugin`, `cli_maker_export`).

---

### 5. CRDT Canvas Collaboration Upgrade

**Status:** `canvas_collab.rs` uses last-write-wins TCP sync — functional but lossy under simultaneous edits.  
**Why now:** Canvas collab is a differentiating feature. CRDT removes the conflict class entirely.

**Architecture:**
- Introduce `yrs` crate (Yjs CRDT in Rust) — `Cargo.toml` dependency.
- Replace the raw `code_update` message with a `y_update` binary delta. Each peer applies deltas to a shared `Y.Doc`.
- `canvas_collab_send` emits `{ type: "y_update", data: base64_delta }`.
- Frontend: apply deltas via `Yjs` (CDN import in `index.html`) without triggering Monaco's own change events.
- Undo history is per-client and remains correct across peers.
- Max 8 peers (up from 4) — CRDT removes the race condition that capped safe concurrency.

**Files:** `src-tauri/src/canvas_collab.rs` (add yrs), `frontend/src/canvas.js` (Yjs integration), `frontend/index.html` (Yjs CDN), `Cargo.toml`.

---

### 6. Torrent / P2P Distribution Pipeline

**Status:** `frontend/src/torrent.js` exists as a stub. No Rust backend.  
**What it is:** Create and seed `.torrent` files from within NEURODECK — designed for distributing large files (AppImages, datasets, game mods) without a server.

**Architecture:**
- New `src-tauri/src/torrent.rs` using `cratetorrent` or `lava_torrent` crate.
- `torrent_create(path: String, tracker: Option<String>) -> Result<String>` — returns magnet URI.
- `torrent_add_magnet(magnet: String) -> Result<String>` — adds a download, returns torrent ID.
- `torrent_status(id: String) -> Result<TorrentStatus>` — returns `{ name, size, progress, seeds, peers }`.
- `torrent_remove(id: String, delete_data: bool)`.
- Frontend: `torrent.js` — two panels: **Seed** (drop zone → create torrent → display magnet + QR) and **Download** (magnet input + progress card grid).
- Share tab gains a fourth inner tab: **Torrent**.

**Files:** `src-tauri/src/torrent.rs` (new), `frontend/src/torrent.js` (full implementation), `main.js` (Share tab inner tab addition), `Cargo.toml`.

---

### 7. Remote Control — Full Session Relay

**Status:** `remote_control_view.js` exists. The Remote tab has the WebSocket QR flow but the Safari webapp is limited to terminal output + single command input.  
**What it is:** Upgrade the iPhone webapp to a full session relay — tabs, chat, and terminal from Safari.

**Acceptance criteria:**
- iPhone webapp gains a 3-tab bottom bar: **Chat** / **Terminal** / **Notify**.
- Chat tab: full message history visible, send field, streaming tokens rendered via SSE bridge.
- Terminal tab: scrollable PTY output (read-only) + command input that sends via WebSocket.
- Notify tab: lists the last 20 notifications from the notification center.
- The QR code deeplinks directly to the correct local URL with a session token embedded.
- Session token is short-lived (15 min TTL) and single-use — new QR required for a new session.
- All traffic stays LAN-only: no relay server, no cloud.

**Files:** `src-tauri/src/commands/system.rs` (extend `start_remote_server`), `frontend/src/remote_control_view.js` (full rewrite), new `assets/remote_webapp/index.html` served by the axum WebSocket server.

---

## P2 — Technical Debt & Performance

---

### 8. Memory Namespace UI

**Status:** The vector DB has a `namespace` field (`chat` vs `documents`) in `memory.rs` but the Memory tab shows a flat list with no filter.

**What to build:**
- Filter pills at the top of the Memory tab: **All** / **Chat** / **Documents** / **Game Notes** / **Pinned**.
- Namespace badge on each memory card (colored dot).
- New Tauri command: `memory_list_by_namespace(namespace: String) -> Vec<MemoryRecord>`.
- Document namespace cards show the source file path as a subtitle.
- Game Notes namespace cards show the game banner art (small thumbnail from the Steam CDN URL).

**Files:** `frontend/src/memory.js`, `src-tauri/src/memory.rs` (add `memory_list_by_namespace`), `lib.rs` (register).

---

### 9. Advanced RAG — Chunking & Re-ranking

**Status:** `index_directory` stores whole-file embeddings. Documents >2K tokens embed the truncated text, losing tail content. Top-3 flat similarity ranking has no diversity penalty.

**What to build:**
- Chunk files at 512-token boundaries with 64-token overlap in `commands/system.rs`.
- Add `chunk_index: u32` and `source_file: String` to `MemoryRecord`.
- Re-ranker: after top-10 cosine candidates, apply Maximal Marginal Relevance (MMR) to select top-3 that are both relevant and diverse.
- Memory tab shows chunk-level results with a "source file" breadcrumb and page/chunk number.
- Settings → Knowledge Base: "Re-index" button triggers a full re-chunk of all indexed directories.

**Files:** `src-tauri/src/memory.rs` (chunking + MMR), `src-tauri/src/commands/system.rs` (re-index endpoint), `frontend/src/memory.js` (chunk breadcrumb display).

---

### 10. Ctrl+Prompt — Contextual Prompt Sidebar

**Status:** `ctrl_prompt.js` exists as a stub. The feature was planned as a floating sidebar triggered by `R2` or a hotkey showing prompt templates relevant to the active view.

**What to build:**
- `Ctrl+P` (keyboard) or gamepad R2 toggles a right-side sliding panel (300px wide, full height, `position: fixed`).
- Content is **view-aware**: triggers in Terminal show shell prompt templates; in Chat shows conversation starters; in Agent shows task prompt blueprints.
- 12 templates per view (4 categories × 3). Each card has a "Use" button that pastes into the active input.
- Templates editable in Settings → Prompt Templates (persisted to `data/prompt_presets.json` — already exists).
- Panel respects the CSS Specificity Trap rule: uses a class selector, not an ID rule, for `display: flex`.

**Files:** `frontend/src/ctrl_prompt.js` (full implementation), `main.js` (panel mount + `Ctrl+P` binding), `settings.js` (template editor section).

---

## Definition of Done

- [ ] `cargo check` clean with zero warnings on new modules.
- [ ] `cargo clippy` — no `unwrap()` in any new Tauri handler.
- [ ] `npm run --prefix frontend build` succeeds.
- [ ] All 10 Osiris items wired and reachable from the Command Palette (`Ctrl+K`).
- [ ] Radial menu updated to 13 segments (Orchestrator added).
- [ ] Steam Deck 1280×800 layout validated on all new views.
- [ ] Gamepad D-pad navigation works in API Lab, CLI Maker, and Orchestrator.
- [ ] No `display: flex` on `#view-*` ID rules (CSS Specificity Trap — see `CLAUDE.md`).
- [ ] All new Tauri commands registered in `generate_handler![]` in `lib.rs`.
- [ ] KFMS stamp updated: version `1.4.0`, codename `Osiris`, tag `v1.4.0-osiris`.
- [ ] `health.json` all 5 checks true.
- [ ] GitHub release created with AppImage + Windows NSIS artifacts.

---

## Sprint Sequence (Recommended Order)

| Sprint | Items | Rationale |
|---|---|---|
| **7.0** | P0-1: Multi-Agent Orchestrator View | Largest visible gap — closes immediately |
| **7.1** | P0-2: Workflow Visual Builder polish | Node editor + trigger system |
| **7.2** | P0-3: API Lab full implementation | Quick win — pure frontend + thin backend |
| **7.3** | P1-4: CLI Maker | Same pattern as API Lab |
| **7.4** | P1-5: CRDT Canvas Collab | Isolated Rust change, no frontend routing impact |
| **7.5** | P1-6: Torrent pipeline | New Rust module — contained blast radius |
| **7.6** | P1-7: Remote Control relay upgrade | Server-side + webapp rewrite |
| **7.7** | P2-8: Memory Namespace UI | Pure frontend, fast |
| **7.8** | P2-9: Advanced RAG chunking + MMR | Data-layer only, no UI breakage |
| **7.9** | P2-10: Ctrl+Prompt sidebar | CSS + JS — final sprint before release |

---

## Deferred Items (with rationale)

| Feature | Rationale |
|---|---|
| **Mobile Companion App** (iOS/Android) | Requires stable cloud sync relay. Push to v1.5.x (Horus). |
| **Docker / WASM Runtimes** | No user demand signal. Engineering cost is high. v2.0+ scope. |
| **Qdrant Vector DB Migration** | JSON DB <20ms at current scale. Migrate when memory count exceeds 50K records. |
| **Wake Word / VAD** | Whisper STT already functional. Wake word adds complexity without proportional utility. |
| **gRPC External Agent API** | Architecture: design the API surface in Osiris docs, implement in v1.5+. |
| **Cloud Sync Server** | Managed backend needs its own infra. Not a desktop-app concern. |

---

## Bottom Line

v1.4.0-Osiris is the **resurrection release.**

Six dormant frontend modules and four hidden backend command sets come fully alive. The canvas collab tier jumps from "functional but fragile" to CRDT-correct. The P2P layer gains a torrent pipeline. The Memory tab gains namespace awareness and chunk-level RAG precision.

By the time Osiris ships, every registered Command Palette entry and every radial menu segment will have a production-quality view behind it.

No dead ends. No stubs. No dark launches.
