# Hermes.lua Extension Framework — Full Technical Specification

**Document Type:** Full System Specification  
**Project Name:** Hermes.lua  
**Purpose:** Universal, project-adaptable Lua extension framework with built-in installer and integration wiring  
**Target User:** Solo developer, mod creator, app builder, toolmaker, AI-assisted development workflow  
**Primary Runtime:** Lua 5.1+ / LuaJIT compatible where possible  
**Status:** Implemented (MVP v1.0)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Vision](#2-core-vision)
3. [What Hermes Is and Is Not](#3-what-hermes-is-and-is-not)
4. [Primary Goals](#4-primary-goals)
5. [Supported Project Types](#5-supported-project-types)
6. [Design Principles](#6-design-principles)
7. [High-Level Architecture](#7-high-level-architecture)
8. [Repository Structure](#8-repository-structure)
9. [Installed Project Structure](#9-installed-project-structure)
10. [Main CLI Commands](#10-main-cli-commands)
11. [Configuration System](#11-configuration-system)
12. [Manifest System](#12-manifest-system)
13. [Project Detection System](#13-project-detection-system)
14. [Adapter System](#14-adapter-system)
15. [Bridge System](#15-bridge-system)
16. [Event Bus](#16-event-bus)
17. [Command Registry](#17-command-registry)
18. [Plugin System](#18-plugin-system)
19. [Installer System](#19-installer-system)
20. [Wiring System](#20-wiring-system)
21. [Doctor / Validation System](#21-doctor--validation-system)
22. [Update System](#22-update-system)
23. [Migration System](#23-migration-system)
24. [Uninstall System](#24-uninstall-system)
25. [Security Model](#25-security-model)
26. [Logging and Diagnostics](#26-logging-and-diagnostics)
27. [Template System](#27-template-system)
28. [Generated Bridge Stubs](#28-generated-bridge-stubs)
29. [Testing Strategy](#29-testing-strategy)
30. [CI/CD Strategy](#30-cicd-strategy)
31. [Release Packaging](#31-release-packaging)
32. [AI Agent Integration](#32-ai-agent-integration)
33. [Developer Experience](#33-developer-experience)
34. [Implementation Phases](#34-implementation-phases)
35. [Acceptance Criteria](#35-acceptance-criteria)
36. [Risk Register](#36-risk-register)
37. [Full AI Build Prompt](#37-full-ai-build-prompt)
38. [Appendix A: Core Lua Interfaces](#appendix-a-core-lua-interfaces)
39. [Appendix B: Example Files](#appendix-b-example-files)
40. [Appendix C: Recommended MVP Scope](#appendix-c-recommended-mvp-scope)

---

# 1. Executive Summary

Hermes.lua is a portable Lua-based extension framework designed to be dropped into almost any software project and provide a safe, structured integration layer.

It includes:

- A built-in installer
- A project detector
- Adapter-based wiring
- Plugin loading
- Command registration
- Event dispatching
- File, CLI, stdin/stdout, HTTP, and WebSocket bridge options
- Safe config and manifest tracking
- Doctor diagnostics
- Migration and update flows
- AI-agent-readable project context

Hermes is not a hacky app injector. It connects through authorized, maintainable integration surfaces such as CLI calls, generated bridge files, local HTTP APIs, file buses, subprocesses, and framework-specific adapter stubs.

The goal is to create one extension layer that can follow the developer across projects: Tauri, Node, Unity, Python, CLI tools, game mods, web apps, desktop apps, and custom engines.

---

# 2. Core Vision

Hermes should act like a universal messenger layer between a project and its surrounding tools.

The framework should answer these questions automatically:

- What kind of project is this?
- How should Hermes safely install itself here?
- What files should be generated?
- What adapters are needed?
- How can the app talk to Hermes?
- How can Hermes talk back to the app?
- What commands are available?
- What plugins are trusted?
- Is the install healthy?
- Can this be updated or removed safely?

Hermes should feel like a serious developer tool, not a fragile helper script.

---

# 3. What Hermes Is and Is Not

## Hermes Is

- A Lua extension framework
- A project wiring tool
- A plugin host
- A local automation layer
- A safe command bus
- A generated bridge system
- A project-aware adapter system
- A portable installer
- A developer-experience layer
- A tool designed for AI-assisted coding workflows

## Hermes Is Not

- A malware-style process injector
- A secret scraper
- A remote control backdoor
- A replacement for each framework's native plugin system
- A build system replacement
- A package manager replacement
- A guaranteed one-click connection to literally every application

## Practical Meaning of “Connect to Any Application”

Hermes can connect to any application that provides at least one authorized integration surface:

- CLI command
- Plugin folder
- Scripting API
- Local socket
- Local HTTP server
- WebSocket server
- File watching
- JSON-RPC
- Subprocess execution
- Framework bridge
- Extension API
- Modding API

If an application exposes none of these, Hermes cannot and should not bypass its security model.

---

# 4. Primary Goals

## Goal 1: Single Entry Point

Hermes should be runnable from one file:

```bash
lua hermes.lua install
lua hermes.lua init
lua hermes.lua wire
lua hermes.lua doctor
lua hermes.lua run project.info
lua hermes.lua plugin list
lua hermes.lua update
lua hermes.lua uninstall
```

## Goal 2: Safe Built-In Installer

The installer should:

- Detect the current project
- Create `.hermes/`
- Generate a config
- Write a manifest
- Install selected adapters
- Generate bridge stubs
- Avoid destructive overwrites
- Support dry-run mode
- Create backups when modifying existing files
- Run doctor checks after install

## Goal 3: Universal Adapter System

Adapters should support project-specific wiring without polluting core.

Example adapters:

- Generic
- CLI
- Node
- Electron
- Tauri
- Rust
- Python
- Unity
- Web
- LÖVE2D
- Go
- .NET

## Goal 4: Multiple Bridge Styles

Hermes should support different connection models depending on the host project:

- CLI bridge
- stdin/stdout JSON-RPC bridge
- file bus bridge
- local HTTP bridge
- WebSocket bridge
- framework-specific native bridge stubs

## Goal 5: AI-Agent Friendly

Hermes should generate context files that help AI coding tools understand the project.

Generated examples:

```txt
.hermes/AGENT.md
.hermes/context/project-map.json
.hermes/context/commands.json
.hermes/context/adapters.json
.hermes/context/doctor-report.json
```

---

# 5. Supported Project Types

Hermes should support these targets by default.

| Project Type | Detection Signal | Preferred Bridge | Adapter |
|---|---|---|---|
| Generic repo | Git root or directory | CLI/File Bus | `generic` |
| CLI tool | executable scripts | CLI | `cli` |
| Node | `package.json` | stdin/stdout / CLI | `node` |
| Electron | `package.json` + Electron dependency | stdin/stdout | `electron` |
| Tauri | `src-tauri/tauri.conf.json` | Tauri commands + JSON-RPC | `tauri` |
| Rust | `Cargo.toml` | CLI/subprocess | `rust` |
| Python | `pyproject.toml` or `requirements.txt` | subprocess / HTTP | `python` |
| Unity | `Assets/`, `ProjectSettings/` | File Bus | `unity` |
| Web app | `index.html`, `vite.config.*`, `next.config.*` | HTTP/WebSocket | `web` |
| LÖVE2D | `main.lua`, `conf.lua` | Lua native bridge | `love2d` |
| Go | `go.mod` | CLI/subprocess | `go` |
| .NET | `.csproj`, `.sln` | subprocess / generated C# bridge | `dotnet` |

---

# 6. Design Principles

## 6.1 Adapter Over Assumption

Hermes should never hardcode one project model. It should detect and load adapters.

## 6.2 Safe by Default

Dangerous features should be disabled unless explicitly enabled.

Default disabled:

- Shell execution from plugins
- Network access from plugins
- Remote HTTP binding
- Secret access
- Destructive overwrite
- Untrusted plugin execution

## 6.3 Manifest Everything

Every generated or modified file should be tracked.

## 6.4 Human-Readable Files

Configs should be easy to inspect and edit.

## 6.5 JSON-Friendly Outputs

Commands should support structured output for automation.

```bash
lua hermes.lua doctor --json
```

## 6.6 No Secret Leakage

Logs, generated files, and reports must redact sensitive values.

## 6.7 Cross-Platform

The framework must support:

- Windows PowerShell/CMD
- macOS
- Linux
- CI environments
- Steam Deck/Linux handhelds where possible

## 6.8 Solo Developer Friendly

Errors must explain what happened, why it matters, and how to fix it.

---

# 7. High-Level Architecture

```txt
                 ┌────────────────────┐
                 │     hermes.lua      │
                 │  Main Entrypoint    │
                 └─────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
 │ Bootstrap   │    │ CLI Router  │    │ Config Load │
 └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Project Context │
                  └────────┬────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│ Adapter Reg │     │ Plugin Load │     │ Event Bus   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Bridge Services │
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
 │ CLI Bridge  │    │ HTTP Bridge │    │ File Bridge │
 └─────────────┘    └─────────────┘    └─────────────┘
```

---

# 8. Repository Structure

Recommended development repo:

```txt
hermes/
  hermes.lua
  README.md
  LICENSE
  CHANGELOG.md
  VERSION

  core/
    bootstrap.lua
    cli.lua
    config.lua
    context.lua
    result.lua
    events.lua
    fs.lua
    path.lua
    logger.lua
    manifest.lua
    migration.lua
    package.lua
    plugin_loader.lua
    process.lua
    registry.lua
    security.lua
    shell.lua
    templates.lua
    telemetry.lua
    validator.lua
    json.lua

  adapters/
    generic.adapter.lua
    cli.adapter.lua
    node.adapter.lua
    electron.adapter.lua
    tauri.adapter.lua
    rust.adapter.lua
    python.adapter.lua
    unity.adapter.lua
    love2d.adapter.lua
    web.adapter.lua
    go.adapter.lua
    dotnet.adapter.lua

  bridge/
    json_rpc.lua
    stdin_stdout.lua
    http.lua
    websocket.lua
    file_bus.lua
    command_bus.lua

  installers/
    install.lua
    uninstall.lua
    update.lua
    doctor.lua
    migrate.lua
    wire.lua

  templates/
    hermes.config.lua.template
    manifest.lua.template
    AGENT.md.template
    package-node.template.json
    node-hermes-bridge.template.js
    tauri-plugin.template.rs
    unity-hermes-bridge.template.cs
    python-hermes-bridge.template.py
    web-hermes-client.template.ts
    cli-hermes-shim.template.sh
    cli-hermes-shim.template.ps1

  plugins/
    example.plugin.lua
    diagnostics.plugin.lua
    commands.plugin.lua
    project_index.plugin.lua

  tests/
    unit/
    integration/
    golden/
    fixtures/
      node-project/
      tauri-project/
      python-project/
      unity-project/
      web-project/
      generic-project/

  docs/
    architecture.md
    adapter-authoring.md
    plugin-authoring.md
    bridge-contracts.md
    security.md
    troubleshooting.md
    release.md
```

---

# 9. Installed Project Structure

After installation inside a user project:

```txt
project-root/
  hermes.lua

  .hermes/
    hermes.config.lua
    manifest.lua
    AGENT.md

    adapters/
      generic.adapter.lua
      detected.adapter.lua

    plugins/
      example.plugin.lua

    bridge/
      inbox/
      outbox/
      errors/
      archive/

    logs/
      hermes.log
      install.log
      doctor.log
      bridge.log

    cache/
      project-index.json
      adapter-scores.json

    generated/
      hermes.sh
      hermes.ps1
      bridge-stubs/

    backups/
      install-YYYYMMDD-HHMMSS/

    context/
      project-map.json
      commands.json
      adapters.json
      doctor-report.json
```

---

# 10. Main CLI Commands

## 10.1 `install`

```bash
lua hermes.lua install
lua hermes.lua install --dry-run
lua hermes.lua install --force
lua hermes.lua install --adapter node
lua hermes.lua install --no-wire
lua hermes.lua install --safe-mode
lua hermes.lua install --project-type tauri
```

Responsibilities:

- Run preflight checks
- Detect project root
- Detect project type
- Create `.hermes/`
- Generate config
- Generate manifest
- Install adapters
- Optionally wire bridges
- Run doctor checks
- Print install report

## 10.2 `init`

```bash
lua hermes.lua init
```

Creates config and folders without wiring anything.

## 10.3 `wire`

```bash
lua hermes.lua wire
lua hermes.lua wire --adapter unity
lua hermes.lua wire --bridge file_bus
lua hermes.lua wire --dry-run
```

Connects Hermes to the current project using detected adapters.

## 10.4 `doctor`

```bash
lua hermes.lua doctor
lua hermes.lua doctor --json
lua hermes.lua doctor --fix
```

Validates install health.

## 10.5 `run`

```bash
lua hermes.lua run project.info
lua hermes.lua run doctor.full
lua hermes.lua run plugin.diagnostics
```

Runs registered commands.

## 10.6 `plugin`

```bash
lua hermes.lua plugin list
lua hermes.lua plugin add diagnostics
lua hermes.lua plugin remove diagnostics
lua hermes.lua plugin trust diagnostics
lua hermes.lua plugin info diagnostics
```

Manages plugins.

## 10.7 `update`

```bash
lua hermes.lua update
lua hermes.lua update --dry-run
lua hermes.lua update --force
```

Applies migrations and refreshes generated files.

## 10.8 `uninstall`

```bash
lua hermes.lua uninstall
lua hermes.lua uninstall --dry-run
lua hermes.lua uninstall --purge
lua hermes.lua uninstall --keep-config
```

Removes generated Hermes files safely.

---

# 11. Configuration System

File:

```txt
.hermes/hermes.config.lua
```

Example:

```lua
return {
  project = {
    name = "MyProject",
    type = "auto",
    root = ".",
  },

  hermes = {
    version = "1.0.0",
    mode = "development",
    log_level = "info",
    safe_mode = true,
  },

  installer = {
    create_backups = true,
    allow_file_overwrite = false,
    dry_run_default = false,
  },

  adapters = {
    enabled = {
      "generic",
      "cli",
      "node",
    },
    disabled = {},
  },

  bridge = {
    preferred = "stdin_stdout",

    stdin_stdout = {
      enabled = true,
      protocol = "json_rpc",
    },

    http = {
      enabled = false,
      host = "127.0.0.1",
      port = 4877,
      require_token = true,
      allow_remote = false,
    },

    websocket = {
      enabled = false,
      host = "127.0.0.1",
      port = 4878,
      require_token = true,
    },

    file_bus = {
      enabled = true,
      inbox = ".hermes/bridge/inbox",
      outbox = ".hermes/bridge/outbox",
      errors = ".hermes/bridge/errors",
      archive = ".hermes/bridge/archive",
    },
  },

  security = {
    trusted_plugins_only = true,
    allow_shell_exec = false,
    allow_network = false,
    allow_remote_bridge = false,
    secret_sources = {
      "env",
      ".hermes/secrets.local.lua",
    },
  },

  commands = {
    ["project.info"] = {
      description = "Print detected project info",
      handler = "core.commands.project_info",
    },

    ["doctor.full"] = {
      description = "Run complete Hermes diagnostics",
      handler = "core.commands.doctor_full",
    },
  },
}
```

## Config Rules

- Config must be valid Lua returning a table.
- Secrets should not be stored directly in config.
- Local overrides should use `.hermes/hermes.local.lua` or `.hermes/secrets.local.lua`.
- Generated config should include comments explaining each section.
- Unknown keys should warn, not crash, unless strict mode is enabled.

---

# 12. Manifest System

File:

```txt
.hermes/manifest.lua
```

Purpose:

- Track installed version
- Track generated files
- Track modified files
- Track backups
- Track adapter state
- Track migrations
- Enable safe uninstall/update

Example:

```lua
return {
  hermes_version = "1.0.0",
  installed_at = "2026-05-29T00:00:00Z",
  updated_at = "2026-05-29T00:00:00Z",

  project = {
    name = "MyProject",
    detected_type = "tauri",
    root = ".",
  },

  files = {
    {
      path = ".hermes/hermes.config.lua",
      kind = "config",
      generated = true,
      checksum = "sha256-placeholder",
    },
    {
      path = "scripts/hermes-bridge.js",
      kind = "bridge",
      generated = true,
      adapter = "node",
    },
  },

  backups = {
    {
      path = ".hermes/backups/install-20260529-120000/package.json",
      original = "package.json",
      reason = "package script injection",
    },
  },

  adapters = {
    node = {
      version = "1.0.0",
      installed = true,
      wired = true,
    },
    tauri = {
      version = "1.0.0",
      installed = true,
      wired = false,
    },
  },

  migrations = {
    applied = {
      "0001_initial_install",
    },
  },
}
```

---

# 13. Project Detection System

Hermes should scan the project root and score possible adapters.

## Detection Signals

```txt
package.json              -> Node / Electron / Web
src-tauri/tauri.conf.json -> Tauri
Cargo.toml                -> Rust
pyproject.toml            -> Python
requirements.txt          -> Python
Assets/                   -> Unity
ProjectSettings/          -> Unity
main.lua                  -> Lua / LÖVE2D candidate
conf.lua                  -> LÖVE2D
*.sln                     -> .NET
*.csproj                  -> .NET
*.fsproj                  -> .NET
*.vbproj                  -> .NET
go.mod                    -> Go
index.html                -> Static web
vite.config.*             -> Vite web app
next.config.*             -> Next.js web app
nuxt.config.*             -> Nuxt web app
```

## Detection Result Format

```lua
{
  adapter = "tauri",
  confidence = 0.98,
  signals = {
    "src-tauri/tauri.conf.json",
    "package.json",
    "Cargo.toml",
  },
  recommendation = "wire tauri + node + rust + web adapters",
}
```

## Multi-Adapter Detection

Modern projects often need multiple adapters.

Example:

```txt
Tauri project = tauri + rust + node + web
Electron project = electron + node + web
Unity project = unity + file_bus + generic
Python web app = python + web + cli
```

---

# 14. Adapter System

Adapters are how Hermes stays universal.

## Adapter Contract

```lua
---@class HermesAdapter
---@field id string
---@field name string
---@field version string
---@field priority number
---@field detect fun(ctx: HermesContext): HermesDetectResult
---@field install fun(ctx: HermesContext): HermesResult
---@field wire fun(ctx: HermesContext): HermesResult
---@field doctor fun(ctx: HermesContext): HermesDoctorResult
---@field uninstall fun(ctx: HermesContext): HermesResult
```

## Example Adapter

```lua
return {
  id = "node",
  name = "Node Adapter",
  version = "1.0.0",
  priority = 80,

  detect = function(ctx)
    if ctx.fs.exists("package.json") then
      return {
        matched = true,
        confidence = 0.95,
        reason = "package.json found",
      }
    end

    return {
      matched = false,
      confidence = 0,
      reason = "package.json not found",
    }
  end,

  install = function(ctx)
    ctx.fs.mkdir(".hermes/adapters")
    ctx.fs.write(".hermes/adapters/node.state", "installed=true")
    return ctx.result.ok("Node adapter installed")
  end,

  wire = function(ctx)
    ctx.templates.render(
      "templates/node-hermes-bridge.template.js",
      "scripts/hermes-bridge.js",
      ctx
    )

    return ctx.result.ok("Node bridge wired")
  end,

  doctor = function(ctx)
    local issues = {}

    if not ctx.fs.exists("package.json") then
      table.insert(issues, "package.json missing")
    end

    if not ctx.fs.exists("scripts/hermes-bridge.js") then
      table.insert(issues, "Node Hermes bridge missing")
    end

    return {
      ok = #issues == 0,
      issues = issues,
    }
  end,

  uninstall = function(ctx)
    return ctx.result.ok("Node adapter removed")
  end,
}
```

## Required Default Adapters

### `generic.adapter.lua`

Fallback adapter for unknown projects.

Responsibilities:

- Create `.hermes/`
- Enable CLI bridge
- Enable file bus
- Provide basic project info

### `cli.adapter.lua`

For command-line projects.

Responsibilities:

- Generate shell wrappers
- Provide JSON output mode
- Register CLI commands

### `node.adapter.lua`

Responsibilities:

- Detect `package.json`
- Add optional scripts
- Generate `scripts/hermes-bridge.js`
- Support stdin/stdout JSON-RPC

### `tauri.adapter.lua`

Responsibilities:

- Detect `src-tauri/`
- Generate Rust command bridge
- Generate frontend TypeScript client
- Document registration steps

### `python.adapter.lua`

Responsibilities:

- Detect Python project metadata
- Generate `hermes_bridge.py`
- Support subprocess bridge

### `unity.adapter.lua`

Responsibilities:

- Detect Unity folder layout
- Generate C# bridge script
- Use file bus by default
- Place runtime files in `StreamingAssets` when needed

### `web.adapter.lua`

Responsibilities:

- Detect frontend project
- Generate TypeScript/JavaScript client
- Support HTTP/WebSocket bridge

---

# 15. Bridge System

Hermes supports multiple bridge styles so different apps can integrate cleanly.

## 15.1 CLI Bridge

Best for:

- Scripts
- Build tooling
- CI
- Simple projects

Command:

```bash
lua hermes.lua run project.info --json
```

Output:

```json
{
  "ok": true,
  "result": {
    "name": "MyProject",
    "type": "tauri"
  }
}
```

## 15.2 stdin/stdout JSON-RPC Bridge

Best for:

- Node
- Electron
- Tauri
- Editors
- AI tools

Request:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "project.info",
  "params": {}
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "name": "MyProject",
    "type": "tauri"
  }
}
```

## 15.3 File Bus Bridge

Best for:

- Unity
- Restricted game engines
- Modding contexts
- Apps that can read/write files but should not spawn processes

Folders:

```txt
.hermes/bridge/inbox/
.hermes/bridge/outbox/
.hermes/bridge/errors/
.hermes/bridge/archive/
```

Request file:

```json
{
  "id": "evt_001",
  "type": "command",
  "command": "project.info",
  "params": {}
}
```

Response file:

```json
{
  "id": "evt_001",
  "ok": true,
  "result": {
    "name": "MyProject"
  }
}
```

## 15.4 HTTP Bridge

Best for:

- Local dashboards
- Browser tools
- Web dev panels

Endpoints:

```txt
GET  /health
GET  /project
POST /command
POST /event
GET  /plugins
GET  /doctor
```

Security defaults:

```txt
Host: 127.0.0.1
Remote access: disabled
Token required: true
CORS: disabled by default
```

## 15.5 WebSocket Bridge

Best for:

- Real-time dashboards
- Live reload
- App overlays
- Game debug panels

Events:

```txt
hermes.ready
project.changed
plugin.loaded
command.started
command.finished
doctor.issue_found
bridge.error
```

---

# 16. Event Bus

The event bus decouples the core, adapters, plugins, and bridge layers.

## Event Object

```lua
{
  id = "evt_123",
  name = "project.detected",
  timestamp = "2026-05-29T00:00:00Z",
  source = "core.detector",
  payload = {
    project_type = "node",
    confidence = 0.95,
  },
}
```

## Core Events

```txt
hermes.boot
hermes.ready
hermes.shutdown

install.started
install.completed
install.failed

project.detected
project.wired
project.changed

adapter.detected
adapter.installed
adapter.wired
adapter.failed

plugin.loaded
plugin.failed
plugin.command_registered

bridge.started
bridge.message_received
bridge.message_sent
bridge.failed

doctor.started
doctor.completed
doctor.issue_found
```

## API

```lua
ctx.events.emit("project.detected", {
  project_type = "node",
})

ctx.events.on("project.detected", function(event)
  ctx.logger.info("Detected " .. event.payload.project_type)
end)
```

---

# 17. Command Registry

The command registry provides a single interface for CLI, plugin, bridge, and app calls.

## Command Definition

```lua
ctx.commands.register("project.info", {
  description = "Return project information",
  permissions = {},
  handler = function(args, ctx)
    return {
      ok = true,
      result = ctx.project,
    }
  end,
})
```

## Successful Result

```lua
{
  ok = true,
  result = {},
  warnings = {},
  errors = {},
}
```

## Failed Result

```lua
{
  ok = false,
  error = {
    code = "PROJECT_NOT_FOUND",
    message = "Could not locate project root",
    hint = "Run Hermes from inside your project folder",
  },
}
```

---

# 18. Plugin System

Plugins extend Hermes without touching core.

## Plugin Structure

```txt
.hermes/plugins/my-plugin/
  plugin.lua
  plugin.manifest.lua
  README.md
```

## Plugin Manifest

```lua
return {
  id = "diagnostics",
  name = "Diagnostics Plugin",
  version = "1.0.0",
  author = "local",
  trusted = false,

  permissions = {
    shell = false,
    network = false,
    filesystem = "project",
    env = false,
    secrets = false,
  },

  commands = {
    "diagnostics.run",
    "diagnostics.report",
  },
}
```

## Plugin Entrypoint

```lua
return {
  activate = function(ctx)
    ctx.commands.register("diagnostics.run", {
      description = "Run plugin diagnostics",
      permissions = {},
      handler = function(args, ctx)
        return {
          ok = true,
          message = "Diagnostics complete",
        }
      end,
    })
  end,

  deactivate = function(ctx)
    ctx.logger.info("Diagnostics plugin unloaded")
  end,
}
```

## Plugin Permissions

```lua
permissions = {
  filesystem = "none" | "hermes" | "project" | "full",
  shell = true | false,
  network = true | false,
  env = true | false,
  secrets = true | false,
}
```

---

# 19. Installer System

## Installer Phases

```txt
1. Preflight
2. Project root detection
3. Config discovery
4. Existing install check
5. Backup
6. Folder creation
7. Adapter detection
8. Template rendering
9. Bridge wiring
10. Manifest write
11. Doctor validation
12. Final report
```

## Preflight Checks

- Lua runtime available
- Working directory readable
- Target directory writable
- `.hermes/` conflict check
- Existing manifest check
- Required core files available
- Platform detection

## Installer Report

```txt
Hermes Install Report
---------------------
Project: TrapTrade
Detected: tauri + node + rust + web
Installed: yes
Wired: partial
Generated:
  .hermes/hermes.config.lua
  .hermes/manifest.lua
  src/hermes/client.ts
  src-tauri/src/hermes_bridge.rs

Warnings:
  HTTP bridge disabled by default
  Shell execution disabled
  Some Tauri command registration may require manual import

Next:
  lua hermes.lua doctor
```

---

# 20. Wiring System

The wiring system applies adapter-specific changes.

## Node Wiring

Generated:

```txt
scripts/hermes-bridge.js
.hermes/adapters/node.adapter.lua
```

Optional `package.json` scripts:

```json
{
  "scripts": {
    "hermes:doctor": "lua hermes.lua doctor",
    "hermes:wire": "lua hermes.lua wire",
    "hermes:project": "lua hermes.lua run project.info --json"
  }
}
```

## Tauri Wiring

Generated:

```txt
src-tauri/src/hermes_bridge.rs
src/hermes/client.ts
.hermes/adapters/tauri.adapter.lua
```

Expected commands:

```txt
hermes_project_info
hermes_run_command
hermes_doctor
```

## Unity Wiring

Generated:

```txt
Assets/Hermes/HermesBridge.cs
Assets/StreamingAssets/Hermes/hermes.config.lua
.hermes/adapters/unity.adapter.lua
```

Default bridge:

```txt
File Bus
```

## Python Wiring

Generated:

```txt
hermes_bridge.py
.hermes/adapters/python.adapter.lua
```

Default bridge:

```txt
Subprocess CLI bridge
```

## Web Wiring

Generated:

```txt
src/hermes/client.ts
src/hermes/types.ts
.hermes/adapters/web.adapter.lua
```

Default bridge:

```txt
HTTP or WebSocket bridge when explicitly enabled
```

---

# 21. Doctor / Validation System

Doctor checks confirm Hermes is installed and wired correctly.

## Core Checks

```txt
Lua runtime available
Hermes entrypoint exists
.hermes folder exists
Config valid
Manifest valid
Project root valid
Adapters loadable
Plugins loadable
Bridge folders writable
Generated files present
No unsafe remote HTTP exposure
No secrets in config
No stale migration
Logs writable
Cache writable
```

## Adapter Checks

### Node

```txt
package.json exists
Hermes scripts present if expected
Bridge file exists
Node executable found if needed
```

### Tauri

```txt
src-tauri exists
Cargo.toml exists
tauri.conf exists
Bridge command file exists
Frontend client exists
```

### Unity

```txt
Assets exists
ProjectSettings exists
StreamingAssets/Hermes exists
File bus writable
C# bridge exists
```

### Python

```txt
pyproject.toml or requirements.txt exists
Python bridge exists
Python executable available if needed
```

## Doctor Output

```txt
Hermes Doctor
-------------
Status: Warning

OK:
  Lua runtime available
  Config valid
  Manifest valid
  File bus writable

Warnings:
  HTTP bridge disabled
  Node bridge script not referenced by package.json

Errors:
  None

Recommended Fix:
  Run `lua hermes.lua wire --adapter node`
```

---

# 22. Update System

Command:

```bash
lua hermes.lua update
```

Update steps:

```txt
1. Read current manifest
2. Compare current version
3. Backup generated files
4. Load migrations
5. Apply pending migrations
6. Refresh templates
7. Preserve user config
8. Re-run adapter doctor checks
9. Write update report
```

Do not overwrite custom files unless:

```bash
lua hermes.lua update --force
```

---

# 23. Migration System

Migrations allow Hermes to evolve safely.

Structure:

```txt
.hermes/migrations/
  0001_initial_install.lua
  0002_bridge_layout.lua
  0003_plugin_permissions.lua
```

Migration contract:

```lua
return {
  id = "0002_bridge_layout",

  up = function(ctx)
    ctx.fs.mkdir(".hermes/bridge/inbox")
    ctx.fs.mkdir(".hermes/bridge/outbox")
    return ctx.result.ok("Bridge folders created")
  end,

  down = function(ctx)
    return ctx.result.ok("No destructive rollback needed")
  end,
}
```

---

# 24. Uninstall System

Command:

```bash
lua hermes.lua uninstall
```

Behavior:

```txt
Read manifest
List generated files
Create final backup if enabled
Remove generated files
Remove package scripts if Hermes created them
Preserve user plugins unless --purge
Preserve logs unless --purge
Preserve config unless --purge
Print summary
```

Options:

```bash
lua hermes.lua uninstall --dry-run
lua hermes.lua uninstall --purge
lua hermes.lua uninstall --keep-config
```

---

# 25. Security Model

## Defaults

```txt
Shell execution: disabled
Network access: disabled
Plugin trust: required
Remote bridge access: disabled
Secret access: disabled
Generated file overwrite: disabled unless confirmed
Install backup: enabled
```

## Secret Handling

Allowed:

```txt
Environment variables
Ignored local file: .hermes/secrets.local.lua
Future OS keychain adapter
```

Blocked:

```txt
Secrets in hermes.config.lua
Secrets in manifest.lua
Secrets in generated templates
Secrets in logs
Secrets in doctor reports
```

## Redaction Patterns

Logger must redact values associated with:

```txt
API_KEY
TOKEN
SECRET
PASSWORD
PRIVATE_KEY
AUTHORIZATION
COOKIE
SESSION
BEARER
```

Example:

```txt
HERMES_TOKEN=********
```

## HTTP Bridge Security

Default:

```txt
host = 127.0.0.1
allow_remote = false
require_token = true
cors = false
```

Never bind to `0.0.0.0` unless the user explicitly enables it.

---

# 26. Logging and Diagnostics

## Log Levels

```txt
trace
debug
info
warn
error
fatal
```

## Log Files

```txt
.hermes/logs/hermes.log
.hermes/logs/install.log
.hermes/logs/doctor.log
.hermes/logs/bridge.log
```

## Log Entry Shape

```json
{
  "time": "2026-05-29T00:00:00Z",
  "level": "info",
  "scope": "installer",
  "message": "Adapter installed",
  "data": {
    "adapter": "node"
  }
}
```

---

# 27. Template System

Templates generate bridge files and configs.

## Template Variables

```txt
{{project_name}}
{{project_type}}
{{hermes_version}}
{{adapter_id}}
{{bridge_type}}
{{generated_at}}
{{safe_mode}}
```

## Template API

```lua
ctx.templates.render(
  "templates/node-hermes-bridge.template.js",
  "scripts/hermes-bridge.js",
  {
    project_name = ctx.project.name,
    bridge_type = "stdin_stdout",
  }
)
```

## Template Rules

- Generated files should include a header comment.
- Generated files should identify Hermes as the source.
- Generated files should not include secrets.
- Generated files should be tracked in manifest.
- Generated files should be safe to remove.

---

# 28. Generated Bridge Stubs

## Node Bridge Stub

```js
// Generated by Hermes.lua
// Safe to regenerate. Custom edits may be overwritten if force mode is used.

const { spawn } = require("child_process");

function callHermes(method, params = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("lua", ["hermes.lua", "bridge", "stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const request = {
      jsonrpc: "2.0",
      id: String(Date.now()),
      method,
      params,
    };

    let output = "";
    child.stdout.on("data", chunk => output += chunk.toString());
    child.stderr.on("data", chunk => process.stderr.write(chunk));
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`Hermes exited with ${code}`));
      try {
        resolve(JSON.parse(output));
      } catch (err) {
        reject(err);
      }
    });

    child.stdin.write(JSON.stringify(request) + "\n");
    child.stdin.end();
  });
}

module.exports = { callHermes };
```

## Python Bridge Stub

```python
# Generated by Hermes.lua

import json
import subprocess


def call_hermes(command, params=None):
    params = params or {}
    proc = subprocess.run(
        ["lua", "hermes.lua", "run", command, "--json"],
        capture_output=True,
        text=True,
        check=False,
    )

    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)

    return json.loads(proc.stdout)
```

## Unity File Bus Stub Concept

```csharp
// Generated by Hermes.lua
// Writes command JSON to .hermes/bridge/inbox and reads response from outbox.

using System;
using System.IO;
using UnityEngine;

public class HermesBridge : MonoBehaviour
{
    public string BridgeRoot = ".hermes/bridge";

    public void SendCommand(string commandJson)
    {
        var inbox = Path.Combine(BridgeRoot, "inbox");
        Directory.CreateDirectory(inbox);
        var id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        File.WriteAllText(Path.Combine(inbox, $"cmd_{id}.json"), commandJson);
    }
}
```

---

# 29. Testing Strategy

## Unit Tests

Test these modules:

```txt
core/fs.lua
core/path.lua
core/logger.lua
core/config.lua
core/result.lua
core/context.lua
core/manifest.lua
core/events.lua
core/commands.lua
core/security.lua
core/templates.lua
```

## Integration Tests

Fixtures:

```txt
tests/fixtures/node-project/
tests/fixtures/tauri-project/
tests/fixtures/python-project/
tests/fixtures/unity-project/
tests/fixtures/web-project/
tests/fixtures/generic-project/
```

Test commands:

```bash
lua hermes.lua install --dry-run
lua hermes.lua install
lua hermes.lua doctor
lua hermes.lua wire
lua hermes.lua run project.info --json
lua hermes.lua uninstall --dry-run
```

## Golden Output Tests

Expected snapshots:

```txt
tests/golden/install-node.txt
tests/golden/doctor-tauri.txt
tests/golden/uninstall-generic.txt
```

---

# 30. CI/CD Strategy

## GitHub Actions Workflows

```txt
.github/workflows/test.yml
.github/workflows/lint.yml
.github/workflows/release.yml
.github/workflows/bundle.yml
```

## Pipeline

```txt
Checkout repo
Install Lua versions
Run lint
Run unit tests
Run integration fixture tests
Generate bundled hermes.lua
Generate checksums
Upload artifacts
Create release notes
```

## Target Lua Versions

```txt
Lua 5.1
Lua 5.2
Lua 5.3
Lua 5.4
LuaJIT
```

---

# 31. Release Packaging

Release artifacts:

```txt
hermes.lua
hermes-full.zip
hermes-source.zip
checksums.txt
README.md
CHANGELOG.md
```

## Single-File Build

The release should support a bundled `hermes.lua` that embeds or can unpack the core files.

Development should stay modular.

Release should be easy to drop into a repo.

---

# 32. AI Agent Integration

Hermes should generate:

```txt
.hermes/AGENT.md
.hermes/context/project-map.json
.hermes/context/commands.json
.hermes/context/adapters.json
.hermes/context/doctor-report.json
```

## Example `.hermes/AGENT.md`

```md
# Hermes Agent Context

This project uses Hermes as a Lua extension and integration layer.

Use these commands:

- `lua hermes.lua doctor`
- `lua hermes.lua install --dry-run`
- `lua hermes.lua wire`
- `lua hermes.lua run project.info --json`

Rules:

- Do not edit generated files unless necessary.
- Prefer adding adapters or plugins.
- Never store secrets in config.
- Run doctor after changing Hermes wiring.
- Preserve `.hermes/manifest.lua` integrity.
```

---

# 33. Developer Experience

Hermes should feel smooth in daily use.

## Good Error Example

Bad:

```txt
Error: failed
```

Good:

```txt
Hermes could not wire the Node adapter because package.json was not found.

Why it matters:
  Node wiring requires package.json so Hermes can add optional scripts safely.

Fix:
  Run from your project root, or use:
  lua hermes.lua wire --adapter generic
```

## UX Rules

- Print clear next steps.
- Use consistent output formatting.
- Support `--json` for automation.
- Explain warnings without panic energy.
- Never silently overwrite files.
- Keep logs detailed but console output clean.

---

# 34. Implementation Phases

## Phase 1 — Core Kernel

Build:

```txt
hermes.lua
core/fs.lua
core/path.lua
core/logger.lua
core/result.lua
core/config.lua
core/context.lua
core/cli.lua
```

Commands:

```txt
init
doctor
install --dry-run
```

## Phase 2 — Installer

Build:

```txt
installers/install.lua
core/manifest.lua
core/templates.lua
core/project_detect.lua
```

Support:

```txt
Generic adapter
CLI adapter
Manifest writing
Safe backup
```

## Phase 3 — Adapters

Build:

```txt
node.adapter.lua
tauri.adapter.lua
python.adapter.lua
unity.adapter.lua
web.adapter.lua
```

## Phase 4 — Bridge System

Build:

```txt
bridge/json_rpc.lua
bridge/stdin_stdout.lua
bridge/file_bus.lua
```

Add later:

```txt
bridge/http.lua
bridge/websocket.lua
```

## Phase 5 — Plugin System

Build:

```txt
core/plugin_loader.lua
core/security.lua
core/commands.lua
plugins/example.plugin.lua
```

## Phase 6 — Full Doctor + Migration

Build:

```txt
installers/doctor.lua
core/migration.lua
installers/update.lua
installers/uninstall.lua
```

---

# 35. Acceptance Criteria

Hermes is considered successful when:

```txt
A blank project can run `lua hermes.lua install`
Hermes detects the project type correctly
Hermes creates `.hermes/` safely
Hermes can wire at least one adapter
Hermes can run doctor and explain issues clearly
Hermes can expose project.info through CLI
Hermes can communicate through JSON-RPC or file bus
Hermes can load a plugin
Hermes can uninstall without deleting user files
Hermes works on Windows, macOS, and Linux
Hermes supports --dry-run for install, wire, update, and uninstall
Hermes redacts secrets in logs
Hermes creates AI-agent-readable context files
```

---

# 36. Risk Register

| Risk | Impact | Mitigation |
|---|---:|---|
| Overwriting user files | High | Manifest tracking, backups, no overwrite by default |
| Broken adapter detection | Medium | Confidence scoring and manual override |
| Plugin abuse | High | Trust model and permissions |
| Secret leakage | High | Redaction and config scanning |
| Cross-platform path bugs | Medium | Path abstraction module |
| HTTP bridge exposure | High | Bind local only and require token |
| Too much scope | High | Ship MVP first, defer advanced bridges |
| Lua version mismatch | Medium | Keep syntax Lua 5.1-compatible where possible |
| AI agent edits generated files poorly | Medium | Generate AGENT.md and file headers |

---

# 37. Full AI Build Prompt

Use this prompt in Claude, Codex, Kimi, Gemini, Antigravity, Cursor, or another coding agent.

```md
You are a senior Lua systems engineer, framework architect, installer designer, cross-platform tooling expert, and developer-experience specialist.

Build a complete project-agnostic Lua extension framework named Hermes.

Hermes must be a portable `.lua` extension system with a built-in installer, adapter registry, plugin loader, bridge system, command registry, project detector, doctor validator, migration system, update system, uninstall system, and safe generated-file tracking.

Primary requirements:

1. Create a `hermes.lua` main entrypoint.
2. Support these commands:
   - `install`
   - `init`
   - `wire`
   - `doctor`
   - `run <command>`
   - `plugin list`
   - `plugin add`
   - `plugin remove`
   - `plugin trust`
   - `update`
   - `uninstall`
3. Create a modular source layout:
   - `core/`
   - `adapters/`
   - `bridge/`
   - `installers/`
   - `templates/`
   - `plugins/`
   - `tests/`
   - `docs/`
4. Include adapters for:
   - generic CLI projects
   - Node projects
   - Electron projects
   - Tauri/Rust projects
   - Python projects
   - Unity projects
   - web projects
   - Go projects
   - .NET projects
5. Use adapter contracts with:
   - `detect(ctx)`
   - `install(ctx)`
   - `wire(ctx)`
   - `doctor(ctx)`
   - `uninstall(ctx)`
6. Add project detection based on common files:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `Cargo.toml`
   - `pyproject.toml`
   - `requirements.txt`
   - `Assets/`
   - `ProjectSettings/`
   - `go.mod`
   - `index.html`
   - `vite.config.*`
   - `next.config.*`
   - `.sln`
   - `.csproj`
7. Implement bridge options:
   - CLI bridge
   - stdin/stdout JSON-RPC bridge
   - file bus bridge
   - optional local HTTP bridge
   - optional WebSocket bridge
8. Implement safe installer behavior:
   - dry-run mode
   - backup before modification
   - no destructive overwrite by default
   - manifest tracking
   - generated file tracking
   - clear install report
9. Implement `.hermes/hermes.config.lua`.
10. Implement `.hermes/manifest.lua`.
11. Implement plugin loading with permissions:
   - filesystem
   - shell
   - network
   - env
   - secrets
12. Shell execution must be disabled by default.
13. Network access must be disabled by default.
14. Plugins must require trust by default.
15. Logs must redact secrets.
16. Doctor must check:
   - Lua runtime
   - config validity
   - manifest validity
   - adapter health
   - plugin health
   - bridge health
   - unsafe config
   - missing files
   - stale migrations
   - writable bridge folders
17. Add migrations:
   - `up(ctx)`
   - `down(ctx)`
18. Add tests:
   - unit tests
   - integration fixtures
   - golden output tests
19. Add documentation:
   - architecture
   - adapter authoring
   - plugin authoring
   - bridge contracts
   - security
   - troubleshooting
   - release checklist
20. Create an AI-agent-friendly `.hermes/AGENT.md`.
21. Generate context files:
   - `.hermes/context/project-map.json`
   - `.hermes/context/commands.json`
   - `.hermes/context/adapters.json`
   - `.hermes/context/doctor-report.json`

Important design rules:

- Do not use process injection.
- Do not bypass app security.
- Do not store plaintext secrets in committed config.
- Prefer adapter-based integration.
- Prefer JSON output for automation.
- Keep everything cross-platform.
- Use clean, readable Lua.
- Add LuaLS annotations where helpful.
- Make the system understandable to a solo developer.
- Make generated files obvious and safe to remove.
- Every generated file must be tracked in the manifest.
- Every potentially destructive command must support `--dry-run`.

Deliverables:

1. Full repo file structure.
2. Working `hermes.lua`.
3. Core modules.
4. Generic, CLI, Node, Electron, Tauri, Rust, Python, Unity, Web, Go, and .NET adapters.
5. Working installer.
6. Working doctor command.
7. Working manifest system.
8. Working config system.
9. Working command registry.
10. Working event bus.
11. Working file bus bridge.
12. Working stdin/stdout JSON-RPC bridge.
13. Example plugin.
14. Test suite.
15. Documentation.
16. Release checklist.

Build this as production-grade scaffolding, not a toy prototype.
```

---

# Appendix A: Core Lua Interfaces

## Hermes Context

```lua
---@class HermesContext
---@field root string
---@field project table
---@field config table
---@field manifest table
---@field fs table
---@field path table
---@field logger table
---@field result table
---@field events table
---@field commands table
---@field security table
---@field templates table
```

## Result Helper

```lua
local result = {}

function result.ok(message, data)
  return {
    ok = true,
    message = message,
    data = data or {},
  }
end

function result.fail(code, message, hint)
  return {
    ok = false,
    error = {
      code = code,
      message = message,
      hint = hint,
    },
  }
end

return result
```

## Adapter Detection Result

```lua
{
  matched = true,
  confidence = 0.95,
  reason = "package.json found",
  signals = { "package.json" },
}
```

---

# Appendix B: Example Files

## Example `.gitignore` Entries

```gitignore
.hermes/logs/
.hermes/cache/
.hermes/backups/
.hermes/secrets.local.lua
.hermes/*.local.lua
```

## Example Generated Header

```txt
Generated by Hermes.lua
Do not edit unless you know what you are doing.
This file is tracked in .hermes/manifest.lua.
Regenerate with: lua hermes.lua wire
```

## Example Command Output Contract

```json
{
  "ok": true,
  "command": "project.info",
  "duration_ms": 12,
  "result": {},
  "warnings": [],
  "errors": []
}
```

---

# Appendix C: Recommended MVP Scope

Build this first:

```txt
hermes.lua
core/fs.lua
core/path.lua
core/logger.lua
core/result.lua
core/config.lua
core/context.lua
core/cli.lua
core/project_detect.lua
core/manifest.lua
core/adapter_registry.lua
core/commands.lua
core/events.lua
core/templates.lua
core/security.lua
installers/install.lua
installers/doctor.lua
installers/wire.lua
adapters/generic.adapter.lua
adapters/cli.adapter.lua
adapters/node.adapter.lua
bridge/file_bus.lua
bridge/json_rpc.lua
bridge/stdin_stdout.lua
plugins/example.plugin.lua
```

Defer to v1.1:

```txt
HTTP bridge
WebSocket bridge
Unity advanced runtime bridge
Tauri native command automation
Plugin signatures
Remote plugin registry
GUI dashboard
Go adapter
.NET adapter
Electron adapter refinements
```

MVP success means Hermes can install, detect, wire a basic project, run doctor, expose project info, load a plugin, and uninstall safely.

---

# End of Specification

Hermes should be built like a clean toolbox, not a junk drawer with confidence. Keep the core small, push specifics into adapters, and make every action reversible where possible.
