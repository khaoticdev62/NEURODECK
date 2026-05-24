# NEURODECK Plugin Development Guide

How to write, test, and publish Lua plugins for NEURODECK — including submitting them to the community Plugin Marketplace.

---

## What Is a Plugin?

A NEURODECK plugin is a single `.lua` file placed in the `plugins/` directory. At startup, NEURODECK loads every `.lua` file in that folder via `mlua` (Lua 5.4, compiled from source). A plugin can:

- Register new slash commands usable in the Chat tab
- Register hooks that intercept messages before/after LLM processing
- Switch AI personas programmatically
- Execute shell commands and return output to the chat
- Print debug info to the Tauri console

---

## Quick Start — Hello World

Create `plugins/hello.lua`:

```lua
-- plugins/hello.lua
registerCommand("/hello", function(args)
    return "Hello from NEURODECK! You said: " .. (args or "nothing")
end)

print("[Plugin] Hello plugin loaded.")
```

Restart NEURODECK (or run `npm run tauri dev`). Type `/hello world` in the Chat tab. The plugin responds with your message echoed back.

---

## Available Globals

These globals are injected by NEURODECK's Lua runtime at startup. They are always available — you do not `require` them.

### `print(message)`

Writes a line to the Tauri terminal console (not to the UI). Use this for debug output.

```lua
print("[MyPlugin] Loaded successfully.")
```

### `execute(command)`

Runs a shell command and returns stdout as a string. Stderr is discarded. The command runs in a blocking subprocess — keep it fast (under 5 seconds).

```lua
local result = execute("uname -a")
print("[Plugin] System: " .. result)
```

> On Windows, commands run in `cmd.exe`. On Linux/SteamOS, they run in `sh`. Write portable commands or guard with OS detection.

### `registerCommand(name, handler)`

Registers a slash command. `name` must start with `/`. `handler` receives the rest of the message after the command name as a string (trimmed). The return value is displayed as the AI response in Chat.

```lua
registerCommand("/greet", function(args)
    local name = args ~= "" and args or "stranger"
    return "Hey there, " .. name .. "! 👋"
end)
```

Usage in chat: `/greet Alice` → displays "Hey there, Alice! 👋"

### `registerHook(event, handler)`

Registers a hook for a lifecycle event. The handler receives the event payload as a string and must return a (possibly modified) string.

| Event | When It Fires | Payload | Return |
|---|---|---|---|
| `before_send` | Before user message is sent to the LLM | Raw message text | Modified or original message |
| `after_response` | After LLM response is received | Raw response text | Modified or original response |

```lua
-- Prepend a system note to every outgoing message
registerHook("before_send", function(msg)
    return "[Context: Steam Deck, SteamOS] " .. msg
end)
```

```lua
-- Censor a word in every response
registerHook("after_response", function(resp)
    return resp:gsub("badword", "***")
end)
```

> Multiple hooks for the same event are chained in load order.

### `setPersona(name)`

Switches the active AI persona to any persona registered in `lib.rs`'s `PERSONAS` map or via another `setPersona` call.

```lua
registerCommand("/chill", function()
    setPersona("default")
    return "Switched to default chill mode."
end)
```

---

## Full Example — IP Lookup Plugin

The built-in `ip_lookup.lua` is a good reference:

```lua
-- plugins/ip_lookup.lua
-- Usage: /iplookup 8.8.8.8

registerCommand("/iplookup", function(args)
    local ip = args:match("^%S+")
    if not ip or ip == "" then
        return "Usage: /iplookup <ip-address>"
    end

    local result = execute("curl -s 'http://ip-api.com/json/" .. ip .. "'")
    if not result or result == "" then
        return "IP lookup failed — no network response."
    end

    return "IP Info for " .. ip .. ":\n```json\n" .. result .. "\n```"
end)

print("[Plugin] ip_lookup loaded.")
```

---

## Testing Your Plugin

1. Place your `.lua` file in `plugins/`
2. Run `npm run tauri dev`
3. Open the Tauri terminal — look for `[Plugin] ... loaded.` to confirm it was picked up
4. If you see `[Lua Error] plugins/your_file.lua: ...`, fix the syntax error and restart
5. Type your slash command in the Chat tab to test it end-to-end

**Debugging tips:**
- Use `print()` liberally — output appears in the Tauri/cargo terminal, not the UI
- Wrap `execute()` calls in a guard: `if not result then return "Command failed" end`
- A syntax error in your plugin suppresses only that plugin — other plugins still load

---

## Publishing to the Community Registry

To submit your plugin to the built-in Plugin Marketplace:

1. **Fork** [github.com/khaoticdev62/neurodeck-plugins](https://github.com/khaoticdev62/neurodeck-plugins)

2. **Add your Lua file** to the `plugins/` directory in the fork

3. **Add a registry entry** to `registry.json`:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "description": "One-line description of what it does.",
  "version": "1.0.0",
  "author": "yourhandle",
  "tags": ["utility"],
  "entry": "plugins/your_plugin.lua",
  "commands": ["/yourcommand"],
  "homepage": "https://github.com/yourhandle/your-plugin-repo"
}
```

**Required fields:** `id`, `name`, `description`, `version`, `author`, `entry`  
**Optional:** `tags`, `commands`, `homepage`

4. **Open a pull request** — the maintainer reviews and merges. Once merged, the plugin appears in all NEURODECK installations via the marketplace.

### Registry Entry Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique slug, lowercase, hyphens only (e.g. `ip-lookup`) |
| `name` | string | Display name shown in the marketplace |
| `description` | string | One sentence. Shown in the plugin card. |
| `version` | string | SemVer (e.g. `1.0.0`) |
| `author` | string | GitHub username or display handle |
| `tags` | string[] | Pick from: `automation`, `ai`, `utility`, `personas`, `prompting`, `network`, `dev` |
| `entry` | string | Path to the `.lua` file relative to the repo root |
| `commands` | string[] | Slash commands the plugin registers (for display only — marketplace doesn't enforce these) |
| `homepage` | string | Optional URL to plugin docs or source repo |

### Plugin Guidelines

- **No `execute()` with user-supplied data** — this is a shell injection risk. Always validate/sanitize any argument passed to `execute()`.
- **Keep commands under 5 seconds** — `execute()` blocks the Lua runtime. Long-running commands should use a background approach or exit early.
- **Return strings, not nil** — slash command handlers that return `nil` display a blank response. Always return a string.
- **Unique IDs** — your `id` must not collide with an existing registry entry. Check `registry.json` before submitting.
- **No network calls from Lua** — NEURODECK's Lua runtime does not include HTTP libraries. Use `execute("curl ...")` for external requests, and validate the URL before passing it.

---

## Lua 5.4 Compatibility Notes

NEURODECK uses `mlua` with the `lua54` feature — standard Lua 5.4. Most Lua code works as-is. Key things to know:

- **No `require`** for external modules — only the standard library is available plus NEURODECK globals
- **`string.gmatch`, `string.gsub`, `table`, `math`, `io`** — all available
- **`io.open`** — available and works. Use it for reading local files. Paths are relative to the NEURODECK working directory (`src-tauri/` in dev, `~/Applications/neurodeck/` in production)
- **`os.execute`** — available but use NEURODECK's `execute()` global instead, which captures stdout
- **Integer division** uses `//` (same as Python 3)
- **Bitwise operators** use `&`, `|`, `~`, `<<`, `>>` (Lua 5.4 syntax, not the old `bit32` library)

---

## File Structure Reference

```
plugins/
├── bmad.lua           # BMAD personas (/john, /sally, /winston, etc.)
├── promptgen.lua      # Prompt Lab commands (/promptlab, /formula)
├── ip_lookup.lua      # /iplookup <address>
└── auto_responder.lua # Keyword-triggered auto-replies
```

Each file is independent. Load order is filesystem order (alphabetical on most systems). Hooks from multiple plugins stack in load order.
