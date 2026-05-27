# NEURODECK Testing Coverage Map

> Last updated: 2026-05-26 — after the dynamic testing implementation pass.

## Summary

| Layer | Files | Tests | Coverage | CI Gate |
|---|---|---|---|---|
| **Rust unit** | 14 modules | 58 tests | ~30% of modules | Gate 3 (`cargo test`) |
| **Frontend unit** | 4 test files | 43 assertions | Pure functions only | Gate 3 (`npm run frontend:test`) |
| **E2E** | 7 spec files | 55+ tests | UI flows + a11y | Gate 4 (Playwright) |

---

## Rust Backend (`src-tauri/src/`)

### Well-Covered Modules (≥3 tests)

| Module | Tests | What’s Tested |
|---|---|---|
| `security.rs` | 6 | Token generation, command validation, script policy, path redaction |
| `config.rs` | 2 | Default config shape, nonexistent config fallback |
| `memory.rs` | 2 | Cosine similarity, DB save/load flow |
| `storage.rs` | 2 | Invalid session IDs, save/load round-trip |
| `transfer.rs` | 2 | Path sanitization, collision avoidance |
| `sync.rs` | 2 | Encrypt/decrypt round-trip, wrong-token rejection |
| `self_heal.rs` | 2 | Invalid persona registry reset, invalid config rebuild |
| `mcp.rs` | 1 | Env-flag truthy parsing |
| `llm.rs` | 4 | Provider constructors (Gemini, Ollama, HF, Kimi) |
| `computer_use.rs` | 3 | Supported buttons, invalid buttons, TSV parsing |
| `plugin_mgr.rs` | 3 | Safe file names, unsafe rejections, GitHub-only downloads |

### Newly Covered in This Pass

| Module | Tests | What’s Tested |
|---|---|---|
| `error.rs` | 6 | Construction, recoverable flag, suggestion, LLM prebuilt, JSON Display, serialization round-trip |
| `pty_manager.rs` | 6 | Shell candidate building (empty, bash, zsh, fish, sh, unknown, Windows fallbacks) |
| `commands/system.rs` | 6 | Text similarity (identical, different, partial, empty, punctuation, case), LAN IP format |
| `commands/config.rs` | 3 | Theme name list, known themes, persona list |

### Modules with ZERO Tests (26 total)

> These are the highest-priority targets for future testing work.

| Module | Why It Matters | Testability |
|---|---|---|
| `lib.rs` | App state, provider factory, theme/persona statics | **Hard** — massive monolith, tightly coupled |
| `commands/agent.rs` | Agent loop, step execution | **Hard** — needs mock LLM provider |
| `commands/api_lab.rs` | API collection management | **Medium** — file I/O dependent |
| `commands/browser.rs` | WebView automation | **Hard** — needs WebViewWindow |
| `commands/cli_maker.rs` | CLI generation | **Medium** — pure logic exists |
| `commands/git.rs` | Git operations | **Medium** — needs temp repos |
| `commands/session.rs` | Session save/load | **Medium** — file I/O dependent |
| `canvas_collab.rs` | TCP peer sync | **Hard** — needs network sockets |
| `doc_indexer.rs` | Document indexing | **Medium** — file I/O dependent |
| `ftp.rs` | FTP client | **Hard** — needs FTP server |
| `hf_model_mgr.rs` | HF model download | **Hard** — network + disk heavy |
| `lua.rs` | Lua runtime, plugin execution | **Hard** — needs AppHandle |
| `mcp.rs` | MCP server lifecycle | **Hard** — spawns subprocess |
| `ollama_mgr.rs` | Ollama process management | **Hard** — spawns subprocess |
| `orchestrator.rs` | Task orchestration | **Hard** — async + stateful |
| `remote_control.rs` | WebSocket remote control | **Hard** — needs network |
| `scheduler.rs` | Cron-like scheduling | **Medium** — time manipulation |
| `sftp.rs` | SFTP client | **Hard** — needs SSH server |
| `torrent.rs` | BitTorrent client | **Hard** — network heavy |
| `tunnel.rs` | TCP tunnel | **Hard** — needs network sockets |
| `whisper.rs` | STT model | **Hard** — ML model + audio |
| `workflow.rs` | Workflow engine | **Medium** — state machine logic |

---

## Frontend (`frontend/src/`)

### Covered Test Files

| File | Tests | What’s Tested |
|---|---|---|
| `icons.test.js` | 16 | `createIcon` (unknown, known, size default, XSS sanitization, class stripping), `normalizeLabel` (emoji, whitespace, empty, symbols, parentheses, numbers) |
| `shortcuts.test.js` | 8 | `KEYBOARD_SHORTCUTS` shape, `GAMEPAD_COMMANDS` shape, `validateShortcuts` duplicate detection |
| `state.test.js` | 6 | Default state shape, primitive defaults, array defaults, nested `chatSearch`/`compareLeft`/`compareRight` shapes |
| `haptics.test.js` | 13 | `triggerHaptic` (disabled, unknown preset, no gamepad, simple presets, debounce, force bypass, sequenced patterns, error rejection), `setHapticsEnabled` |

### Untestable by Design

| File | Reason | Alternative Coverage |
|---|---|---|
| `main.js` (~12K lines) | Procedural side-effect entry point, no exports | E2E tests cover all major UI flows |
| `chat.js`, `terminal.js`, `canvas.js`, etc. | Tightly coupled to `invoke()`, `listen()`, DOM, global `state` | E2E tests cover view interactions |
| `settings.js` | DOM + localStorage + invoke entangled | E2E tests cover settings flows |

### Could Be Tested in Future

| File | What to Test | Blocker |
|---|---|---|
| `focus-trap.js` | Focus cycling logic | Needs JSDOM/happy-dom |
| `gamepad.js` | Button mapping, focus index math | Needs `navigator.getGamepads` mock |
| `notifications.js` | Queue logic, deduplication | Needs DOM |
| `virtual-scroll.js` | Range calculation | Pure math, no blockers |

---

## E2E (`e2e/tests/`)

| Spec File | Tests | Coverage |
|---|---|---|
| `a11y.spec.ts` | 4 | A11y audit on nav, chat, settings, canvas |
| `chat.spec.ts` | 2 | Message send, stream error handling |
| `command-palette.spec.ts` | 3 | Open, search, execute commands |
| `functional-views.spec.ts` | 5 | View switching, radial menu, agent switcher |
| `settings-shell.spec.ts` | 15 | Settings tabs, palette shortcuts, nav tabs, compact viewport, canvas toolbar, **theme persistence** |
| `settings-tabs.spec.ts` | 1 | All 10 settings panels render |
| `visual.spec.ts` | 2 | Visual regression snapshots |

### Known Gaps

- **No real backend IPC**: All E2E tests mock `window.__TAURI__`. A real-backend smoke test would require a headless Tauri build.
- **No network feature coverage**: FTP, SSH, tunnel, browser, transfer, collab are mocked-out.
- **No plugin loading coverage**: Lua plugins are not exercised in E2E.

---

## CI Gates

```
Gate 1: Lint & Format    → cargo fmt, clippy, tsc, prettier, ruff
Gate 2: Build            → cargo check, vite build
Gate 3: Test             → cargo test, **vitest run** ← NEW
Gate 4: E2E              → Playwright (chromium)
Gate 5: KFMS Metadata    → khaotic-init.sh stamp/validate/status
Gate 6: Security         → security_audit.py
```

---

## Recommended Next Testing Priorities

1. **Rust**: Add tests for `scheduler.rs` (time-based logic is pure and testable)
2. **Rust**: Add tests for `commands/session.rs` (file I/O with temp directories)
3. **Frontend**: Add `virtual-scroll.js` tests (pure math, no mocking needed)
4. **E2E**: Add a real-backend smoke test using `tauri-driver` or `cargo run` + `page.goto`
5. **E2E**: Expand `chat.spec.ts` to cover file attachments, slash commands, and search
