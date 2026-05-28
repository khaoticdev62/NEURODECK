# NEURODECK v1.5.0 Roadmap — Horus
**Theme:** Vision — Surface the Intelligence Layer  
**KFMS Codename:** Horus (MINOR line 5)  
**Target Tag:** `v1.5.0-horus`  
**Baseline:** `v1.4.0-osiris` (master, 2026-05-28)  
**Constraint:** No stubs ship. Every item must be fully wired end-to-end before the release tag.

---

## Release Philosophy

v1.4.0 (Osiris) resurrected the buried surface layer — every tab now has a real view behind it.

**v1.5.0 (Horus) adds sight.**

Horus is the god of sky and vision. This release wires the intelligence layer that already exists in the codebase but has never been fully surfaced to the user:

- The **LSP client** (`lsp.rs` + `lsp_client.js`) has completions, hover, diagnostics, and definitions — but the IDE view never calls them in a way the user can see.
- The **Torrent/P2P pipeline** (`torrent.rs`) is fully implemented in Rust — the `fx_torrent` session, magnet parsing, piece tracking — but was deferred from Osiris due to a build script conflict that is now resolved.
- The **Remote Control webapp** (`remote_control.rs`) already serves Chat + Terminal + Actions + Prompts over a LAN WebSocket — but lacks streaming token delivery, notification relay, and a short-lived session token QR flow.
- **Memory export/import** — the vector DB has no backup/restore path. Power users on SteamOS cannot move their memory to a new install.
- **gRPC External Agent API** — `infrastructure/warpinator.rs` already contains a gRPC server. Exposing NEURODECK as an MCP/tool-call target for external LLMs is the missing distribution layer.
- **Voice pipeline upgrade** — STT is `arecord` → Whisper. TTS is `espeak`. The gap is streaming TTS so the AI response is spoken as it arrives, not after the full generation completes.

Horus ships vision. The existing infrastructure finally sees daylight.

| In Scope | Out of Scope (defer to v1.6+) |
|---|---|
| Torrent/P2P distribution pipeline | Mobile native app (iOS/Android) |
| LSP integration in IDE view | Cloud sync managed backend |
| Remote Control — streaming + notifications | Docker/WASM sandboxed runtimes |
| Memory export / import / backup | Qdrant migration |
| gRPC External Agent API | Voice wakeword / VAD |
| Streaming TTS (speak-as-you-generate) | Multi-user collaboration server |
| Theming — live accent color preview | |
| CLI Maker — chain export + import-from-Lua | |

---

## P0 — Primary Release Blockers

### 1. Torrent / P2P Distribution Pipeline — Full Surface

**Status:** `torrent.rs` fully implemented (`fx_torrent` session, add/remove/status/pause/resume). `torrent.js` (988 lines) has full UI with Seed + Download panels, handoff-to-LAN, search, filter, sort, piece visualization. The view is registered in the Share tab but was never connected in the build pipeline (Osiris `build.ps1` conflict).

**What was blocking:** The `fx-torrent = "0.9.1"` crate conflicted with `ring = "0.17.14"` over `getrandom` feature flags in the Windows build script. This was a linker flag issue, not a code issue — resolved by isolating the feature flag in `Cargo.toml`.

**Acceptance criteria:**
- Share tab gains a **Torrent** inner tab (fourth tab alongside LAN / FTP / SFTP).
- **Seed panel**: drop zone → select file/dir → `torrent_create` → display magnet URI + QR code.
- **Download panel**: magnet URI input → `torrent_add` → progress card grid showing name, size, progress bar, seeds, peers, speed.
- Pause / Resume / Remove (with optional data delete).
- **Handoff to LAN**: "Share via LAN" button on a completed torrent transfers it to the LAN Share panel.
- Status auto-polls every 2s via `torrent_get_status` when the Torrent tab is active.
- `torrent_get_download_root` button opens the download directory in the OS file manager.

**Files:** `frontend/src/torrent.js` (wire to Share tab HTML in `main.js`), `src-tauri/Cargo.toml` (isolate feature flags).

---

### 2. LSP Integration in the IDE View — Completions + Diagnostics

**Status:** `lsp.rs` (762 lines) has a full LSP manager: `lsp_start`, `lsp_stop`, `lsp_list`, `lsp_get_diagnostics`, `lsp_open_document`, `lsp_change_document`, `lsp_get_completions`, `lsp_get_hover`, `lsp_get_definitions`, `lsp_known_servers`. `lsp_client.js` (511 lines) has completion UI helpers. The IDE view (`ide_view.js`) imports `lsp_client.js` but never calls `lsp_start` or wires the completion/hover events to user-visible UI.

**Acceptance criteria:**
- **Language server selector** in IDE toolbar: dropdown populated from `lsp_known_servers()`. One-click start/stop.
- **Status bar row** below the editor: `LSP: rust-analyzer ✓ connected` / `● 3 errors 2 warnings`.
- **Inline diagnostics**: squiggly underlines (CSS-only via character offset) on lines with `error`/`warning` severity.
- **Diagnostics panel**: collapsible panel below the editor showing all diagnostics for the open file. Click a row → jump to that line.
- **Completions popup**: `Ctrl+Space` or after `.` → dropdown of completion items from `lsp_get_completions`. Arrow keys to navigate, Enter to insert. Esc to dismiss.
- **Hover tooltip**: hovering a symbol for 500ms → `lsp_get_hover` → tooltip card showing type signature and docs.
- **Go to definition**: `F12` or right-click menu → `lsp_get_definitions` → if single result, jump to file + line in the IDE editor; if multiple, show a picker.
- Server lifecycle: LSP server is auto-stopped when its language file is closed or the IDE tab is left.

**Files:** `frontend/src/ide_view.js` (LSP wiring), `frontend/src/lsp_client.js` (wire completion/hover/diagnostics rendering to real DOM), `frontend/src/app.css` (diagnostic underlines, completion popup, hover card).

---

### 3. Remote Control — Streaming Tokens + Notification Relay

**Status:** `remote_control.rs` (914 lines) already serves a full-featured mobile webapp (Chat + Terminal + Actions + Prompts tabs) over LAN WebSocket. The gap: LLM tokens arrive as full responses (blocking), not as they stream. The Notifications tab is missing. Session token TTL is hardcoded to 15 minutes with no UI indicator.

**Acceptance criteria:**
- **Streaming LLM relay**: when a chat message triggers a `send_command` stream, each token chunk is forwarded to the WebSocket client as `{ type: "token", text: "..." }` events. The mobile UI appends tokens in real time.
- **Notification relay tab** (fourth tab): renders the last 20 NEURODECK notifications (from the notification center). New notifications push to the webapp in real time via `{ type: "notification", ... }` events.
- **Session token indicator**: QR overlay in the desktop Remote view shows time-remaining countdown (minutes:seconds). When expired, the QR refreshes automatically.
- **Session token hardening**: token is 32 bytes CSPRNG (already implemented via `security::generate_session_token`). Add `X-NEURODECK-Token` header validation on every WebSocket upgrade (currently only checked on initial connect).

**Files:** `src-tauri/src/remote_control.rs` (stream forwarding, notification relay websocket push), `frontend/src/remote_control_view.js` (session TTL display), WEBAPP_HTML embedded in `remote_control.rs` (Notification tab + streaming token rendering).

---

## P1 — High-Value Feature Completions

### 4. Memory Export / Import / Backup

**Status:** The vector DB (`memory.rs`) persists to `user_config_dir/data/memory/memory.json`. There is no export/import/backup path. Users upgrading SteamOS or reinstalling NEURODECK lose all memory.

**Architecture:**
- New Tauri command: `memory_export(path: String)` — serializes all `MemoryRecord`s to a compressed JSON file (`.ndmem` extension, gzip JSON inside).
- New Tauri command: `memory_import(path: String, merge: bool)` — deserializes and either replaces or merges with existing records. Deduplicates by record ID.
- New Tauri command: `memory_backup_auto()` — writes a timestamped snapshot to `user_config_dir/data/memory/backups/` (keeps last 5). Called on app startup.
- Settings → Memory section: **Export** button (opens OS file save dialog via `tauri-plugin-dialog`), **Import** button (file open dialog), **Backup** list with timestamps and restore buttons.
- Import validates record schema before applying — rejects malformed data with a clear error.

**Files:** `src-tauri/src/memory.rs` (new methods), `src-tauri/src/lib.rs` (register commands), `frontend/src/memory.js` (export/import buttons), `frontend/src/main.js` (Settings Memory section additions).

---

### 5. gRPC External Agent API — NEURODECK as MCP Tool Target

**Status:** `infrastructure/warpinator.rs` already has a `tonic` gRPC server. `mcp.rs` serves `tools/list` + `tools/call` on `localhost:13337`. The gap: MCP tool definitions don't map cleanly to Tauri commands, and there's no standard way for an external LLM (Claude Desktop, Continue.dev, etc.) to discover NEURODECK's capabilities.

**Architecture:**
- Extend `mcp.rs` to serve a full **MCP 2024-11 compliant** spec:
  - `tools/list` → returns all registered Tauri commands as MCP tool definitions with JSON Schema parameter specs.
  - `tools/call` → dispatches to the real Tauri command handler via `AppHandle::invoke_command`.
  - `resources/list` → exposes Memory records, open sessions, plugin registry.
  - `prompts/list` → exposes saved prompt presets from `data/prompt_presets.json`.
- **MCP discovery endpoint**: `GET /.well-known/mcp` returns server metadata (name, version, capabilities).
- **Tool whitelist**: users configure which commands are exposed (default: `send_command`, `memory_add_fact`, `memory_list_all`, `execute_command_stream`, `pty_write`). Full list in Settings → MCP Server.
- **Auth**: `Bearer <mcp_token>` header required on all requests. Token shown in Settings, copyable.
- Settings → MCP Server section: on/off toggle, port config, token display+copy, exposed tool checklist.

**Files:** `src-tauri/src/mcp.rs` (full MCP spec), `src-tauri/src/lib.rs` (register new commands), `frontend/src/settings.js` (MCP tool whitelist panel), `frontend/src/main.js` (Settings MCP section).

---

### 6. Streaming TTS — Speak As You Generate

**Status:** `speak_text` command calls `espeak` with the full response text after generation completes. For long responses, the user waits for the entire LLM generation before hearing anything.

**Architecture:**
- Modify `send_command` to emit `tts_chunk` events for each sentence boundary detected in the streaming token buffer.
- Sentence detection: accumulate tokens until a `.`, `!`, `?`, or `\n\n` is encountered, then emit `tts_chunk` with the sentence.
- Backend: `speak_text_stream(text: String)` — async, non-blocking, appends to a per-session TTS queue processed by a dedicated tokio task. Second sentence starts speaking as the third is generated.
- Frontend: `chat.js` listens for `tts_chunk` events and triggers playback only when the TTS setting is enabled (existing `autoSpeak` flag).
- Interrupt: if the user sends a new message while TTS is active, the TTS queue is flushed immediately.
- Settings: new "TTS mode" radio — **Off / After complete / Stream sentences** (default: After complete for backward compat).

**Files:** `src-tauri/src/lib.rs` (new `speak_text_stream` command, sentence splitter), `frontend/src/chat.js` (TTS chunk event listener), `frontend/src/main.js` (Settings TTS mode selector).

---

## P2 — Technical Debt & Polish

### 7. CLI Maker — Chain Export + Import-from-Lua (Complete the Stubs)

**Status:** `cli_export_lua` for `Chain` action returns `"-- Chain export not yet implemented\n"`. `cli_import_lua` always returns `"{}"`. These are the only two stubs in the codebase that are explicitly marked as unimplemented.

**What to build:**
- Chain export: generate Lua that calls each step command in sequence, passing the output of each as args to the next.
- Import-from-Lua: parse `registerCommand("name", function(args) ... end)` blocks into `CliCommandDef` structs. Handles Prompt (template in body), Shell (`execute(...)` call), and Plugin (raw Lua body) categories.
- UI: "Import from File" button in CLI Maker toolbar → opens file picker → calls `cli_import_lua` with file path → loads result into the form editor.

**Files:** `src-tauri/src/commands/cli_maker.rs` (chain export + import parser), `frontend/src/cli_maker.js` (import button), `frontend/src/app.css` (import button styling).

---

### 8. Theme System — Live Accent Color Preview

**Status:** The Settings → Appearance section has a theme selector dropdown and a viewport preview thumbnail (`#theme-viewport-preview`). The custom theme color picker is wired. The gap: changing a theme doesn't show a live preview before the user clicks Apply.

**What to build:**
- On theme card hover (or select): inject the theme's CSS variables into a `#theme-preview-overlay` div that mirrors the main app at 30% scale, updating in real time as the user hovers through options.
- Accent color picker: color input change immediately applies to the preview overlay via CSS custom property injection — no Apply needed to see the effect in the preview.
- "Apply" commits to the live app. "Reset" restores the last saved state.
- Custom theme editor: color swatches for all 6 theme variables (color, background, foreground, accent, response, warning/error) with hex input + color picker in a grid layout.

**Files:** `frontend/src/main.js` (theme hover handler, preview overlay), `frontend/src/app.css` (preview overlay CSS), `frontend/src/settings.js` (if extracted).

---

### 9. Advanced RAG — MMR Re-ranking + Source Breadcrumb UI

**Status:** Sprint 7.8 added chunking to `index_directory`. The `MemoryDB::search()` method still uses flat cosine similarity top-N with no diversity penalty. The Memory tab shows chunk records but without source file breadcrumbs or chunk navigation.

**What to build:**
- Backend: **Maximal Marginal Relevance (MMR)** in `memory.rs::search()`:
  - Retrieve top-10 by cosine similarity.
  - Iteratively select chunks that maximize relevance AND minimize similarity to already-selected chunks.
  - `lambda` parameter (0.5 default): balance between relevance and diversity.
  - Result is still top-3 but semantically diverse across source files.
- Backend: new `memory_search_semantic(query: String, limit: u8) -> Vec<MemoryRecord>` command that runs embedding + MMR and returns ranked results.
- Frontend Memory view: document namespace cards show `source_file` + `chunk_index/total` breadcrumb. "Re-index" button in Settings → Knowledge Base triggers a full re-chunk of all indexed directories (calls `index_directory` for each stored path).
- Settings: new "Indexed directories" list with stored paths, per-directory doc count, and remove button.

**Files:** `src-tauri/src/memory.rs` (MMR in search), `src-tauri/src/lib.rs` (register `memory_search_semantic`), `src-tauri/src/commands/system.rs` (store indexed directory list), `frontend/src/memory.js` (chunk breadcrumb, re-index button).

---

### 10. Bundle Size Reduction — Code Splitting

**Status:** The frontend bundle is `1,153 kB` minified / `287 kB` gzipped. The entire app ships as one chunk. Vite warns on every build. The main cost is `main.js` (8k+ lines of inlined HTML templates) and the aggregated ES module tree.

**What to build:**
- Enable Vite's `build.rolldownOptions.output.codeSplitting` (already suggested by Vite on every build).
- Extract the 8k+ line HTML template string from `main.js` into a static `index.html` that Vite processes at build time — eliminating the largest single string literal in the bundle.
- Lazy-load heavy view modules (`orchestrator.js`, `torrent.js`, `workflow_view.js`, `ide_view.js`) on first tab activation instead of at boot.
- Target: < 800 kB minified / < 200 kB gzipped for the main entry chunk.

**Files:** `frontend/vite.config.js` (code splitting config), `frontend/src/main.js` (template extraction), view module imports converted to `import()` dynamic imports.

---

## Definition of Done

- [ ] `cargo check` — zero warnings on new modules.
- [ ] `cargo clippy` — no `unwrap()` in any new Tauri handler.
- [ ] `npm run --prefix frontend build` — succeeds. Main chunk < 900 kB minified.
- [ ] All 8 Horus items reachable from the Command Palette (`Ctrl+K`).
- [ ] Share tab Torrent inner tab visible and functional.
- [ ] LSP completions fire in IDE view with at least one language server (rust-analyzer or typescript-language-server).
- [ ] Remote Control streaming: tokens visible on mobile as they arrive.
- [ ] Memory export produces a valid `.ndmem` file that can be re-imported.
- [ ] MCP `tools/list` returns valid JSON accepted by an MCP client.
- [ ] Chain Lua export generates runnable code.
- [ ] KFMS stamp: version `1.5.0`, codename `Horus`, tag `v1.5.0-horus`.
- [ ] `health.json` all 5 checks true, hardening gate passes.
- [ ] GitHub release published with AppImage + Windows NSIS artifacts.

---

## Sprint Sequence

| Sprint | Items | Rationale |
|---|---|---|
| **8.0** | P0-1: Torrent pipeline — wire to Share tab | Backend is done; pure frontend wiring |
| **8.1** | P0-2: LSP in IDE view | `lsp.rs` + `lsp_client.js` are both ready; connect the dots |
| **8.2** | P0-3: Remote Control streaming + notifications | Contained change in `remote_control.rs` |
| **8.3** | P1-4: Memory export / import / backup | New commands; Settings panel additions |
| **8.4** | P1-5: gRPC / MCP External Agent API | Extend `mcp.rs` to MCP 2024-11 spec |
| **8.5** | P1-6: Streaming TTS | Send-command stream change + chat.js listener |
| **8.6** | P2-7: CLI chain export + import-from-Lua | Clear the last two stubs |
| **8.7** | P2-8: Theme live preview | Pure frontend; CSS injection |
| **8.8** | P2-9: MMR re-ranking + source breadcrumbs | Data-layer + Memory view polish |
| **8.9** | P2-10: Bundle size reduction | Vite config + lazy imports |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `fx-torrent` Windows linker conflict resurfaces | Medium | Blocks Sprint 8.0 | Isolate with `[target.'cfg(windows)'.dependencies]` feature flag scoping |
| `rust-analyzer` LSP binary not present on SteamOS | High | Sprint 8.1 degrades to "no server found" | Ship a `lsp_known_servers()` that filters to binaries present on PATH; IDE shows "Install rust-analyzer" hint if missing |
| MCP spec changes (2024-11 not yet fully ratified) | Low | Sprint 8.4 may need a minor update | Implement the stable `tools/list` + `tools/call` subset; avoid protocol extensions |
| Bundle size target < 900 kB may require HTML template extraction | Medium | Sprint 8.9 scope creep | Start with lazy module loading; only do template extraction if it alone gets us under target |

---

## Deferred Items (with rationale)

| Feature | Rationale |
|---|---|
| **Mobile native app** | Requires stable cloud relay backend. v1.6+ (Ma'at). |
| **Docker/WASM sandboxed runtimes** | No user demand signal at current install base. v2.0. |
| **Qdrant migration** | JSON DB < 20ms at current memory scale. Migrate at > 50K records. |
| **Voice wakeword / VAD** | STT path already functional. Wakeword adds hardware dependency without proportional utility. |
| **Multi-user collaboration server** | Desktop-local architecture. Managed backend is a separate infrastructure concern. |
| **`compare_models` UI** | Backend command exists. Blocked on defining the UX clearly. Research spike needed first. |

---

## Bottom Line

v1.5.0-Horus activates the **intelligence layer** that Osiris left sleeping.

Horus ships sight: LSP completions in the IDE, streaming speech as the AI generates, a P2P distribution pipeline, memory portability, and an external API surface so any MCP-compatible LLM can use NEURODECK as its hands.

The two stubs (`Chain` export, `cli_import_lua`) are cleared. The bundle shrinks. The remote control gets real-time token delivery.

By the time Horus tags, NEURODECK is not just a terminal OS — it's an MCP server your other AI tools can control.
