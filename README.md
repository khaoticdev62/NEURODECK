```
███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██║  ██║█████╗  ██║     █████╔╝
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║  ██║██╔══╝  ██║     ██╔═██╗
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██████╔╝███████╗╚██████╗██║  ██╗
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
                    AI-POWERED TERMINAL OS FOR STEAM DECK
```

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-00F0FF?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.77.2-FF4500?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/Platform-Steam%20Deck%20%7C%20Linux%20%7C%20Windows-1A9FFF?style=for-the-badge&logo=steamdeck&logoColor=white)](https://www.steamdeck.com/)
[![LLM](https://img.shields.io/badge/LLM-Gemini%20%7C%20Ollama-8A2BE2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Version](https://img.shields.io/badge/Version-1.0.0-39FF14?style=for-the-badge)](https://github.com/khaoticdev62/NEURODECK/releases)

**[GitHub](https://github.com/khaoticdev62/NEURODECK)** &nbsp;·&nbsp; **[User Guide](docs/USER_GUIDE.md)** &nbsp;·&nbsp; **[Release Notes](docs/RELEASE_NOTES.md)** &nbsp;·&nbsp; **[Sprint Roadmap](docs/SPRINT_HANDOFF.md)**

</div>

---

## 🧠 What Is NEURODECK?

NEURODECK is a **fullscreen desktop app** for Steam Deck (and Linux/Windows) that replaces your standard terminal with an AI-powered OS interface — all inside a single 1280×800 window purpose-built for the Deck's screen.

**In plain English:** Imagine if your terminal, an AI chatbot, a live code editor, an SSH client, and a file transfer tool all lived in one app — controllable with your gamepad, keyboard, or even your iPhone. That is NEURODECK.

It runs a **Rust backend** (via [Tauri v2](https://tauri.app/)) alongside a **vanilla JavaScript frontend** — no React, no Vue, zero bloat. The AI is powered by Google Gemini (streaming over SSE) or a local Ollama model. Everything talks to each other through a clean IPC bridge. The whole thing is designed to be used on a couch, with a controller, in Steam Deck Game Mode.

---

## ✨ What Can It Do?

| Capability | Plain English |
|---|---|
| 💬 LLM Chat with Memory | Talk to Gemini or Ollama. It remembers what you said before — automatically. |
| 🧠 Vector Memory (RAG) | Silently injects relevant past conversations and your own documents into every AI reply. |
| 💻 Real Shell (PTY) | A proper multi-session terminal — not a fake one. Runs Bash/Zsh with full process control. |
| 🤖 Autonomous Agent | Tell it a task. It writes code, runs it, reads the output, and iterates — 5 steps, hands-free. |
| 🎨 Live Code Canvas | Write HTML/CSS/JS and see it render instantly. Collaborate on a canvas with someone on your LAN. |
| 🔑 SSH Client | Connect to remote servers. Full terminal passthrough with password or key auth. |
| 📤 LAN File Transfer | Send files to nearby devices via mDNS peer discovery and Warpinator gRPC — no cloud, no setup. |
| 📱 iPhone Remote | Start a WebSocket server, scan a QR code, control NEURODECK from Safari on your phone. |
| 🎮 Gamepad Native | L2 trigger opens a radial menu. Left stick picks a view. Zero keyboard required. |
| 🔌 Lua Plugin API | Drop a `.lua` file in `plugins/` — it auto-loads on startup. Register commands and hooks. |

---

## 🚀 Quick Start

> **Prerequisites:** [Rust toolchain](https://rustup.rs/), [Node.js 18+](https://nodejs.org/), and either a `GEMINI_API_KEY` environment variable set or [Ollama](https://ollama.com/) running locally.

```bash
git clone https://github.com/khaoticdev62/NEURODECK.git && cd NEURODECK
npm install --prefix frontend
export GEMINI_API_KEY="your-key-here"
npm run tauri dev
```

That's it. Vite hot-reloads the frontend; Cargo compiles the Rust backend. **First build takes 2–3 minutes** — `mlua` compiles Lua 5.4 from source (vendored feature). Subsequent builds are fast.

---

## 🖥️ The 10 Views — What Each Tab Does

Every tab lives inside the single 1280×800 window. Switch between them with the radial menu (backtick `` ` `` or gamepad L2), or click the tab bar at the top.

| # | Tab | What It Does |
|---|---|---|
| 1 | 💬 **Chat** | Stream-chat with Gemini or Ollama. RAG memory auto-injects top 3 relevant past messages and documents into every AI reply. Detects what game you're playing and adds it as context. Switch AI personas with `/john`, `/sally`, etc. |
| 2 | 🎨 **Canvas** | Live HTML/CSS/JS sandbox with instant preview. Also supports Python, Bash, and Lua execution. Collaborate on a shared canvas with someone on your LAN — host binds a port, peer connects. |
| 3 | 💻 **Terminal** | Full PTY shell with multi-session support. Press **Ctrl+Space** for AI autocomplete of your partial command. Press **Ctrl+H** for AI-powered shell history search. Real process signals, ANSI colors, the works. |
| 4 | 🔑 **SSH** | Built-in SSH client tab. Password or key-based auth. Each session gets its own PTY with a `ConnectTimeout=30` guard to prevent the UI from hanging on a bad host. |
| 5 | 🔗 **Tunnel** | TCP loopback bridge between SteamOS Game Mode and Desktop Mode. Lets apps communicate across the mode boundary that Steam OS enforces. |
| 6 | 🌐 **Browser** | Embedded WebView panel for quick documentation lookups without leaving the app. |
| 7 | 🤖 **Agent** | Give it a task in plain English. It runs a 5-step autonomous loop: plan → write code → execute → read output → iterate. Every step is streamed to the UI live. |
| 8 | 🧠 **Memory** | Browse and search the local vector database. Index your own document folders (`.txt`, `.md`, code files). Query it manually with cosine-similarity search. |
| 9 | 📤 **Share** | LAN P2P file transfer via mDNS peer discovery. Browse FTP and SFTP servers. Send files via Warpinator gRPC (compatible with the Linux Warpinator app). |
| 10 | 📱 **Remote** | Start a WebSocket server on a local port. A QR code appears — scan it with your iPhone. A Safari webapp lets you send commands, switch views, and watch terminal output from your couch. |

---

## 🏗️ How It Works — Under the Hood

> This section explains the architecture in plain English. Skip it if you just want to run the app — but read it if you want to contribute or extend NEURODECK.

### The Two Halves

NEURODECK splits into two processes that communicate through [Tauri's IPC bridge](https://tauri.app/v2/guides/inter-process-communication/):

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (WebView / Chromium engine)                      │
│                                                             │
│  frontend/src/main.js          ~11,000 lines, vanilla JS   │
│  frontend/src/ctrl_prompt.js   AI terminal autocomplete    │
│  frontend/src/remote_control_view.js   iPhone remote UI    │
│                                                             │
│  Uses: xterm.js (terminal), marked.js (Markdown render)    │
│                                                             │
│  invoke("command_name", { args })  ──────────────────────► │
│  listen("event_name", handler)    ◄────────────────────── │
└─────────────────────────────────────────────────────────────┘
                          IPC Bridge (Tauri v2)
┌─────────────────────────────────────────────────────────────┐
│  BACKEND  (Rust / Tauri v2)                                 │
│                                                             │
│  src-tauri/src/lib.rs        ~1,800 lines                  │
│    All #[tauri::command] handlers, AppState, themes,       │
│    personas, game detection, voice I/O, agent loop         │
│                                                             │
│  ├── llm.rs          Gemini SSE streaming + Ollama          │
│  ├── pty_manager.rs  Real PTY sessions (portable-pty)       │
│  ├── memory.rs       Vector DB, cosine similarity           │
│  ├── ftp.rs          FTP client (suppaftp, sync wrapped)    │
│  ├── sftp.rs         SFTP client (ssh2)                     │
│  ├── transfer.rs     LAN P2P + Warpinator gRPC + mDNS      │
│  ├── canvas_collab.rs  TCP live canvas sync                 │
│  ├── whisper.rs      Voice transcription (system tools)     │
│  ├── remote_control.rs  axum WebSocket server               │
│  └── tunnel.rs       TCP loopback bridge                    │
└─────────────────────────────────────────────────────────────┘
```

**Request/response** (load settings, get personas, etc.) uses `invoke()` — it returns a value directly.
**Streaming** (LLM tokens, terminal output, agent steps) uses `emit()` events → frontend `listen()` handlers receive chunks in real time as they arrive.

### Infrastructure Crate

A separate Rust workspace crate (`neurodeck_infrastructure`) handles platform-level services:

| Module | What It Does (Plain English) |
|---|---|
| `secrets.rs` | Saves/reads your API key from the **OS keychain** (Windows Credential Manager, Linux Secret Service, macOS Keychain) — never stored in a plaintext config file. |
| `oauth.rs` | Google OAuth2 **Device Flow** — shows a short code for you to enter at `google.com/device`. No browser redirect needed. Works from a terminal-only environment. |
| `warpinator.rs` | Full **gRPC server** (tonic 0.11) implementing the Warpinator file-transfer protocol — compatible with the Linux Warpinator desktop app. |

<details>
<summary><strong>Full Rust module layout (click to expand)</strong></summary>

```
src-tauri/
├── src/
│   ├── lib.rs              # All #[tauri::command] handlers, AppState, themes, personas
│   ├── llm.rs              # GeminiProvider (SSE) + OllamaProvider; generate_embedding()
│   ├── pty_manager.rs      # PTY sessions via portable-pty; HashMap<String, PtySession>
│   ├── memory.rs           # Cosine-similarity vector DB; persists to data/memory/
│   ├── ftp.rs              # suppaftp FTP client; all ops wrapped in spawn_blocking
│   ├── sftp.rs             # SFTP client via ssh2
│   ├── transfer.rs         # LAN P2P + Warpinator gRPC server + mDNS discovery
│   ├── canvas_collab.rs    # TCP canvas collaboration — host/join
│   ├── whisper.rs          # Voice STT via system arecord/espeak
│   ├── remote_control.rs   # axum WebSocket server for iPhone remote
│   └── tunnel.rs           # TCP loopback bridge (Game Mode <-> Desktop Mode)
├── Cargo.toml
└── llm-term.toml           # Runtime config (THIS is the file the binary reads)

infrastructure/
├── src/
│   ├── lib.rs
│   ├── secrets.rs          # OS keychain via keyring 2.x
│   ├── oauth.rs            # Google Device Flow OAuth
│   └── warpinator.rs       # gRPC server (tonic 0.11)
├── build.rs                # protoc-bin-vendored for .proto compilation
└── Cargo.toml

frontend/
├── src/
│   ├── main.js             # ~11,000 lines — all UI, all view logic
│   ├── ctrl_prompt.js      # AI terminal autocomplete module
│   └── remote_control_view.js  # iPhone remote control view
└── index.html

plugins/
├── bmad.lua                # BMAD personas (/john, /sally, etc.)
└── promptgen.lua           # Prompt Lab commands (/promptlab, /formula)
```

</details>

---

## 🧠 How the AI Memory Works

> **Plain English — read this once, understand it forever.**

> When you send a message in the Chat tab, NEURODECK does three things simultaneously behind the scenes:
>
> 1. **Converts your message into a number array** called an "embedding" — a mathematical fingerprint of what your message *means*, not just what words it contains.
> 2. **Compares that fingerprint** against every past message and indexed document in the local vector database using cosine similarity — basically: "how close in meaning are these two things on a scale of 0 to 1?"
> 3. **Takes the top 3 closest matches** and silently prepends them to the AI's context before your message is sent.
>
> The AI never sees a lookup query. It just sees your message with the relevant context already attached. This is called **RAG — Retrieval-Augmented Generation**. It means the AI can recall conversations from weeks ago without you repeating yourself, and it can reference your own documents as if it read them.
>
> The vector DB lives in `data/memory/chat_history.json`. Every conversation is stored as an embedding + raw text pair. Point NEURODECK at any folder of `.txt`, `.md`, or code files in the Memory tab to index your own docs the same way.

---

## ⚡ Key Features in Plain English

### 🎮 Gamepad Navigation

The entire app is navigable with a Steam Deck controller. Hold **L2** to open a 10-segment radial menu — each segment is a tab. Use the **left stick** to highlight the segment, release L2 to jump there. The **D-pad** navigates inner tabs (like multiple SSH sessions). No keyboard, no mouse required — designed for couch sessions and Game Mode.

To enable full gamepad support: load the NEURODECK Steam Input profile described in [`docs/steam_input_guide.md`](docs/steam_input_guide.md). The `.vdf` profile maps L2 → radial, stick → segment selection, D-pad → inner tab navigation.

### ⌨️ AI Terminal Autocomplete

Type a partial command in the terminal and press **Ctrl+Space**. NEURODECK sends that partial command to the active LLM and streams back a suggested completion. Press **→** (right arrow) to accept it. Escape to dismiss. Powered by `ctrl_prompt.js` and the `ai_terminal_autocomplete` Tauri command.

### 🤖 5-Step Autonomous Agent Loop

The Agent tab runs a deterministic, observable loop:

1. **Plan** — AI outlines the approach in plain English
2. **Write** — generates the code or script
3. **Execute** — runs it in a PTY subprocess
4. **Observe** — reads stdout/stderr
5. **Iterate** — if it failed, revises and reruns (up to 5 cycles total)

Every step is streamed to the UI in real time. You watch it think and work. Nothing is hidden.

### 📱 iPhone Remote Control

1. Open the **Remote** tab and hit **Start Server**.
2. A QR code appears on screen — scan it with iPhone Camera.
3. Safari opens a webapp served from the local `axum` WebSocket backend.
4. From your phone: type commands, switch views, watch live terminal output.

Built entirely with `remote_control.rs` (axum + tokio WebSocket). Zero external service — pure LAN.

### 🔌 Lua Plugin System

Drop any `.lua` file into the `plugins/` folder. NEURODECK loads it at startup via `mlua` (Lua 5.4, compiled from source). Available globals:

```lua
print("hello from lua")
execute("any_bash_command_here")
registerCommand("/mycommand", function(args) ... end)
registerHook("before_send", function(msg) return msg end)
setPersona("developer")
```

Syntax errors in a plugin silently suppress that plugin — the app keeps running. Check the Tauri terminal console for `[Lua Error]` lines.

---

## 🎨 Themes & Personas

### Built-In Themes

| Name | Accent Color | Vibe |
|---|---|---|
| BLACKSITE | `#00F0FF` | Cold cyan ops center |
| TERMINAL_GHOST | `#00FFCC` | Classic green phosphor |
| SYNTH_GRID | `#FF00FF` | Retrofuture magenta |
| CYBER_PUNK | `#FF007F` | Hot pink neon |
| MILITARY | `#39FF14` | Tactical green |
| OBSIDIAN | `#7C3AED` | Deep purple haze |
| Custom | any hex | Define it in Settings |

Switch themes in the Settings panel. To add new themes in code: add an entry to the `THEMES` `lazy_static` in `lib.rs`.

### AI Personas — Switch Mid-Conversation

Type a persona command in the Chat tab to instantly shift the AI's response style and framing:

| Command | Persona | Role Framing |
|---|---|---|
| (default) | Default | Balanced general assistant |
| `/developer` | Developer | Code-first, terse, technical |
| `/cyberpunk` | Cyberpunk | Street-tech aesthetic |
| `/john` | John | Product manager mindset |
| `/sally` | Sally | UX and user empathy focus |
| `/winston` | Winston | Systems architecture thinking |
| `/amelia` | Amelia | Implementation-focused dev |
| `/paige` | Paige | Technical writing voice |
| `/mary` | Mary | Business analyst framing |
| Custom | yours | Define via Lua `setPersona()` |

Personas are defined in two places: the `PERSONAS` map in `lib.rs` (hardcoded fallback) and `plugins/bmad.lua` (Lua-registered at runtime). If Lua fails to load, the hardcoded fallback still works.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `` ` `` (backtick) | Open radial menu |
| `Ctrl+Space` | AI terminal autocomplete |
| `Ctrl+H` | AI shell history search |
| `Escape` | Close overlays / dismiss menus |
| Gamepad **L2** | Open radial menu |
| Gamepad **Left Stick** | Select radial segment |
| Gamepad **D-pad** | Navigate inner tabs (SSH sessions, etc.) |

---

## ⚙️ Configuration

NEURODECK is configured via TOML. **Two copies must be kept in sync:**

- `src-tauri/llm-term.toml` — read by the Rust binary at runtime (working dir is `src-tauri/`)
- `llm-term.toml` (project root) — used by installer and deploy scripts

```toml
[llm]
provider = "gemini"           # "gemini" or "ollama"
model = "gemini-pro"
google_client_id = ""         # Required for OAuth device-flow sign-in

[ollama]
base_url = "http://localhost:11434"
model = "llama3"

[app]
theme = "BLACKSITE"
persona = "default"
```

**Required environment variable:**

```bash
# Linux / macOS / SteamOS
export GEMINI_API_KEY="AIza..."

# Windows PowerShell
$env:GEMINI_API_KEY = "AIza..."
```

If `GEMINI_API_KEY` is absent, the app silently falls back to Ollama with no visible error. Set it before running `npm run tauri dev`.

---

## 🏗️ Building & Deploying

### Development

```bash
# Full hot-reload dev server (Vite + Rust, recommended)
npm run tauri dev

# Frontend only — uses mock IPC, no Rust needed
npm run --prefix frontend dev

# Fast Rust type-check (no full compile, ~10 seconds)
cd src-tauri && cargo check

# Rust linter
cd src-tauri && cargo clippy
```

### Production Builds

**Windows — NSIS installer:**
```powershell
npx tauri build --bundles nsis
.\package_release.ps1
```

**SteamOS — direct deploy to `~/Applications/neurodeck/`:**
```bash
chmod +x install.sh && ./install.sh
```

**Linux Flatpak:**
```bash
chmod +x build_flatpak.sh && ./build_flatpak.sh
flatpak install --user neurodeck.flatpak
```

**Steam Deck Game Mode (gamescope 1280×800):**
```bash
./launch_gamescope.sh
```

---

## 📁 Documentation

| Document | What It Covers |
|---|---|
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Full feature walkthrough for end users |
| [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) | v1.0.0 changelog and known issues |
| [`docs/SPRINT_HANDOFF.md`](docs/SPRINT_HANDOFF.md) | Remaining sprint roadmap and priority matrix |
| [`docs/gamescope_guide.md`](docs/gamescope_guide.md) | SteamOS Game Mode integration, gamescope flags |
| [`docs/steam_input_guide.md`](docs/steam_input_guide.md) | Steam Input controller mapping and `.vdf` profile |
| [`CLAUDE.md`](CLAUDE.md) | AI coding context — architecture rules, gotchas, tribal knowledge for contributors and AI assistants |

---

## 🛠️ Contributing

1. **Fork** the repo and create a feature branch off `main`.
2. **Follow the IPC triad rule** — every new Tauri command needs three things: (1) a `#[tauri::command]` function in a `src/` module, (2) an entry in `generate_handler![]` in `lib.rs`, and (3) a case in the mock IPC switch in `main.js`. Miss any step and it silently fails in browser dev mode.
3. **No npm packages** — the frontend is zero-dependency by design. Use CDN or vendored assets only (xterm.js, marked.js, and Tauri's JS API are the only allowed deps).
4. **No `unwrap()` in Tauri handlers** — use `map_err(|e| e.to_string())?`. Panics crash the backend process silently.
5. **CSS specificity trap** — never add `display: flex` or `display: block` to `#view-*` ID rules in `app.css`. ID selectors (specificity 100) override the `.view-content { display: none }` hide rule (specificity 20) and permanently break tab switching. Only use class selectors for display toggling.
6. Open a PR with a clear description of what changed and why. Reference the relevant section of `CLAUDE.md` if your change touches a known gotcha.

<details>
<summary><strong>Full contributor gotcha list (click to expand)</strong></summary>

- **Four copies of `llm-term.toml`** exist across the project. Only `src-tauri/llm-term.toml` is read at runtime. Always edit that one and the root copy together.
- **`main.js` template strings** are one massive string literal per section. Match full containing elements when editing — never search for a partial string. Ambiguous edits corrupt the HTML.
- **PTY double-spawn** — always call `pty_kill` before `pty_spawn` with the same session ID. Double-spawning the same ID leaves the old reader thread running as an invisible leak.
- **FTP large files** — `retr_as_buffer` loads the entire file into RAM. For user-selectable files, stream to disk. Don't use `retr_as_buffer` for anything that could be over 100MB.
- **`suppaftp` and `std::net::TcpStream` are synchronous** — always wrap in `tokio::task::spawn_blocking`. Calling them on the async executor blocks the entire runtime.
- **Lua plugin errors** are silent — a syntax error suppresses that plugin and the app keeps running. Check the Tauri terminal console for `[Lua Error]` lines.
- **RAG requires Gemini** — `generate_embedding()` calls the Gemini API. If Ollama is the active provider, RAG is silently skipped for that session.
- **Radial menu gap** — the radial menu currently maps the original 8 views. The SSH tab is not yet included. Adding it requires updating the radial menu segment definitions in `main.js`.
- **Config path fallback** — the Rust binary checks for `../llm-term.toml` first (project root) then falls back to `llm-term.toml` (current working dir, which is `src-tauri/` during dev). Never hardcode just `"llm-term.toml"` — the path logic in `lib.rs` is load-bearing.

</details>

---

## 📜 License

MIT — see [`LICENSE`](LICENSE) for full terms.

---

<div align="center">

**Built for the Steam Deck. Runs anywhere.**

[github.com/khaoticdev62/NEURODECK](https://github.com/khaoticdev62/NEURODECK) &nbsp;·&nbsp; App ID: `com.neurodeck.app` &nbsp;·&nbsp; v1.0.0

</div>
