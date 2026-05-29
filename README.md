<div align="center">

```
███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██║  ██║█████╗  ██║     █████╔╝
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║  ██║██╔══╝  ██║     ██╔═██╗
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██████╔╝███████╗╚██████╗██║  ██╗
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

### AI-Powered Terminal OS for Steam Deck

[![License: Proprietary EULA](https://img.shields.io/badge/License-Proprietary%20EULA-D32F2F?style=for-the-badge&logo=probot&logoColor=white)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.92.0-FF4500?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/Platform-Steam%20Deck%20%7C%20Linux%20%7C%20Windows-1A9FFF?style=for-the-badge&logo=steamdeck&logoColor=white)](https://www.steamdeck.com/)
[![LLM](https://img.shields.io/badge/LLM-Gemini%20%7C%20Ollama%20%7C%20OpenAI--Compat-8A2BE2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Version](https://img.shields.io/badge/Version-1.5.1--Horus-39FF14?style=for-the-badge)](https://github.com/khaoticdev62/NEURODECK/releases)
[![Plugins](https://img.shields.io/badge/Plugins-33-FF6B00?style=for-the-badge&logo=lua&logoColor=white)](https://github.com/khaoticdev62/neurodeck-plugins)

**[Download](https://github.com/khaoticdev62/NEURODECK/releases/latest)** &nbsp;·&nbsp; **[User Guide](docs/USER_GUIDE.md)** &nbsp;·&nbsp; **[Plugin Registry](https://github.com/khaoticdev62/neurodeck-plugins)** &nbsp;·&nbsp; **[Changelog](docs/RELEASE_NOTES.md)**

</div>

---

<div align="center">

![NEURODECK Boot Screen](docs/screenshots/boot.png)

*Cinematic boot sequence — real system state, live plugin loading, LLM health check.*

</div>

---

## ⚡ What Is NEURODECK?

NEURODECK is a **fullscreen desktop app** that turns a Steam Deck (or any Linux/Windows machine) into a purpose-built AI workstation — all inside a single 1280×800 window designed for the Deck's screen.

**In plain English:** Imagine if your terminal, an AI chatbot, a live code editor, an SSH client, a file transfer tool, a browser, and an autonomous coding agent all lived in one app — switchable with your gamepad's left thumb, no keyboard required. That is NEURODECK.

The backend is **Rust + Tauri v2**. The frontend is **vanilla JavaScript** — no React, no Vue, zero npm bloat. AI runs through Google Gemini (streaming SSE), any local Ollama model, or any **OpenAI-compatible endpoint** (Groq, OpenRouter, llama.cpp, Mistral, LM Studio). A Lua plugin API lets you extend it with a single `.lua` file drop.

Built to be used from a couch, in Game Mode, with a controller in your hands.

---

## 🌌 The Interface

<div align="center">

![Chat View](docs/screenshots/chat.png)

*Chat tab — AI assistant with contextual prompt cards, RAG memory injection, multi-persona switching, and image attachments.*

</div>

---

## 🦾 Core Superpowers

NEURODECK replaces 8 different developer tools with a unified, controller-navigable interface:

> ### 💬 **LLM Chat + RAG Memory**
> Full streaming chat with Gemini, Ollama, or any OpenAI-compatible endpoint (Groq, OpenRouter, llama.cpp, Mistral, LM Studio, Together, Perplexity). Past conversations and your own docs are silently injected into every reply via cosine-similarity vector memory. When a provider doesn't support embeddings, RAG falls back to keyword search automatically — no config required.

> ### 📁 **Session Browser**
> Persistent conversation history in the sidebar. Browse, rename, restore, and delete past sessions without ever leaving the app. Sessions auto-save to disk and persist across restarts.

> ### 📤 **Chat Export**
> Export any conversation as **Markdown**, **self-contained HTML**, or **raw JSON** — one click from the session header. HTML exports are styled and shareable with zero external dependencies.

> ### 🗂️ **Minimize to Tray**
> Closing the window hides NEURODECK to the system tray instead of quitting — background agent tasks and scheduled automations keep running. Single click on the tray icon toggles the window. Opt-out in Settings → General.

> ### 🧪 **Prompt Lab & Visual Formula Builder**
> Interactively build prompts using industry-standard formulas (AIDA, SCQA, PASTOR, Chain-of-Thought, PAS). Features a template gallery and a JPE explanation pane backed by the active LLM.

> ### 🎮 **DeckCode Smart Snippets**
> Press a gamepad sequence to instantly trigger macros, open terminals, or send prompts. Dynamically inject multi-language code blocks straight into your IDE or Canvas with `${cursor}` placeholder support.

> ### 🤖 **Autonomous Agent Loop**
> Give it a task in plain English. It writes code, runs it, reads the output, and iterates — up to 5 steps, fully observable in real time.

> ### 💻 **Real PTY Shell & IDE**
> Multi-session Bash/Zsh with full process control, ANSI colors, and AI autocomplete on `Ctrl+Space`. Plus, a mini IDE equipped with an LSP client.

> ### 🌐 **SSH & FTP Profiles**
> Built-in SSH client and FTP/SFTP manager with persistent connection profiles and drag-and-drop file transfers.

> ### 🎨 **Live Code Canvas**
> Write HTML/CSS/JS and see it render instantly, split-pane. LAN canvas collaboration allows you to host a session where peers can edit together in real time.

> ### 📖 **JPE App Manual**
> Press **F1** from anywhere, type `/manual` in chat, or search "manual" in the command palette to open the full interactive manual — searchable, accordion-organized, with per-feature launch buttons and live system health diagnostics.

> ### 📤 **Zero-Cloud LAN Ecosystem**
> Warpinator-compatible P2P file transfers over mDNS, WebSocket iPhone remote control, and local Torrents. All running directly on your LAN.

> ### ⚙️ **Model Context Protocol (MCP)**
> Hot-plug any standard MCP server (Chrome DevTools, GitHub, Firebase, local files) directly into the agent's brain.

> ### 👥 **BMAD Agent Ensemble**
> Ships out-of-the-box with a complete virtual software studio: Product Managers, Systems Architects, UX Designers, and Developers — toggle with `/persona` or the BMAD Lua plugin.

> ### 🎛️ **Command Palette + Custom Shortcuts**
> `Ctrl+K` opens a fuzzy-search palette with 40+ commands — navigate views, toggle settings, open sessions. All keyboard shortcuts are **fully rebindable** in Settings → General; overrides persist across restarts.

---

## 🧩 The Lua Plugin System

Drop any `.lua` file into `plugins/`. NEURODECK loads it at startup via `mlua` (Lua 5.4, compiled from source). Available globals:

```lua
print("hello from lua")
execute("any_bash_command")
registerCommand("/mycommand", function(args) ... end)
registerHook("before_send", function(msg) return msg end)
setPersona("developer")
```

The built-in **Plugin Marketplace** (Settings → Extensions) connects to the [neurodeck-plugins](https://github.com/khaoticdev62/neurodeck-plugins) registry. Filter by **category** (AI, Productivity, System, Integration, Network, Gaming, Utility), search by name or tag, and install without leaving the app. Update badges appear when a newer version is available in the registry.

### Plugin Registry — 33 Plugins

| Category | Plugins |
|---|---|
| **AI** | BMAD Personas, Prompt Generator, AI Tools, AI Translator |
| **Productivity** | Quick Notes, Code Snippets, Command Aliases, Developer Journal, Sprint Tracker, Clipboard Manager, RSS Reader, URL Bookmarks, Document Templates, Auto Responder, Workspace Manager |
| **System** | System Monitor, Steam Deck Tools, File Tools, Developer Tools, Package Manager Tools, Screen Tools |
| **Integration** | Git Operations, Docker Toolkit, Code Runner, Webhook Receiver, Database Tools |
| **Network** | IP Lookup, Network Checker |
| **Utility** | Time Tools, Crypto Utilities, Weather, Calculator |
| **Gaming** | Steam Deck Tools |

---

## 🏛️ Architecture & Standards

- **Khaotic Foundation Metadata Standard (KFMS v1.0):** Strict release gating, automated `meta.json` governance, and semantic versioning driven by Egyptian god codenames (v1.5.x = Horus, v1.6.x = Bastet).
- **Zero-Bloat Frontend:** Written entirely in Vanilla HTML/CSS/JS with ES module splits (`chat.js`, `agent.js`, `memory.js`, `terminal.js`, `canvas.js`, `radial.js`, `palette-commands.js`, and more). No React, no bundler overhead in production.
- **Tauri IPC:** Native capabilities (filesystem, network, PTY, Bluetooth) are handled by a lightweight Rust backend. All Tauri commands live in focused sub-modules under `src-tauri/src/commands/`.
- **Security Hardened:** Constant-time string comparison on all auth paths (PIN, session token, tunnel token). No sensitive values in stdout/logs. Dialog ARIA semantics. XSS-safe message rendering throughout.
- **Test Coverage:** 78 unit tests (Vitest) + 105 E2E tests (Playwright) covering every primary view, settings panel, keyboard flow, accessibility concern, edge case, and viewport — including Steam Deck 1280×800.

---

## 🖥️ Feature Visuals

<table>
<tr>
<td align="center" width="50%">

![Chat Response](docs/screenshots/chat-response.png)
**Chat** — Streaming response with syntax-highlighted code blocks, Copy / Send to Canvas / Execute action buttons per block.

</td>
<td align="center" width="50%">

![Canvas](docs/screenshots/canvas.png)
**Canvas** — Split-pane live HTML/CSS/JS editor with LAN collaboration.

</td>
</tr>
<tr>
<td align="center" width="50%">

![Terminal](docs/screenshots/terminal.png)
**Terminal** — Multi-session PTY shell with AI autocomplete.

</td>
<td align="center" width="50%">

![SSH](docs/screenshots/ssh.png)
**SSH** — Built-in client with saved profiles and key auth.

</td>
</tr>
<tr>
<td align="center" width="50%">

![Browser](docs/screenshots/browser.png)
**Browser** — Native WebView with speed-dial bookmarks.

</td>
<td align="center" width="50%">

![Agent](docs/screenshots/agent.png)
**Agent** — 5-step autonomous loop with real-time step trace.

</td>
</tr>
<tr>
<td align="center" width="50%">

![Prompt Lab](docs/screenshots/prompt-lab.png)
**Prompt Lab** — Visual formula builder with JPE explanation.

</td>
<td align="center" width="50%">

![Share](docs/screenshots/share.png)
**Share** — LAN P2P file transfer, FTP/SFTP, and Torrent.

</td>
</tr>
<tr>
<td align="center" width="50%">

![Memory](docs/screenshots/memory.png)
**Memory** — Cosine-similarity vector DB with search and backup.

</td>
<td align="center" width="50%">

![Tunnel](docs/screenshots/tunnel.png)
**Tunnel** — Game Mode to Desktop Mode TCP loopback bridge.

</td>
</tr>
<tr>
<td align="center" width="50%">

![Remote Control](docs/screenshots/remote.png)
**Remote** — WebSocket server + QR code for mobile control.

</td>
<td align="center" width="50%">

![Settings](docs/screenshots/settings.png)
**Settings** — Provider config, shortcut rebinding, tray behavior, themes, TTS, MCP.

</td>
</tr>
</table>

---

## 🚀 Installation

### Steam Deck (Recommended)

```bash
# 1. Download the AppImage from the releases page
# 2. Open Desktop Mode → Konsole

chmod +x ~/Downloads/neurodeck_1.5.1_steamdeck_amd64.AppImage

# Run directly (no FUSE required on stock SteamOS)
~/Downloads/neurodeck_1.5.1_steamdeck_amd64.AppImage --appimage-extract-and-run
```

**Or use `install.sh` for a full setup** (desktop entry, Ollama config, gamepad profiles):

```bash
# Place the AppImage in the same folder as install.sh, then:
bash install.sh
```

`install.sh` auto-detects the AppImage, handles `chmod +x`, probes for FUSE, and writes a launcher that works on stock SteamOS without `libfuse2`.

**Add to Game Mode:** Steam → Library → Add a Non-Steam Game → browse to `~/Applications/neurodeck/neurodeck-launch.sh` → rename to NEURODECK.

### Windows

Download `neurodeck_1.5.1_windows_x64.exe` from the [releases page](https://github.com/khaoticdev62/NEURODECK/releases/latest) and run the installer.

### Build from Source

> **Prerequisites:** [Rust 1.92.0+](https://rustup.rs/), [Node.js 18+](https://nodejs.org/), protoc, and either a `GEMINI_API_KEY` or [Ollama](https://ollama.com/) running locally.

```bash
git clone https://github.com/khaoticdev62/NEURODECK.git && cd NEURODECK
npm install && npm -w frontend install

# Linux / macOS / SteamOS
export GEMINI_API_KEY="AIza..."

# Windows PowerShell
$env:GEMINI_API_KEY = "AIza..."

npm run tauri dev
```

**First build: 2–3 minutes.** `mlua` compiles Lua 5.4 from source (vendored). Every build after that is fast.

---

## 🎮 Navigation & Shortcuts

The entire app is controllable with a Steam Deck controller — designed for couch sessions and Game Mode.

**Gamepad Navigation (Radial Menu):**
| Input | Action |
|---|---|
| <kbd>L2</kbd> **(hold)** | Open the 20-segment radial view menu |
| <kbd>Left Stick</kbd> | Highlight a radial segment |
| <kbd>L2</kbd> **(release)** | Jump to the highlighted tab |
| <kbd>D-Pad</kbd> | Navigate inner tabs (SSH sessions, share subtabs) |
| <kbd>Start</kbd> | Open Settings modal |
| <kbd>\`</kbd> **(Backtick)** | Open / close radial menu from keyboard |

**Desktop / Keyboard:**
| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | **Command Palette** — navigate, search, execute |
| <kbd>F1</kbd> | **App Manual** — full feature reference + diagnostics |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | **Quick Switcher** (recent views) |
| <kbd>?</kbd> | **Shortcuts Overlay** (when no input focused) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Controller Prompt Picker |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | Agent / Model Switcher |

All shortcuts are **fully rebindable** in Settings → General → Keyboard Shortcuts. Overrides persist across restarts.

To enable full controller support in Steam Game Mode, load the NEURODECK Steam Input profile described in [`docs/steam_input_guide.md`](docs/steam_input_guide.md).

---

## 🔌 LLM Providers

NEURODECK supports multiple AI backends — switch between them in Settings → AI Model at any time:

| Provider | How to connect | Embeddings / RAG |
|---|---|---|
| **Google Gemini** | API key (free tier available) | ✅ Full vector RAG |
| **Ollama** | `http://localhost:11434` (local) | ⚠️ Keyword fallback |
| **OpenAI-Compatible** | Any `/v1/chat/completions` URL | ✅ if endpoint supports `/v1/embeddings`, else keyword fallback |

**OpenAI-Compatible endpoint examples:**

```
Groq       https://api.groq.com/openai/v1          (free, very fast)
OpenRouter https://openrouter.ai/api/v1             (300+ models)
LM Studio  http://localhost:1234/v1                 (local GUI)
llama.cpp  http://localhost:8080/v1                 (local, no GUI needed)
Mistral    https://api.mistral.ai/v1
Together   https://api.together.xyz/v1
Perplexity https://api.perplexity.ai
```

---

## 🔮 What's Next — v1.6.0-Bastet

**Theme: The Daily Driver** — shift from impressive tech demo to the tool you reach for every day.

| Sprint | Feature |
|---|---|
| 9.1 ✅ | **Session Browser** — sidebar panel with open / rename / delete |
| 9.2 ✅ | **Tray Mode** — minimize-to-tray on close, background agent |
| 9.3 ✅ | **Image Input** — drag-drop / paste images into chat (Gemini Vision) |
| 9.4 ✅ | **Chat Export** — Markdown, HTML, JSON one-click export |
| 9.5 ✅ | **Plugin Marketplace v2** — category filter, update badges, 33 plugins |
| 9.6 ✅ | **Shortcut Customization** — rebind any keyboard shortcut in Settings |
| 9.7 ✅ | **Module Split** — `radial.js`, `palette-commands.js` extracted from main |
| 10.0 🔵 | **v1.6.0 Release** — tag, build, publish |

---

## ⚖️ License & Open Source

**NEURODECK** itself is distributed under a **Proprietary / EULA License** (see [`LICENSE`](LICENSE)).

NEURODECK heavily leverages open-source technology. The **About** section in Settings provides full attributions for Tauri (MIT/Apache 2.0), Vite (MIT), xterm.js (MIT), marked.js (MIT), and all Rust crates used.

---

<div align="center">

**Built for the Steam Deck. Runs anywhere.**

`com.neurodeck.app` &nbsp;·&nbsp; v1.5.1-Horus &nbsp;·&nbsp; KFMS Codename: Horus

[github.com/khaoticdev62/NEURODECK](https://github.com/khaoticdev62/NEURODECK)

</div>
