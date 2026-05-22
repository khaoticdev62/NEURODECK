# NEURODECK User Guide

> **AI Terminal Interface for Steam Deck & SteamOS** — v0.1.0

---

## 🚀 Getting Started

When you launch NEURODECK, you'll see a three-panel layout:

- **Left Sidebar** — Session history. Toggle with `☰` or `Ctrl+[` 
- **Center Chat Workspace** — Main conversation area with AI
- **Right Context Drawer** — Live metrics. Toggle with `📊`
- **Settings Modal** — Press `⚙️` to switch personas and themes

Type a message in the bottom input bar and press **Enter** to chat with the AI.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line in input (multi-line prompts) |
| `Ctrl+B` | **Execute pending Lua script** (last Lua block in chat) |
| `Ctrl+S` | Save current session to `sessions/` |
| `Ctrl+L` | Load latest saved session |
| `Ctrl+N` | Start a new chat session |
| `Ctrl+P` | Cycle to next AI persona |
| `Ctrl+R` | Toggle voice recording (STT) |
| `Ctrl+M` | Toggle Text-to-Speech (TTS) mute |
| `Ctrl+C` | Kill running terminal process |
| `Escape` | Cancel AI generation mid-stream |

---

## 🛠️ Chat Commands

Type these directly into the chat input:

| Command | Description |
|---|---|
| `help` or `/help` | Show all commands, shortcuts, and Lua globals |
| `/persona <name>` | Switch AI persona (Default, Developer, Cyberpunk) |
| `/persona` | List all available personas |
| `/discuss <p1> <p2> <topic>` | 4-turn AI roundtable between two personas |
| `@file:<path>` | Embed a file's content directly into your prompt |
| `/<plugin-command>` | Run any registered Lua plugin command (e.g. `/ip_lookup`) |

### Example: File Mention
```
@file:~/projects/main.py Explain what this code does
```

### Example: Roundtable
```
/discuss Developer Cyberpunk Should we rewrite this in Rust?
```

---

## 🖥️ Terminal Command Execution

When the AI writes a shell/bash/powershell code block, you'll see an **Execute** button in the block header.

- Click **Execute** → opens a live terminal console below the block
- Output streams in real time
- Click **Terminate** or press `Ctrl+C` to kill the process
- The process's exit code is shown when done

Supported languages: `bash`, `sh`, `zsh`, `shell`, `powershell`, `cmd`

---

## 🌙 Lua Scripting

Ask the AI to write a Lua script — any `lua` code block gets an **Execute** button.

Press **`Ctrl+B`** to run the most recent Lua block in chat without clicking.

### Built-in Lua Functions

| Function | Description |
|---|---|
| `print(...)` | Streams output to the terminal console (real-time) |
| `execute(cmd)` | Runs a shell command and returns its stdout+stderr |
| `registerCommand(name, fn)` | Registers a `/name` chat command |
| `registerHook(event, fn)` | Hooks into `onMessage` or `onAIResponse` events |

### Example: System Info Script
```lua
print("=== System Info ===")
local hostname = execute("hostname")
print("Host: " .. hostname)
local disk = execute("df -h / | tail -1")
print("Disk: " .. disk)
```

### Example: Register a Custom Command
```lua
registerCommand("greet", function(args)
    print("Hello, " .. (args ~= "" and args or "world") .. "!")
    return "Greeted!"
end)
-- Then type /greet Alice in chat
```

---

## 🔌 Plugin System

Any `.lua` file in the `plugins/` directory is auto-loaded when NEURODECK starts.

### Bundled Plugins

**`plugins/ip_lookup.lua`** — registers `/ip_lookup`:
```
/ip_lookup
→ Your public IP address is: 203.0.113.42
```

**`plugins/auto_responder.lua`** — hooks into `onMessage` and `onAIResponse` to log trigger words and response word counts to the terminal.

### Creating Your Own Plugin

Create `plugins/my_plugin.lua`:
```lua
registerCommand("status", function(args)
    local mem = execute("free -h | grep Mem")
    print("Memory: " .. mem)
    return "Memory status printed."
end)

registerHook("onMessage", function(msg)
    -- You can modify or log the user's message before it hits the AI
    print("[MyPlugin] User said: " .. msg)
    return msg  -- return (possibly modified) message
end)

print("[Plugin] my_plugin loaded.")
```

---

## 🎙️ Voice Input / Output

### Speech-to-Text (STT)
1. Click the `🎙️` microphone button (or `Ctrl+R`)
2. Speak your message
3. Click again to stop — the transcription fills the input box automatically

> Requires `arecord` on Linux. On Windows, a simulated response is returned for testing.

### Text-to-Speech (TTS)
- AI responses are automatically read aloud (if not muted)
- Click `🔊` / `🔇` or press `Ctrl+M` to toggle mute
- TTS uses `espeak` on Linux and Windows Speech Synthesis on Windows

---

## 💾 Session Management

Sessions are saved as JSON files in the `sessions/` directory.

| Action | How |
|---|---|
| Save session | `Ctrl+S` or use the sidebar save button |
| Load latest | `Ctrl+L` |
| Browse sessions | Open the left sidebar (`☰`) |
| Load a session | Click its name in the sidebar |
| Delete a session | Click the 🗑️ icon next to it |
| New session | `Ctrl+N` or **+ New Chat** button |

---

## 🎭 Personas

Switch the AI's personality via Settings (`⚙️`) or chat command:

| Persona | Personality |
|---|---|
| **Default** | Helpful general assistant |
| **Developer** | Expert software developer — concise code answers |
| **Cyberpunk** | Edgy AI construct with terminal lingo |

Cycle through personas with `Ctrl+P`.

---

## 🎨 Themes

Open Settings (`⚙️`) → Theme:

| Theme | Style |
|---|---|
| **BLACKSITE** | Cyan on near-black, cyberpunk tactical |
| **TERMINAL_GHOST** | Green terminal, classic hacker aesthetic |
| **SYNTH_GRID** | Magenta/pink synthwave, neon grid |

---

## 🧠 Vector Memory & RAG

NEURODECK stores all conversations in a local vector database (`data/memory/`).

- Past relevant messages are automatically retrieved and injected as context before each AI query
- This gives the AI **long-term memory** across sessions
- The Context Drawer (`📊`) shows memory status

If memory is **Offline**, the database may have failed to initialize — check disk space and permissions in `data/memory/`.

---

## 🎮 Steam Deck Game Mode

### Adding to Steam
1. Desktop Mode → Steam → **Library → Add a Game → Add a Non-Steam Game**
2. Browse to: `~/Applications/neurodeck/neurodeck-launch.sh`
3. Name it **NEURODECK** → Click **Add Selected Programs**
4. Switch to Game Mode — NEURODECK appears in your library

### Controller Navigation
- **Right trackpad / joystick** → Scroll chat
- **A button** → Confirm / Send (if Steam Input profile is active)
- **Steam Button** → Return to Game Mode menu
- The on-screen keyboard works natively with the trackpad

### Gamescope
The launch script automatically wraps the app in `gamescope -W 1280 -H 800 -f` for proper full-screen rendering at the Steam Deck's native resolution.

---

## ⚙️ Configuration Reference (`llm-term.toml`)

```toml
[llm]
default_provider = "gemini"         # "gemini" or "ollama"
gemini_model = "gemini-2.0-flash"  # Gemini model name
ollama_model = "llama3"            # Ollama model name
ollama_base_url = "http://localhost:11434"
```

Set via environment variable:
```bash
export GEMINI_API_KEY="your-key"
```

Or save to `~/.config/neurodeck/env` — the install script does this automatically.

---

## 🛠️ Troubleshooting

| Issue | Solution |
|---|---|
| **AI not responding** | Check `GEMINI_API_KEY` is set; check network |
| **Memory offline** | Ensure `data/memory/` exists and is writable |
| **Voice not working** | Install `arecord` (`sudo pacman -S alsa-utils`) |
| **TTS silent** | Install `espeak` (`sudo pacman -S espeak-ng`) |
| **App not in Game Mode** | Add `neurodeck-launch.sh` as a Non-Steam game |
| **RC.EXE error (Windows build)** | Add Windows SDK bin to PATH — see README |
| **Lua script not running** | Check the terminal console for error messages |

---

*For more information, see the [README](../README.md) or open an issue on GitHub.*
