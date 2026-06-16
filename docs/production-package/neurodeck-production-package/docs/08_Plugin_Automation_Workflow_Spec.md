# NEURODECK Plugin SDK & Automation Workflow Specification

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Plugin SDK

### 1.1 Runtime

- **Engine:** Lua 5.4 via `mlua` crate with `vendored` feature
- **Auto-load:** Every `.lua` file in `plugins/` loads at app init
- **Error handling:** Syntax errors silently suppress that plugin; check terminal for `[Lua Error]`
- **Hot-reload:** `reload_plugins` command re-scans and reloads all plugins

### 1.2 Lua Globals

| Global | Signature | Description |
|---|---|---|
| `print` | `print(...)` | Redirected to Rust tracing logs |
| `execute` | `execute(command)` | Runs shell command, returns stdout |
| `registerCommand` | `registerCommand(name, handler)` | Adds `/name` slash command to chat |
| `registerHook` | `registerHook(event, handler)` | Subscribes to backend events |
| `setPersona` | `setPersona(id, prompt)` | Registers a custom persona |

### 1.3 Plugin Structure

```lua
-- plugins/my_plugin.lua
-- A NEURODECK plugin

local function my_handler(args)
    print("My plugin received: " .. tostring(args))
    return "Hello from my plugin!"
end

registerCommand("myplugin", my_handler)
```

### 1.4 Plugin Manager

**Settings → Plugin Manager:**
- List all plugins with enable/disable toggle (renames `.disabled`)
- Install from URL: downloads `.lua` to `plugins/`
- "+ New Plugin": opens Canvas with plugin template
- "↺ Reload": hot-reloads all plugins without restart

### 1.5 Security

- `PluginLoad` capability required to load plugins
- Path traversal validation on file names
- GitHub-only downloads for marketplace installs
- Syntax checked before load (malformed plugins are silently skipped)

---

## 2. Workflow Engine

### 2.1 Node Types (9)

| Type | Purpose | Config Fields |
|---|---|---|
| `trigger` | Entry point | `seed` (initial input) |
| `prompt` | LLM call | `prompt` (template with `{{input}}`) |
| `shell` | Execute command | `command`, `lang` (bash/python/powershell) |
| `file_op` | Read/write/append | `mode` (read/write/append), `path`, `content` |
| `pty_cmd` | PTY command | `command` (placeholder — headless limitation) |
| `memory` | Memory search | `query`, `limit` |
| `condition` | Branching | `expression`, `trueSeed`, `falseSeed` |
| `transform` | Data transform | `mode` (trim/uppercase/lowercase/title_case/reverse/count_words/template) |
| `output` | Terminal node | (no config — passes input through) |

### 2.2 Template Substitution

- `{{input}}` — current node's input
- `{{node:n1}}` — output of node with ID `n1`
- Recursive substitution across JSON config values

### 2.3 Condition Evaluator

Supports: `==`, `!=`, `<`, `>`, `<=`, `>=`, `.len()`, `.contains()`, `&&`, `||`

Example: `input.len() > 10 && input.contains("hello")`

Numeric comparison auto-detected (parses as f64 before comparing).

### 2.4 Execution Modes

| Mode | Trigger | Events |
|---|---|---|
| Frontend Run | User clicks Run button in workflow editor | `workflow_started`, `workflow_node_start`, `workflow_node_done`, `workflow_complete` |
| Scheduler Cron | Task goal starts with `workflow:{name}` | Same events + `scheduled_task_started` |
| Manual Run | `run_task_now` on scheduler task | Same events + `manual: true` |

### 2.5 Run History

Persisted to `data/workflows/history/{name}/{timestamp}.json`:

```json
{
  "workflow_name": "My Workflow",
  "current_node_id": "n2",
  "outputs": { "n1": "hello", "n2": "world" },
  "running": false,
  "started_at": "2026-06-08T05:00:00Z",
  "completed_at": "2026-06-08T05:00:30Z",
  "final_output": "world",
  "error": null
}
```

---

## 3. Scheduler Integration

### 3.1 Cron Format

- Frontend: 5-field (`min hr dom mon dow`)
- Backend: auto-converted to 6-field (`sec min hr dom mon dow`) for tokio-cron-scheduler

### 3.2 Workflow Triggering

Set task `goal` to `workflow:{workflow_name}` to trigger workflow execution on cron fire.

Example:
```json
{
  "name": "Daily Report",
  "cron": "0 9 * * *",
  "goal": "workflow:daily-report",
  "enabled": true
}
```

### 3.3 Commands

- `list_scheduled_tasks` — list all tasks
- `add_scheduled_task` — create new task
- `delete_scheduled_task` — remove task
- `toggle_scheduled_task` — enable/disable
- `run_task_now` — manual trigger

---

## 4. Orchestrator

### 4.1 Multi-Agent Task Decomposition

1. LLM generates plan from goal (up to 5 parallel tasks)
2. Each task assigned to an agent with persona + provider
3. Tasks execute in parallel tokio tasks
4. Results synthesized by coordinator agent
5. `orchestration_complete` event emitted

### 4.2 Events

- `orchestrator_plan_ready` — plan generated
- `agent_task_started` — individual agent begins
- `agent_task_done` — individual agent completes
- `orchestration_complete` — all tasks done

### 4.3 Abort

`stop_orchestration` command sends abort signal via oneshot channel.

---

## 5. Permission Gating

All automation features require explicit capabilities:

| Feature | Required Capability |
|---|---|
| Workflow shell nodes | ShellExec |
| Workflow file_op nodes | FileSystemRead / FileSystemWrite |
| Workflow prompt nodes | Network |
| Scheduler workflow triggers | ShellExec + Network (inherited from workflow) |
| Orchestrator agent tasks | Network + capabilities of assigned agents |
| Plugin loading | PluginLoad |
| Plugin execute() | ShellExec |

The active agent's permission profile is checked at runtime. If a capability is missing, the operation returns `Permission denied: agent '{}' lacks '{}' capability`.
