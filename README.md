# NEURODECK

> **A native-feeling AI terminal interface built for the Steam Deck and SteamOS Game Mode.**

NEURODECK is a Tauri-powered desktop application combining a modern chat UI with a powerful AI backend, real terminal command execution, Lua scripting, a plugin system, and long-term vector memory — all optimized for use on the Steam Deck's 1280×800 display in Game Mode.

![NEURODECK Screenshot](assets/screenshot.png)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Integration** | Powered by **Gemini API** (streaming) or **Ollama** (local LLMs) |
| 🧠 **Vector Memory** | Persistent long-term memory with RAG (Retrieval-Augmented Generation) |
| 🖥️ **Terminal Execution** | Execute shell/bash/powershell code blocks directly from chat |
| 🌙 **Lua Scripting** | Run Lua scripts inline; `Ctrl+B` executes the latest code block |
| 🔌 **Plugin System** | Drop `.lua` files in `plugins/` — auto-loaded on startup |
| 🎙️ **Voice I/O** | Speech-to-Text recording + Text-to-Speech response playback |
| 🎮 **Steam Deck Native** | Gamescope-wrapped launch, 1280×800 fullscreen, Steam Input ready |
| 💾 **Session History** | Save, load, and delete chat sessions from the sidebar |
| 🎭 **Personas** | Swap AI personalities (Default, Developer, Cyberpunk) mid-session |
| 🎨 **Themes** | BLACKSITE, TERMINAL_GHOST, SYNTH_GRID — switchable in Settings |
| 🤝 **Multi-Agent** | `/discuss` command runs a 4-turn AI roundtable between two personas |

---

## 🚀 Quick Start

### Prerequisites

- **Rust + Cargo** ([rustup.rs](https://rustup.rs))
- **Node.js + npm** (v18+)
- **Gemini API Key** — [Get one free](https://aistudio.google.com/apikey) — OR — a running [Ollama](https://ollama.com) instance

### Install & Run (Development)

```bash
# Clone the repo
git clone https://github.com/your-username/neurodeck.git
cd neurodeck

# Set your API key
export GEMINI_API_KEY="your-key-here"

# Start the app
npm run tauri dev
```

### SteamOS / Steam Deck Install

```bash
# Run the installer (from the release folder)
chmod +x install.sh
./install.sh
```

The installer will:
- Copy the binary to `~/Applications/neurodeck/`
- Create a `.desktop` file for Steam to launch
- Set up all required directories (`sessions/`, `plugins/`, `scripts/`, `data/memory/`)
- Prompt you for your Gemini API key

### Windows

Run `neurodeck_installer.exe` from the release bundle, or:
```powershell
# Package your own release
.\package_release.ps1
```

---

## ⚙️ Configuration

Edit `llm-term.toml` in the app directory:

```toml
[llm]
default_provider = "gemini"       # or "ollama"
gemini_model = "gemini-2.0-flash"
ollama_model = "llama3"
ollama_base_url = "http://localhost:11434"
```

Set environment variables:
```bash
export GEMINI_API_KEY="your-api-key"
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Ctrl+B` | Execute pending Lua script |
| `Ctrl+S` | Save current session |
| `Ctrl+L` | Load latest session |
| `Ctrl+N` | Start new chat session |
| `Ctrl+P` | Cycle to next persona |
| `Ctrl+R` | Toggle voice recording |
| `Ctrl+M` | Toggle TTS mute |
| `Ctrl+C` | Kill running terminal process |
| `Escape` | Cancel AI generation |

---

## 🖥️ Terminal Commands

Click **Execute** on any `bash`, `sh`, `cmd`, or `powershell` code block to run it live in a streaming terminal console below the block.

---

## 🌙 Lua Scripting

Ask the AI to write a Lua script, then click **Execute** (or press `Ctrl+B`):

```lua
-- Example: get your public IP
local ip = execute("curl -s https://api.ipify.org")
print("Your IP: " .. ip)
```

### Built-in Lua Globals

| Function | Description |
|---|---|
| `print(...)` | Streams output to the terminal console |
| `execute(cmd)` | Runs a shell command and returns its output |
| `registerCommand(name, fn)` | Registers a `/name` chat command |
| `registerHook(event, fn)` | Hooks into `onMessage` or `onAIResponse` |

### Example Scripts

| Script | Description |
|---|---|
| `scripts/hello.lua` | Hello world |
| `scripts/system_info.lua` | System information report |
| `scripts/cleanup.lua` | List temp files |

---

## 🔌 Plugin System

Drop any `.lua` file in the `plugins/` directory — it auto-loads on startup.

```lua
-- plugins/my_command.lua
registerCommand("hello", function(args)
    print("Hello, " .. (args ~= "" and args or "world") .. "!")
    return "Greeting sent."
end)
```

Then type `/hello World` in chat.

### Bundled Plugins

| Plugin | Command | Description |
|---|---|---|
| `ip_lookup.lua` | `/ip_lookup` | Fetches your public IP address |
| `auto_responder.lua` | *(hook)* | Logs trigger words and AI response metrics |

---

## 🎭 Chat Commands

| Command | Description |
|---|---|
| `/help` | Show all commands and shortcuts |
| `/persona <name>` | Switch AI persona |
| `/discuss <p1> <p2> <topic>` | 4-turn AI roundtable debate |
| `@file:<path>` | Embed a local file into your prompt |
| `/<plugin-command>` | Run any registered Lua plugin command |

---

## 🎮 Steam Deck / SteamOS

### Game Mode Launch

Add NEURODECK to Steam as a Non-Steam Game:
1. In Steam Desktop Mode: **Library → Add a Game → Add a Non-Steam Game**
2. Browse to `~/Applications/neurodeck/launch_gamescope.sh`
3. Switch to Game Mode — NEURODECK will appear in your library

Or run manually:
```bash
~/Applications/neurodeck/launch_gamescope.sh
```

### Gamescope Wrapper

NEURODECK launches at native 1280×800 fullscreen via `gamescope`:
```bash
gamescope -W 1280 -H 800 -f -- ./neurodeck
```

---

## 📁 Directory Structure

```
neurodeck/
├── neurodeck          # Main binary (Linux)
├── neurodeck.exe      # Main binary (Windows)
├── llm-term.toml      # Configuration file
├── plugins/           # Auto-loaded Lua plugins
│   ├── ip_lookup.lua
│   └── auto_responder.lua
├── scripts/           # Example Lua scripts
│   ├── hello.lua
│   ├── system_info.lua
│   └── cleanup.lua
├── sessions/          # Saved chat sessions (JSON)
├── data/
│   └── memory/        # Vector memory database
└── launch_gamescope.sh  # SteamOS Game Mode launcher
```

---

## 🔧 Building from Source

```bash
# Install dependencies
npm install --prefix frontend

# Development build (hot-reload)
npm run tauri dev

# Production release build
npm run tauri build
```

> **Windows note**: Ensure `C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64` is in your `PATH` for the resource compiler.

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features.
