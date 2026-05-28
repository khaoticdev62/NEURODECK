# NEURODECK Release Notes

---

## v1.3.0-Isis — Developer Control Layer

**Release Date:** 2026-05-27
**Platform:** Windows (MSI + NSIS), Linux (AppImage + deb), macOS (DMG + app)
**KFMS Codename:** Isis

### Developer Prototyping & Control Features

- **Universal Design/UI System Starter Kit** — Extracted a highly polished, responsive, and completely universal CSS/HTML/JS design system template to `design-system/`. Includes collapsible navigation menus, cinematic loading screens, multiple preview cards, and overlays. Excludes ES6 module imports to ensure local browser execution over `file://` works out-of-the-box (no CORS restrictions).
- **Secure Local Binary Execution pathway** — Configured automatic directory creation for a secure user-space binary folder at `~/.config/neurodeck/bin` on startup (`self_heal.rs`). Handled secure environment variable configuration to inject this custom path safely into the shell sessions and execution pathways (`pty_manager.rs`, `system.rs`).
- **Fuzzy Command Palette Navigation** — Registered all newly added views (Knowledge Graph, Task Scheduler, Workflow Visual Builder, and Monaco IDE) inside `COMMAND_PALETTE_ACTIONS` in `main.js` so they are fully reachable from the `Ctrl+K` overlay and gamepad select controls.
- **FTP/SFTP Streaming & Progress Monitoring** — Hardened download sequences to stream directly to disk rather than consuming memory buffers, and added a `ProgressReader` in Tauri file uploads emitting real-time percentage updates every 64KB.
- **Diagnostics & Self-Healing Utilities** — Upgraded startup checks to detect optional system binaries (Whisper, espeak, SSH utilities) and automatically self-heal minor filesystem directory state issues.

### UI/UX — AAAA Premium Overrides (All 6 Screens)

The full five-screen AAAA CSS pass was extended to the Notifications overlay (Screen 6) in the final commit of this release cycle, completing the premium visual treatment across every core surface:

| Screen | Component | What Changed |
|---|---|---|
| 1 | Chat | Glassmorphic bubble shells, gradient assistant header, RAG badge polish |
| 2 | Canvas | Monaco toolbar elevation, collab pill states, run-output panel |
| 3 | Terminal | Multi-session tab strip, shell-switcher pills, AI ghost-text dim |
| 4 | Memory | Vector card grid, cosine-score badge, pin/delete micro-interactions |
| 5 | Agent | Step-timeline track, roundtable panel, streaming indicator |
| 6 | Notifications | Glassmorphic modal card with `backdrop-filter: blur(16px)`, per-severity left-border glow (cyan / green / amber / red), hover lift, gradient title header |

**CSS surface:** `frontend/src/app.css` — all changes are additive overrides appended after the existing AAAA block. No base selectors were modified; the specificity trap rules in `CLAUDE.md` are intact.

---

## v1.2.2-Ra — Security Hardening Update

**Release Date:** 2026-05-26
**Platform:** Windows (MSI + NSIS), Linux (AppImage + deb), macOS (DMG + app)
**KFMS Codename:** Ra

### Security Hardening (OWASP Compliance)

- **MCP Authentication (CRIT-2)** — Added mandatory Bearer token validation on the HTTP server connection using constant-time comparison (`subtle::ConstantTimeEq`) to mitigate timing attacks.
- **Localhost Canvas Collab (CRIT-4)** — Hardened the Canvas Collaboration server to bind to `127.0.0.1` (localhost) only, blocking external LAN access by default.
- **Sync Key Derivation Hardening (CRIT-5)** — Upgraded the cross-device sync key derivation from raw single-iteration SHA-256 to PBKDF2-HMAC-SHA256 with 100,000 iterations and a random 16-byte salt, stored alongside the payload.
- **Removed Execution Capability Token (HIGH-1)** — Fully retired the `exec_auth_token` parameter from Tauri commands and JS frontend, relying solely on Tauri's IPC origin-verification boundary.
- **CSP Port Hardening (MED-3)** — Restricted localhost and loopback wildcards in the Content Security Policy (CSP) to specific ports (`11434` for Ollama, `1420` for development) in `tauri.conf.json`.
- **MCP Info Disclosure Fix (MED-4)** — Refactored the `get_status` tool in `src-tauri/src/mcp.rs` to return a generic status string instead of exposing API key presence.

---

## v1.2.1-Ra — Bug Fix & Docs Update

**Release Date:** 2026-05-24
**Platform:** Windows (MSI + NSIS), Linux (AppImage + deb), macOS (DMG + app)
**KFMS Codename:** Ra

### Fixes

- **Model switcher modal** — `toggleAgentSwitcher`, `activateAgent`, `deleteAgentById`, and `instantiateRecommended` were module-scoped in the ES module and invisible to inline `onclick` handlers. Exposed all four on `window`. The model button and agent card grid now work correctly.
- **Chat keyboard shortcuts** — `updateRadialDisplay` and `activateRadialSegment` were not exposed on `window`, breaking the radial menu arrow-key navigation (Ctrl+Up/Down/Left/Right, Enter to activate) from chat.js keyboard handlers.
- **Browser speed dial** — `browser_open` Rust command now falls back to a standalone overlay window if `.parent()` is rejected by the platform (WebView2 on Windows desktop mode may refuse HWND child-window parenting). Navigation errors are now surfaced as a visible toast notification instead of being silently logged to the console.
- **Plugin marketplace HTTP 404** — `REGISTRY_URL` pointed at a non-existent GitHub repo. Registry created at `github.com/khaoticdev62/neurodeck-plugins` with 4 initial plugins. Backend now returns an empty registry (graceful degradation) instead of an error on HTTP 404.

### Documentation

- README fully rewritten — v1.2.1 feature set, 11 screenshots, Model Switcher and Plugin Marketplace sections, updated to 12 tabs
- `docs/screenshots/` directory created with curated UI screenshots
- Onboarding wizard updated — 12 views, 56 commands, Prompt Lab card added, radial menu segment list corrected
- Plugin Development Guide added (`docs/PLUGIN_DEV_GUIDE.md`)
- USER_GUIDE.md updated — Model Switcher, Plugin Marketplace, Remote Control, and Browser sections added

---

## v1.2.0-Ra — Share / Tunnel Elevation + Release Packaging

**Release Date:** 2026-05-24
**Platform:** Windows (MSI + NSIS), Linux (AppImage + deb), macOS (DMG + app)
**KFMS Codename:** Ra

### What's New in v1.2.0

#### CI/CD & Release Packaging (Sprint 6.0-B)
- `.github/workflows/ci.yml` fully rebuilt — three-platform matrix (ubuntu-22.04, windows-latest, macos-latest)
- Linux produces AppImage + deb; Windows produces MSI + NSIS; macOS produces DMG + app
- Removed invalid `flatpak` bundle target (not supported in Tauri 2.x)
- Added missing `pkg-config libssl-dev libasound2-dev` apt deps for Ubuntu Rust compilation
- `install.sh` version bumped `1.0.0 → 1.2.0`
- `src-tauri/Cargo.toml` and `tauri.conf.json` versions bumped to `1.2.0`

#### Share & Tunnel View Elevation (Sprint 6.1)
- Tunnel view: inline styles replaced with semantic CSS classes (`tunnel-section`, `input-row`) across all three control groups (start/stop server, client connect, status)
- Share view: header strip (`share-view-header`) with title and subtitle above the inner tabs; inner tabs upgraded to glass-pill style
- LAN panel: inline layout styles replaced with classes matching the share design system
- `loadPluginMarketplace()`: uses semantic CSS classes (`marketplace-loading`, `marketplace-error`) for consistent status feedback

#### Plugin Marketplace
- `src-tauri/src/plugin_mgr.rs`: registry URL set to `https://raw.githubusercontent.com/khaoticdev62/neurodeck-plugins/main/registry.json`
- HTTP 404 returns empty registry (graceful) instead of propagating an error
- User-Agent header and 10-second timeout added to registry fetch
- `github.com/khaoticdev62/neurodeck-plugins` repo created with `registry.json` and 4 Lua plugins (bmad, promptgen, ip_lookup, auto_responder)

#### Settings Improvements
- Test Connection button: `.finally(() => testBtn.disabled = false)` ensures the button is always re-enabled even when the test throws
- Custom hex color inputs: validated with `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/` — invalid hex shows red border, Save is blocked until fixed
- Agent canvas stop: `cancel_generation` failure now surfaces a toast notification instead of silently failing

---

## v1.1.0 — Touch & Onboarding Update

**Release Date:** 2026-05-23
**Platform:** Windows (installer + ZIP), Linux / SteamOS (install.sh), Linux (Flatpak)

### What's New in v1.1.0

#### Steam Deck Touch Controls (4-sprint implementation)
Full native touch support for Steam Deck's 1280×800 touchscreen and both touchpads.

**Sprint A — Touch Polish**
- `touch-action: manipulation` applied globally (body + all view containers) — eliminates the 300ms tap delay that affected every button and input
- `-webkit-tap-highlight-color: transparent` globally — removes WebKit's tap flash overlay
- `initTouchScroll()` — momentum-based touch scroll on all 13 overflow containers (chat, sidebar history, agent log, memory list, FTP/SFTP file lists, onboarding logs, settings content). Includes fling physics on release
- Radial menu touch: single tap on a segment activates the view and closes the menu; double-tap on the backdrop dismisses it

**Sprint B — Virtual Keyboard Overlay**
- Full QWERTY keyboard panel slides up from the bottom of the screen when any text input is focused via touch
- 5 rows: number row, QWERTY, ASDF, ZXCV, bottom strip (Ctrl / Alt / Space / arrow keys / Esc)
- Shift, CapsLock, Ctrl, Alt are sticky modifier keys with visual active state
- Shift auto-releases after one character (standard mobile keyboard UX)
- Zero-latency response via `pointerdown` events (not `click`)
- Dispatches real `KeyboardEvent` to the target so all existing `keydown` handlers fire correctly
- `window.showVirtualKeyboard` / `hideVirtualKeyboard` exposed for external control
- B button dismisses the keyboard

**Sprint C — Touchpad Cursor Overlay (non-Steam fallback)**
- Crosshair cursor overlay (`#tp-cursor`) driven by `gp.axes[2]`/`[3]` (right stick / right touchpad in joystick mode)
- Cursor auto-fades after 2.5 seconds idle, reappears on any axis movement
- R3 click (`buttons[11]`) dispatches a full `pointerdown → mousedown → pointerup → mouseup → click` chain on the element under the cursor
- Scale-pulse click animation for tactile feedback
- Left stick when L2 is not held scrolls the active panel container
- Scroll indicator (`#tp-scroll-indicator`) appears briefly during scroll

**Sprint D — Steam Input VDF Profile**
- `assets/steam_input/neurodeck_gamepad.vdf` — official Steam Input profile for Steam Deck Game Mode
- Right touchpad → `absolute_mouse`: Steam converts to OS cursor events; WebKit receives native `mousemove`/`click` (no JS overlay needed when Steam is running)
- Right touchpad tap → left mouse click; double-tap → right mouse click
- Left touchpad → `scroll_wheel`: all overflow containers scroll natively via OS events
- All face buttons, triggers, bumpers, grip buttons, d-pad → xinput pass-through (Gamepad API unchanged)
- `docs/steam_input_guide.md` fully rewritten with two-layer architecture, full mapping table, VDF install instructions, radial segment map, troubleshooting reference

#### Enhanced Onboarding Wizard
Rebuilt from 4 steps to 5 with richer content and expanded diagnostics.

- **Step 1 — Welcome**: Animated stat counters (22 features / 10 views / 1 Deck) + feature tag pills replacing static text
- **Step 2 (NEW) — Feature Tour**: Staggered-entrance grid showing all 10 NEURODECK views with JPE descriptions
- **Step 3 — Provider Auth**: Provider choice cards (Gemini Key / OAuth / Ollama) now on this slide alongside the config inputs
- **Step 4 — Persona & Theme**: Unchanged
- **Step 5 — Diagnostics**: Expanded from 3 checks to 6 — adds Audio/arecord, SSH binary, TTS/espeak. Soft-pass on optional checks (audio/SSH/TTS non-blocking); hard-pass required on PTY + Keychain only

#### Flatpak Distribution
- `flatpak/com.neurodeck.app.yml` — Flatpak manifest using `org.freedesktop.Platform` 23.08 with `rust-stable` + `node20` SDK extensions
- `flatpak/com.neurodeck.app.metainfo.xml` — AppStream metadata
- `flatpak/com.neurodeck.app.desktop` — XDG desktop entry
- `scripts/shell/build_flatpak.sh` — end-to-end build script that auto-installs missing runtimes, builds via `flatpak-builder`, and exports `neurodeck.flatpak`
- Bundle install: `flatpak install --user neurodeck.flatpak` → run: `flatpak run com.neurodeck.app`

#### README Overhaul
- ASCII art banner, badge row (License, Rust 1.77.2, Tauri v2, Platform, LLM, Version)
- JPE (Just Plain English) explanations throughout — no jargon without a plain-English definition
- Architecture diagram with IPC bridge explanation
- RAG memory plain-English callout
- All 10 views documented in plain English
- Quick Start (4 commands), build targets for all platforms

---

## v1.0.0 — Initial Release

**Release Date:** 2026-05-23
**Platform:** Windows (installer + ZIP), Linux / SteamOS (install.sh)
**Minimum Resolution:** 1280×800

### What Is NEURODECK?

NEURODECK is a Tauri v2 desktop app that turns a Steam Deck into an AI-powered terminal OS. It runs fullscreen in both Desktop Mode and Game Mode, with full gamepad navigation, and combines:

- LLM chat with RAG memory and game-context awareness
- Live code canvas (HTML/CSS/JS preview, Python/Bash/Lua execution)
- Multi-session PTY terminal with AI autocomplete
- SSH client with key and password auth
- FTP/SFTP file browser with drag-drop upload
- LAN P2P file transfer (Warpinator-compatible)
- iPhone remote control via WebSocket + QR pairing
- Local document RAG indexing
- Whisper.cpp offline STT + espeak TTS
- Gamepad radial menu (10 views)
- BMAD multi-agent persona system

### v1.0.0 Feature Summary

#### AI & LLM
- **Chat** — Streaming responses from Gemini (flash/pro) or local Ollama models
- **RAG Memory** — Every message searches a cosine-similarity vector DB; top-3 relevant memories are injected into context automatically
- **Vision / OCR** — Attach a Steam screenshot or system screenshot; Gemini Vision analyzes it inline (Gemini provider only)
- **Game-Aware Mode** — Detects most recently played Steam game, injects optimization notes and game context into LLM system prompt
- **Persona System** — 9 built-in BMAD personas (`/john`, `/sally`, `/dev`, etc.) + custom persona creator in Settings

#### Terminal
- **Multi-PTY** — Up to 5 simultaneous terminal sessions with tab switching
- **AI Autocomplete** — `Ctrl+Space` in any PTY session triggers LLM ghost-text completion; `→` accepts, `Esc` dismisses
- **AI History Search** — `Ctrl+H` opens semantic search over `~/.bash_history` / `~/.zsh_history` / fish history
- **SSH Tab** — Full SSH client, password + key auth, `ConnectTimeout=30` guard

#### Canvas
- **Live Preview** — HTML/CSS/JS renders live in the canvas WebView as you type
- **Language Support** — Python, Bash, Lua execution via Agent; HTML/CSS/JS live preview natively
- **LAN Collaboration** — Host or join a canvas collaboration session over TCP; real-time sync

#### Memory & RAG
- **Vector DB** — Cosine-similarity vector store; persists to `data/memory/chat_history.json`
- **Document Indexing** — Point at any local folder; indexes `.txt`, `.md`, and code files as embeddings
- **RAG Search** — Natural-language search over all indexed documents from the Memory tab

#### File Operations
- **FTP Browser** — Connect to any FTP server; browse, download, upload (streaming — no OOM on large files)
- **SFTP Browser** — Same UI over SSH; supports password and key auth
- **LAN Transfer** — mDNS peer discovery + P2P file transfer; Warpinator gRPC server included

#### Remote & Connectivity
- **iPhone Remote** — Start a WebSocket server from the Remote tab; scan QR code with Safari; send commands from your phone
- **Tunnel** — TCP loopback bridge between SteamOS Desktop Mode and Game Mode

#### Gamepad & Navigation
- **Radial Menu** — L2 (hold) opens a 10-segment radial menu; left stick selects the view; release to navigate
- **D-pad Navigation** — Navigate focusable elements in any view
- **Grip Buttons** — L4 toggles sidebar; R4 toggles context drawer; L5 clears canvas; R5 cycles theme
- **Controller Prompt Picker** — R2 opens a searchable prompt template library

#### Platform
- **Themes** — 6 built-in + custom: BLACKSITE, TERMINAL_GHOST, SYNTH_GRID, CYBER_PUNK, MILITARY, OBSIDIAN
- **Whisper.cpp STT** — Offline speech-to-text (Linux only via `arecord`)
- **espeak TTS** — Offline text-to-speech for AI responses
- **Lua Plugin API** — Drop `.lua` files in `plugins/`; auto-loaded at startup; `registerCommand`, `registerHook`, `setPersona` globals
- **BMAD Agent Framework** — Multi-agent sprint execution with Lua persona plugins
- **MCP Server** — NEURODECK as a tool server for Claude Desktop
- **Cinematic Boot Screen** — Animated boot sequence showing real system state

### System Requirements

| Component | Minimum |
|---|---|
| Platform | Steam Deck (SteamOS 3.x), Linux (Wayland/X11), Windows 10+ |
| Resolution | 1280×800 |
| RAM | 2 GB available |
| Storage | 200 MB for app + dependencies |
| Network | Required for Gemini; optional for Ollama |

### Installation

**SteamOS / Linux:**
```bash
chmod +x install.sh && ./install.sh
```

**Windows:**
Run `neurodeck_installer.exe` (unsigned — Windows SmartScreen will prompt on first run; click "More info → Run anyway").

**Flatpak (Linux, v1.1.0+):**
```bash
chmod +x scripts/shell/build_flatpak.sh && ./scripts/shell/build_flatpak.sh
flatpak install --user neurodeck.flatpak
flatpak run com.neurodeck.app
```

### Known Limitations (v1.0.0)

| Area | Limitation |
|---|---|
| STT | Windows `start_recording` returns mock text — `arecord` is Linux-only |
| Canvas Run | Python/Bash "Run" button shows a hint but doesn't execute — use Agent tab instead |
| Context Drawer | Toggle exists, content panel is empty (planned: active session stats) |
| SSH radial | SSH and Remote tabs not yet in the radial menu segments |
| Warpinator | Requires both devices to be on the same LAN subnet |

### Changelog

- Initial v1.0.0 release
- 22 features shipped across 10 views
- Flatpak manifest included (build on SteamOS)
- Windows NSIS installer + ZIP artifact
