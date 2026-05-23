# NEURODECK User Guide

A plain-English walkthrough of every feature. No jargon, no assumed knowledge.

---

## What Is NEURODECK?

NEURODECK is a fullscreen AI-powered desktop app designed for the Steam Deck. Think of it as a command center that combines:
- A chat interface to talk to an AI (like ChatGPT, but running locally or via Google Gemini)
- A real terminal shell (like a Linux command prompt)
- A code canvas where you can write and preview code live
- An autonomous agent that can write and run code on your behalf
- A file manager for your local network (transfer files between devices)
- A memory system that remembers past conversations

Everything lives in one fullscreen window with tabs across the top.

---

## First-Time Setup (Onboarding)

When you launch NEURODECK for the first time — and no API key is saved — a setup wizard appears after the boot screen. It has 4 steps.

### Step 1 — Choose Your AI Provider

| Option | What It Means |
|---|---|
| **Gemini API Key** | Paste a Google Gemini API key. Fastest setup. Get one free at aistudio.google.com. |
| **Google Login (QR)** | Scan a QR code with your phone to log in to Google. No key to copy/paste. |
| **Ollama (Offline)** | Use a local AI model running on your machine. No internet required. |

### Step 2 — Enter Your Credentials
- **Gemini Key**: paste the key into the field and click **Verify & Save**. The app tests the connection and saves the key to your system's secure keychain (never stored in a plain text file).
- **Google Login**: a QR code and a short code appear. Scan the QR with your phone, visit the link, enter the code, and approve. The app detects approval automatically and advances.
- **Ollama**: enter the URL where Ollama is running (default: `http://localhost:11434`) and the model name (e.g. `llama3`). Click **Verify & Save** to test the connection.

### Step 3 — Pick a Persona & Theme
Choose the AI's personality and the app's color scheme. Both can be changed anytime in Settings.

### Step 4 — System Check
NEURODECK tests three things automatically:

| Check | What It Tests |
|---|---|
| **PTY Shell** | Can the app open a real terminal? |
| **Network** | Can it reach the internet? (Needed for Gemini) |
| **Keychain** | Can it securely save credentials? |

Click **Launch NEURODECK** once checks pass. If only Network fails, offline mode still works fine.

---

## The Navigation Bar

Tabs across the top switch between views:

| Tab | What It Does |
|---|---|
| **Chat** | Talk to the AI. Main view. |
| **Canvas** | Write and preview HTML/CSS/JS/Markdown live. |
| **Terminal** | A real shell prompt. Runs bash or PowerShell. |
| **SSH** | Connect to remote machines via SSH. |
| **Tunnel** | Bridge SteamOS Game Mode to Desktop Mode. |
| **Share** | Transfer files to/from other devices on your network. |
| **Browser** | Built-in web browser. |
| **Agent** | Autonomous AI that writes and runs code to complete tasks. |
| **Memory** | View and manage things the AI has remembered. |
| **Prompt Lab** | A workshop for crafting better AI prompts. |

---

## Chat Tab

This is where you talk to the AI.

**Send a message**: type in the box at the bottom and press Enter or click **Send**.

**Voice input**: click the microphone icon. Speak. The text appears automatically.

**Attach an image**: click the image icon. The AI can describe what it sees (Gemini only — Ollama does not support image input).

**Slash commands** — type `/` followed by a command name:

| Command | What It Does |
|---|---|
| `/promptgen <task>` | Wraps your task in a Chain-of-Thought prompt instantly |
| `/promptlab` | Lists all 7 available prompt formulas |
| `/formula <name> <task>` | Applies a specific formula (e.g. `/formula AIDA write a product pitch`) |
| `/john`, `/sally`, `/winston`, `/amelia`, `/paige`, `/mary` | Switch to a BMAD team persona |
| `/clear` | Clears the current chat history |

**Change the AI persona**: click the persona name in the top bar. Personas change how the AI responds — Developer gives code-focused answers, Cyberpunk uses terminal slang, John behaves like a Product Manager, etc.

**Session management**: each conversation is a session. The session ID is shown at the top left. Click the sessions button to start a new conversation or switch between saved ones.

---

## Terminal Tab

A real shell running on your machine.

- On Linux/SteamOS: runs bash
- On Windows: runs PowerShell
- Multiple terminal sessions can run at the same time
- Click **+** to open a new session
- Type `exit` to close a session
- **AI autocomplete**: press Tab while typing a command to get an AI-suggested completion

---

## Canvas Tab

A live code scratchpad.

**Supported languages**:
- **HTML/CSS/JavaScript** — renders live in a preview pane on the right as you type
- **Markdown** — renders formatted text in the preview
- **Python/Bash** — use the Agent tab to actually execute these (Canvas is editor-only)

**Collaborate**: click **Host** to share your canvas with another NEURODECK user on the same network. Give them the IP address shown, and they click **Join**. Both users see edits in real time.

---

## Agent Tab

Give the AI a task and it completes it by writing code, running it, reading the output, and iterating.

**Example tasks**:
- "Rename all .jpg files in ~/Downloads to lowercase"
- "Write a Python script that finds duplicate files in a folder"
- "Create a bash script that shows my top 10 largest files"

The agent works in up to 5 steps. Each step shows its reasoning, the code it wrote, and the execution output. Click **Stop** to cancel.

---

## Memory Tab

NEURODECK automatically saves facts from your conversations. This tab lets you:

- **Search** — find memories by keyword
- **Pin** — mark a memory as always-relevant (included in every AI context)
- **Delete** — remove a memory
- **Add** — manually save a fact

The AI uses relevant memories automatically when you chat. You don't have to do anything — it just gets smarter over time.

---

## Prompt Lab Tab

A tool for writing better AI prompts using proven copywriting and reasoning frameworks.

### Available Formulas

| Formula | Best Used For |
|---|---|
| **AIDA** | Persuasive writing — grabs attention then drives to action |
| **SCQA** | Business problems — frames situation, tension, and solution |
| **PASTOR** | Sales/pitch writing — emotional arc from pain to resolution |
| **Chain of Thought** | Step-by-step reasoning — shows the AI's work |
| **Tree of Thought** | Hard problems — explores multiple approaches before committing |
| **PAS** | Quick problem framing — Problem, Agitate, Solve |
| **Role + Constraints** | Expert persona with guardrails — clean, focused outputs |

### How to Use
1. Type your task in the **Task** field
2. Select a formula from the dropdown
3. Optionally fill in **Role**, **Context**, **Tone**, **Format**
4. Click **Generate Prompt** — the finished prompt appears on the right
5. Click **Explain (JPE)** for a plain-English breakdown of what the prompt does and why
6. Click **Use in Chat** to send it to the AI immediately

You can also use slash commands in the Terminal or Chat:
- `/promptgen <task>` — quick Chain-of-Thought wrap
- `/formula AIDA <task>` — apply any formula by name

---

## Share Tab (File Transfer)

Transfer files to and from other devices on the same Wi-Fi network.

### Sending a File
1. Click **Pick File** and choose what to send
2. Select a device from the **Discovered Peers** list
3. Click **Send** — the other device gets a prompt to accept

### Receiving a File
Incoming transfers appear as a notification. Click **Accept** to save the file.

### Warpinator Compatibility
NEURODECK can exchange files with Linux machines running GNOME Warpinator (common on Ubuntu/Fedora). Both devices must be on the same network segment.

### Group Code
If peers aren't showing up, check that both devices have the same Group Code. The default is `NEURODECK`. Change it in the Share tab header.

---

## SSH Tab

Connect to remote servers.

1. Click **New Profile**
2. Fill in: Host, Port (default 22), Username, Password or key path
3. Click **Connect**
4. A terminal opens connected to the remote machine

Profiles are saved locally so you don't re-enter them.

---

## Browser Tab

An in-app web browser. Useful for checking documentation, viewing web pages, or referencing local HTML files from Canvas — all without leaving NEURODECK.

---

## Settings (⚙️)

Click the gear icon (top right) to open the settings panel:

| Section | What You Can Change |
|---|---|
| **LLM Provider** | Switch between Gemini/Ollama, change the model, update API keys |
| **Themes** | Pick a color scheme or build a custom one with hex values |
| **Personas** | Create custom AI personalities with a name and system prompt |
| **Whisper STT** | Set up offline speech recognition (requires whisper.cpp) |
| **Plugins** | Enable/disable Lua plugins in the plugins/ folder |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `` ` `` (backtick) | Open the radial quick-switcher menu |
| `Enter` | Send chat message |
| `Tab` | AI autocomplete in terminal |
| `Escape` | Close modals and overlays |

### Steam Deck Gamepad
| Button | Action |
|---|---|
| **L2** | Open radial menu |
| **Right stick** | Navigate radial menu |
| **A** | Select / confirm |
| **B** | Back / cancel |

---

## Plugins

NEURODECK loads every `.lua` file from the `plugins/` folder at startup.

**Built-in plugins**:

| Plugin | Commands |
|---|---|
| `bmad.lua` | `/john`, `/sally`, `/winston`, `/amelia`, `/paige`, `/mary` |
| `promptgen.lua` | `/promptlab`, `/promptgen`, `/formula` |
| `ip_lookup.lua` | IP address lookup tools |
| `auto_responder.lua` | Automated response hook triggers |

**Writing a custom plugin** — create any `.lua` file in `plugins/`:

```lua
-- plugins/my_plugin.lua
registerCommand("hello", function(args)
    return "Hello! You said: " .. (args or "nothing")
end)
print("[Plugin] Hello plugin loaded.")
```

Use `/hello world` in the chat tab to invoke it.

---

## Troubleshooting

**AI isn't responding**
- Open Settings and verify the LLM provider is configured
- For Gemini: click "Test Connection" — if it fails, your API key may be expired
- For Ollama: run `ollama serve` in a terminal first, then retry

**Terminal is blank/unresponsive**
- Click inside the terminal area and press Enter
- If that doesn't work, switch to another tab and back — this re-attaches the PTY

**File transfers not finding peers**
- Both devices must be on the same Wi-Fi network (not on different VLANs or subnets)
- Check that the Group Code matches on both devices
- Firewalls may block mDNS (port 5353) — try disabling briefly to test

**Onboarding wizard keeps appearing**
- Complete Step 2 (Verify & Save) to dismiss it permanently
- To force-skip it, open DevTools console (`F12`) and run: `localStorage.setItem('neurodeck_onboarding_complete', 'true')`

**Boot screen takes a long time**
- Usually caused by Ollama loading a large model. Wait 15–30 seconds.
- If it never completes, close the app and check that your Ollama server is running

---

## Privacy & Data

- **API keys** are stored in your OS secure keychain — Windows Credential Manager, Linux Secret Service, or macOS Keychain. They are never written to a plain-text file.
- **Chat history** is saved locally in `data/memory/chat_history.json`. Nothing is transmitted to external servers except the LLM API calls you make.
- **No telemetry** — NEURODECK does not collect or transmit usage data.
