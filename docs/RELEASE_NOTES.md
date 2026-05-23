# NEURODECK v1.0.0 — Release Notes

**Release Date:** 2026-05-23
**Platform:** Windows (installer + ZIP), Linux / SteamOS (install.sh)
**Minimum Resolution:** 1280×800

---

## What Is NEURODECK?

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

---

## v1.0.0 Feature Summary

### AI & LLM
- **Chat** — Streaming responses from Gemini (flash/pro) or local Ollama models
- **RAG Memory** — Every message searches a cosine-similarity vector DB; top-3 relevant memories are injected into context automatically
- **Vision / OCR** — Attach a Steam screenshot or system screenshot; Gemini Vision analyzes it inline (Gemini provider only)
- **Game-Aware Mode** — Detects most recently played Steam game, injects optimization notes and game context into LLM system prompt
- **Persona System** — 9 built-in BMAD personas (`/john`, `/sally`, `/dev`, etc.) + custom persona creator in Settings

### Terminal
- **Multi-PTY** — Up to 5 simultaneous terminal sessions with tab switching
- **AI Autocomplete** — `Ctrl+Space` in any PTY session triggers LLM ghost-text completion; `→` accepts, `Esc` dismisses
- **AI History Search** — `Ctrl+H` opens semantic search over `~/.bash_history` / `~/.zsh_history` / fish history
- **SSH Tab** — Full SSH client, password + key auth, `ConnectTimeout=30` guard

### Canvas
- Live HTML/CSS/JS preview in embedded WebView
- Python, Bash, Lua code execution with output capture
- Live collaboration over LAN (host binds TCP port, peer connects by IP:port)
- Screenshot → Canvas for AI-assisted editing

### File Transfer
- **FTP** — Browse, upload (streaming, no OOM on large files), download
- **SFTP** — Full file browser backed by system `sftp` binary
- **LAN P2P** — mDNS peer discovery + direct TCP transfer; Warpinator-compatible gRPC server
- **Drag-Drop** — Drop files onto FTP/SFTP panels to upload

### Remote Control (iPhone)
- Starts an axum WebSocket server on a configurable port
- Generates QR code containing `ws://<lan-ip>:<port>?pin=<6-digit-pin>`
- Embedded mobile webapp loads in Safari — no App Store install
- Supports: send chat message, run shell command, switch view, PTY output stream

### Knowledge & Memory
- **Vector Memory DB** — Store, search, delete memory entries; cosine similarity; persists to `data/memory/chat_history.json`
- **Local Document RAG** — Index any local folder (`.txt`, `.md`, `.rs`, `.py`, `.js`, `.json`, `.toml`, `.yaml`, `.csv`); documents are chunked and embedded alongside chat memory; progress bar in Settings → Memory
- **MCP Server** — Expose NEURODECK as a Model Context Protocol server; connect from Claude Desktop or any MCP client

### Voice
- **STT** — `arecord` → Gemini cloud transcription on Linux; Whisper.cpp offline path when configured
- **TTS** — `espeak`/`espeak-ng` text-to-speech
- **Whisper STT** — Configure binary + model in Settings → Voice; mic button routes through offline transcription when model file exists

### Gamepad Navigation
- **Radial Menu** — L2 trigger (or backtick on keyboard) opens 10-segment radial ring: Chat, Canvas, Terminal, SSH, Tunnel, Browser, Agent, Memory, Share, Remote
- **D-Pad** — Navigate inner tabs within each view
- **Left Stick** — Select radial segment, navigate list items
- **A/Cross** — Confirm; **B/Circle** — Back/cancel
- **Controller Prompt Picker** — Gamepad-navigable quick-prompt overlay for common LLM tasks

### Settings & Config
- API key entry (Gemini) and OAuth 2.0 Device Flow sign-in
- OS keychain storage for Gemini keys (Windows Credential Manager / Linux Secret Service)
- Theme editor — 8 built-in themes + custom theme creator
- Persona editor
- Whisper STT configuration
- RAG folder indexer
- Ollama model manager (list, pull, delete models)
- Plugin manager (enable/disable Lua plugins)
- MCP server toggle
- BMAD agent framework installer

---

## Installation

### SteamOS / Linux

```bash
chmod +x install.sh
./install.sh
```

The installer:
- Installs `alsa-utils` (`arecord`), `espeak-ng`, and `sshpass` via pacman (SteamOS/Arch)
- Copies the binary to `~/Applications/neurodeck/`
- Creates a `.desktop` launcher and a `neurodeck-launch.sh` wrapper
- Prompts for your Gemini API key and saves it to `~/.config/neurodeck/env`
- Configures Ollama (if `scripts/setup_ollama.sh` is present)
- Configures the SteamOS Desktop Mode tunnel daemon (if `scripts/setup_tunnel.sh` is present)

**Add to Steam Game Mode:**
1. Desktop Mode → Steam → Library → Add a Game → Add a Non-Steam Game
2. Browse to `~/Applications/neurodeck/neurodeck-launch.sh`
3. Rename to `NEURODECK`, click Add
4. Switch to Game Mode — NEURODECK appears in your library

### Windows

Run `neurodeck_installer.exe` (NSIS installer). Sets up the app at `%LocalAppData%\NEURODECK\`.

Or extract `neurodeck_win_release.zip` and run `neurodeck.exe` directly.

**Note:** Voice STT/TTS is Linux-only. Whisper STT works on Windows if you build whisper.cpp from source.

---

## System Requirements

| Requirement | Value |
|---|---|
| Steam Deck / SteamOS | Primary target (SteamOS 3.x / Arch) |
| Linux (other) | Supported; install audio deps manually |
| Windows | Supported; voice features unavailable |
| RAM | 512 MB minimum; 1 GB recommended (for Ollama + LLM context) |
| Disk | 50 MB app + model storage for Whisper/Ollama |
| Internet | Required for Gemini API; optional for Ollama (fully offline) |

---

## Configuration

Edit `llm-term.toml` (in the install directory):

```toml
[llm]
default_provider = "gemini"          # or "ollama"
model = "gemini-1.5-flash"
ollama_url = "http://127.0.0.1:11434"
google_client_id = ""                # Required for OAuth Gemini sign-in
```

Set your Gemini API key:
```bash
export GEMINI_API_KEY="your-key-here"
# Or use: Settings → API Key → Save to OS Keychain
```

For fully offline use, set `default_provider = "ollama"` and install Ollama:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

---

## Whisper STT Setup (Optional)

```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build && cmake --build build -j4
bash models/download-ggml-model.sh base.en
```

Then in NEURODECK Settings → Voice:
- Binary: `./whisper.cpp/build/bin/whisper-cli`
- Model: `./whisper.cpp/models/ggml-base.en.bin`

---

## Known Limitations (v1.0)

| Limitation | Details |
|---|---|
| Voice STT/TTS — Linux only | `arecord` and `espeak` not available on Windows; Whisper path works cross-platform |
| Local doc RAG — Gemini only | `generate_embedding` not implemented for Ollama; Gemini API key required |
| Vision (screenshot → chat) — Gemini only | Ollama does not process image attachments; warning shown in chat |
| SSH history search — reads bash + zsh + fish | Fish history format differs from bash; entries may parse with minor noise |
| Canvas Python/Bash Run — hint only | Run button shows execution note; actual execution happens in the Agent tab |
| Game detection — most recently played, not currently running | `is_running` detection via `pgrep` requires the game process name to match ACF manifest |
| Canvas Collab — manual IP:port | No automatic peer discovery; share `<your-lan-ip>:13338` with collaborator |
| SSH/FTP profiles saved to localStorage | Will be migrated to disk-persisted JSON in v1.1 |

---

## Post-v1.0 Roadmap

- Ollama embedding support for offline RAG
- SSH/FTP/SFTP profiles migrated from localStorage to disk
- Canvas Python/Bash execution wired to Run button (not just Agent tab)
- Whisper model download button in Settings
- SteamDB / community game optimization notes
- Multi-window support (canvas in secondary window)

---

## Changelog

### v1.0.0 (2026-05-23)
- Full 22-feature production release (P1–P22)
- Remote Control: iPhone WebSocket + QR pairing + embedded Safari webapp
- AI Terminal Autocomplete (`Ctrl+Space` ghost text)
- Local Document RAG (index any folder, 500-file limit, 4 KB chunk, progress bar)
- Radial Menu expanded to 10 segments — SSH and Remote added
- FTP: streaming download/upload (no OOM on large files)
- SSH: `ConnectTimeout=30` prevents hung reader threads
- Code signing support in `package_release.ps1` (`NEURODECK_CERT_THUMBPRINT`)
- Controller Prompt Picker extracted to `ctrl_prompt.js` ES module
- Remote Control view extracted to `remote_control_view.js` ES module
- install.sh: auto-install `alsa-utils`, `espeak-ng`, `sshpass` on SteamOS
- Version: bumped from 0.1.0 → 1.0.0 throughout
