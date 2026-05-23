# NEURODECK Release Notes

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
- `build_flatpak.sh` — end-to-end build script that auto-installs missing runtimes, builds via `flatpak-builder`, and exports `neurodeck.flatpak`
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
chmod +x build_flatpak.sh && ./build_flatpak.sh
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
