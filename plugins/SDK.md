# NEURODECK Plugin SDK

Version: 0.6.0  
Runtime: Lua 5.4 (mlua, vendored)

---

## Quick Start

Create a `.lua` file in `~/.config/neurodeck/plugins/` (or the equivalent on your OS).  
It will be auto-loaded at startup and hot-reloadable via **Settings → Plugins → Reload**.

```lua
-- @name      My Plugin
-- @version   1.0.0
-- @author    you
-- @description  Does something useful.

registerCommand("hello", function(args)
    return "Hello from my plugin! Args: " .. tostring(args)
end)
```

---

## Manifest Header

The first comment block of your file is parsed as plugin metadata.  
Every `-- @key value` line is read — stop at the first non-comment line.

| Annotation      | Required | Description                                      |
|-----------------|----------|--------------------------------------------------|
| `@name`         | Yes      | Display name shown in the Plugin Manager         |
| `@version`      | Yes      | SemVer string (e.g., `1.0.0`)                    |
| `@author`       | Yes      | Author name or handle                            |
| `@description`  | Recommended | One-line summary shown in the marketplace     |
| `@permissions`  | If needed | Comma-separated list: `network,filesystem,exec` |

Example:
```lua
-- @name      Weather Checker
-- @version   1.2.0
-- @author    khaoticdev
-- @description  Fetches current weather via wttr.in
-- @permissions  network
```

---

## SDK API Reference

### `registerCommand(name, fn)`

Register a slash-command accessible in NEURODECK's chat input.

```lua
registerCommand("greet", function(args)
    -- args is a string with everything after the command name
    return "Hello, " .. (args or "world") .. "!"
end)
-- Usage in chat: /greet Alice  → "Hello, Alice!"
```

- The function **must return a string** or `nil`.
- Returning `nil` suppresses the response.
- Commands are namespaced globally — avoid collisions with built-ins.

---

### `registerHook(event, fn)`

React to NEURODECK lifecycle events.

```lua
registerHook("onMessage", function(text)
    -- Fires before a user message is sent to the LLM.
    -- Return a modified string to override it, or nil to pass through.
    return text
end)

registerHook("onAIResponse", function(text)
    -- Fires after the LLM responds.
    -- Return a modified string or nil to pass through.
    return text
end)
```

Available events:
| Event          | When it fires                        | Can modify? |
|----------------|--------------------------------------|-------------|
| `onMessage`    | Before user message is sent          | Yes         |
| `onAIResponse` | After the LLM response is received   | Yes         |

---

### `print(msg)`

Emit a line to NEURODECK's terminal console (visible in the Terminal tab).

```lua
print("[MyPlugin] Initialized")
```

---

### `execute(command)`

Run a shell command and return stdout as a string.  
**Requires**: `@permissions exec`

```lua
local out = execute("uname -a")
print(out)
```

> **Security note**: `execute()` is gated by a user-visible confirmation prompt in the chat UI when invoked from LLM-generated code. Direct plugin calls bypass this prompt — declare `@permissions exec` so users are informed at install time.

---

### `setPersona(name)`

Switch the active LLM persona.

```lua
setPersona("Socratic")
```

---

## File System

Plugins run in Lua's sandboxed environment. The following are restricted:
- `os.execute` — use the `execute()` SDK function instead
- `io.popen` — blocked
- `dofile`, `loadfile` — blocked
- `package.loadlib` — blocked
- `debug.*` hooks — blocked

Standard `io.open`, `io.read`, and `io.write` are available for file access within the NEURODECK data directory.

---

## Plugin Lifecycle

1. On startup or reload, all `.lua` files in the plugins directory are loaded in alphabetical order.
2. A syntax error in any plugin prints `[Lua Error]` to the console and skips that plugin — others continue.
3. To disable a plugin without deleting it, rename it from `myplugin.lua` → `myplugin.lua.disabled` (or toggle it in Settings → Plugins).
4. After editing, click **Reload** in Settings → Plugins to hot-reload without restarting.

---

## Marketplace Publishing

To publish your plugin to the NEURODECK Marketplace:

1. Host your `.lua` file on GitHub (public repo, `raw.githubusercontent.com` URL).
2. Compute its SHA-256 hash: `sha256sum myplugin.lua`
3. Open a Pull Request against `khaoticdev62/neurodeck-plugins` adding an entry to `registry.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "author": "you",
  "version": "1.0.0",
  "description": "Does something useful.",
  "tags": ["utility"],
  "category": "utility",
  "lua_file": "my_plugin.lua",
  "download_url": "https://raw.githubusercontent.com/you/repo/main/my_plugin.lua",
  "sha256": "<hex digest>"
}
```

Categories: `ai`, `productivity`, `system`, `integration`, `gaming`, `utility`

---

## Plugin QA Gate

Before submission, run the built-in validator:

- In chat: `/validate_plugin my_plugin.lua`
- Via bridge API: `POST /api/validate_plugin` `{ "file_name": "my_plugin.lua" }`

The validator checks:
- Manifest annotations present (`@name`, `@version`, `@author`)
- File size ≤ 512 KB
- No use of blocked APIs (`os.execute`, `io.popen`, `dofile`, etc.)

A `passed: true` result is required for marketplace acceptance.
