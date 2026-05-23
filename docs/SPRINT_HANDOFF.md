# NEURODECK Sprint Handoff — Remaining Release Work

**Status as of 2026-05-23**
**Sprints completed:** Sprint 1 (Release Hardening — R1–R5 all done)
**Sprints remaining:** Sprint 2, Sprint 3, Sprint 4

---

## Sprint 1 — Completed ✅

| ID | Task | Status |
|----|------|--------|
| R1 | Split `main.js` into `ctrl_prompt.js` + `remote_control_view.js` ES modules | ✅ Done |
| R2 | FTP: replace `retr_as_buffer` with streaming `retr()` callback; stream upload via `File::open` | ✅ Done |
| R3 | SSH: add `-o ConnectTimeout=30` to prevent hung PTY reader threads | ✅ Done |
| R4 | Packaging script `package_release.ps1` with optional `signtool.exe` code signing | ✅ Done |
| R5 | Remote Control View: security notice CSS, amber warning banner | ✅ Done |

---

## Sprint 2 — Whisper STT Wiring + Radial Menu Expansion

### S2-1: Whisper STT UI ✅ Already Done

The backend (`src-tauri/src/whisper.rs`) and all three Tauri commands (`set_whisper_config`, `get_whisper_status`, `transcribe_audio_whisper`) were implemented in a previous sprint and are registered in `generate_handler![]`.

The frontend panel (`#sp-voice`) in `main.js` already has:
- `#whisper-binary-input`, `#whisper-model-input` inputs
- `#whisper-save-btn`, `#whisper-test-btn` buttons
- `#whisper-status-line` status display
- `initWhisperSettings()` IIFE wiring all button handlers (~line 9336)
- Mock IPC entries for all three commands

**No further work needed for Whisper.**

---

### S2-2: Radial Menu — Add SSH + Remote Segments ✅ Implemented in this session

**What changed:**
- `RADIAL_SEGMENTS` expanded from 8 → 10 entries
- Added `{ icon: "🔑", label: "SSH", view: "ssh" }` and `{ icon: "📱", label: "Remote", view: "remote" }`
- Sector angle changed from 45° → 36° throughout `initRadialMenu()`
- Stick angle math updated: half-sector offset 22.5° → 18°, floor divisor 45 → 36, modulo 8 → 10

**Files changed:** `frontend/src/main.js` (RADIAL_SEGMENTS array + initRadialMenu + getRadialSegmentFromStick)

**Verify:** Press L2 on gamepad → 10-segment ring appears with 🔑 SSH and 📱 Remote slots. Left stick cycles through all 10.

---

## Sprint 3 — AI Terminal Autocomplete + Local Document RAG

### S3-1: AI Terminal Autocomplete (Tab Ghost Text)

**Goal:** Pressing Tab in the PTY terminal sends the current partial command to the LLM and renders the completion as ghost text (dimmed, inline). A second Tab or → accepts it; Escape dismisses.

**Backend changes needed:**
- Add `src-tauri/src/autocomplete.rs` with a single command:
  ```rust
  #[tauri::command]
  pub async fn get_terminal_autocomplete(
      partial: String,
      history: Vec<String>,
      state: tauri::State<'_, AppState>,
  ) -> Result<String, String>
  ```
  - Builds a prompt: `"Complete this shell command (output ONLY the completion, no explanation): {partial}"`
  - Prepends last 10 history entries as context
  - Calls `state.llm_provider.lock().await.generate_oneshot(prompt)` (non-streaming, short max_tokens ~30)
  - Must add `mod autocomplete;` to `lib.rs` and register `get_terminal_autocomplete` in `generate_handler![]`

- **LLM provider oneshot method**: `llm.rs` currently only has streaming `generate()`. Add:
  ```rust
  pub async fn generate_oneshot(&self, prompt: &str, max_tokens: u32) -> Result<String, String>
  ```
  For Gemini: POST to `generateContent` endpoint (non-streaming). For Ollama: POST to `/api/generate` with `stream: false`.

**Frontend changes needed** (`main.js`):
- In the xterm `onKey` handler (search for `term.onKey`): intercept Tab keypress
- On Tab: capture `term._core.buffer.active` current line text, call `invoke("get_terminal_autocomplete", {partial, history})`
- Render ghost text using xterm's `term.write("\x1b[2m" + completion + "\x1b[0m")` (dim ANSI)
- Track ghost text length; → or second Tab: `term.write(completion)` + send to PTY; Escape: overwrite ghost chars
- Add to mock IPC: `case 'get_terminal_autocomplete': return 'ls -la | grep';`

**Complexity note:** xterm.js doesn't expose a ghost-text API; the completion must be written to the terminal buffer and then erased on rejection. Use a module-level `currentGhostText` variable to track state.

---

### S3-2: Local Document RAG — Index Directory

**Goal:** Users can point NEURODECK at a local folder (e.g. `/home/user/docs`); the system indexes all `.txt/.md/.pdf/.py/.js` files as embeddings and includes relevant chunks in every LLM query alongside chat history.

**Backend changes needed:**
- Add `src-tauri/src/doc_indexer.rs`:
  ```rust
  #[tauri::command]
  pub async fn index_directory(path: String, state: tauri::State<'_, AppState>) -> Result<IndexStats, String>
  ```
  - Walk directory with `walkdir` crate (add to `Cargo.toml`)
  - Chunk files at ~500 tokens (split on paragraph breaks / newlines)
  - Generate embeddings via `llm::generate_embedding()` for each chunk
  - Store in `memory::VectorDB` using document path + chunk index as the memory key
  - Returns `IndexStats { files_indexed: u32, chunks: u32, skipped: u32 }`

- Add `get_indexed_docs() -> Vec<String>` to list currently indexed directories
- Add `clear_doc_index() -> Result<(), String>` to wipe document embeddings

- Register all 3 commands in `generate_handler![]` and `mod doc_indexer;` in `lib.rs`

**Frontend changes needed** (`main.js`):
- Add a "Documents" sub-panel to Settings (`#sp-docs`):
  - Directory path input + "Index Directory" button
  - Progress indicator (listen to `index_progress` event emitted by backend)
  - Indexed docs list showing filenames + chunk counts
  - "Clear Index" button
- In the Knowledge/Memory view (`#view-memory`), add a "RAG Sources" section showing indexed doc count

**Dependencies:**
- `walkdir = "2"` in `src-tauri/Cargo.toml`
- Requires Gemini API key for embedding generation (same constraint as chat RAG)
- PDF support: use `pdf-extract = "0.7"` crate OR skip PDF for MVP (text/md/code only)

**Complexity note:** Indexing is slow for large directories. Emit `index_progress` events from a `spawn_blocking` task and update a progress bar in the frontend.

---

## Sprint 4 — Package, Sign, and Ship v1.0

### S4-1: Final Pre-Release Checklist

Run these before cutting the tag:

- [ ] `cd src-tauri && cargo clippy -- -D warnings` — zero warnings
- [ ] `npm run --prefix frontend build` — Vite build succeeds
- [ ] `npx tauri build` — NSIS installer produced at `src-tauri/target/release/bundle/nsis/`
- [ ] Run app: boot sequence completes, all 10 radial menu tabs navigate correctly
- [ ] Test Remote Control: start server, scan QR on iPhone Safari, send a command
- [ ] Test FTP: connect, list, upload 50MB file (verify no OOM)
- [ ] Test SSH: connect to host, verify timeout on bad host (≤30s)
- [ ] Test Whisper: configure binary + model, click Test, verify transcription

### S4-2: Code Signing

```powershell
# Self-signed (testing only — triggers SmartScreen):
New-SelfSignedCertificate -Type CodeSigning -Subject "CN=NEURODECK Dev" `
    -CertStoreLocation Cert:\CurrentUser\My -KeyUsage DigitalSignature

# Get thumbprint:
Get-ChildItem Cert:\CurrentUser\My | Select Thumbprint, Subject

# Run packaging with signing:
$env:NEURODECK_CERT_THUMBPRINT = "PASTE_THUMBPRINT_HERE"
.\package_release.ps1
```

For distribution without SmartScreen blocking: purchase an EV Code Signing certificate from DigiCert or Sectigo (~$300/yr). EV certs have immediate reputation with Microsoft.

### S4-3: GitHub Release

```bash
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release with artifacts:
gh release create v1.0.0 \
  neurodeck_win_release.zip \
  neurodeck_installer.exe \
  --title "NEURODECK v1.0.0" \
  --notes-file docs/RELEASE_NOTES.md
```

Create `docs/RELEASE_NOTES.md` before tagging. Include:
- Feature summary (all views: Chat, Canvas, Terminal, SSH, Tunnel, Agent, Memory, Share, Prompt Lab, Remote)
- Steam Deck setup instructions (link to `docs/gamescope_guide.md`)
- Whisper STT setup instructions (binary + model download)
- Known limitations (Windows-only signed build; STT mock on Windows; Canvas Python/Bash run is a hint only)

### S4-4: SteamOS Flatpak Consideration

The current `install.sh` copies the binary to `~/Applications/neurodeck/`. For Steam library integration:
- Add a `.desktop` file pointing to `launch_gamescope.sh`
- Consider a `com.neurodeck.app.flatpakref` for easier SteamOS updates (lower priority, post-v1.0)

---

## Architecture Notes for Future Sprints

### What's Already Done (Do Not Re-Implement)
- All 4 Whisper commands: `set_whisper_config`, `get_whisper_status`, `transcribe_audio_whisper`, `stop_recording` fallback path
- FTP streaming (Sprint 1 R2 — `retr()` callback, `put_file` with file handle)
- Remote Control axum WS server with PIN auth, QR pairing, mobile webapp HTML
- PTY `remote_tx` broadcast forwarding (added to `pty_manager.rs`)
- Controller Prompt Picker as `ctrl_prompt.js` ES module with live bindings
- Remote Control View as `remote_control_view.js` ES module
- Canvas collab TCP server (`canvas_collab.rs`)
- Warpinator gRPC (`infrastructure/warpinator.rs`)
- LAN P2P transfer + mDNS discovery (`transfer.rs`)
- OAuth Google Device Flow (`infrastructure/oauth.rs`)
- OS keychain (`infrastructure/secrets.rs`)

### Known Incomplete Items (from `ANTIGRAVITY_HANDOFF.md`)
- Canvas Python/Bash Run button — shows hint, doesn't execute (Priority 1 in handoff)
- Context drawer (`#inspect-drawer`) — wired to toggle, no content (Priority 3)
- SSH tab not in radial menu — **fixed in Sprint 2**
- Remote tab not in radial menu — **fixed in Sprint 2**
- `generate_jpe_explanation` backend command — may not be registered (verify)
