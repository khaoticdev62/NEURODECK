# NEURODECK Hermes Lua Extension Contract v1.0

**Project:** NEURODECK  
**Document Type:** Hermes Extension Runtime Contract  
**Version:** 1.0  

---

## 1. Purpose

This contract defines how Lua-based Hermes extensions integrate with NEURODECK safely.

Hermes extensions are for:

- workflow automation
- launcher creation
- project wiring
- diagnostics
- command packs
- external tool helpers

Hermes extensions are not allowed to become unrestricted malware launchers wearing a friendly icon.

---

## 2. Required Extension Structure

```text
my-extension/
  extension.lua
  hermes.manifest.lua
  README.md
```

---

## 3. Manifest Contract

```lua
return {
  id = "my_extension",
  name = "My Extension",
  version = "1.0.0",
  description = "What this extension does",
  author = "local",
  minimum_neurodeck_version = "1.0.0",
  permissions = {
    filesystem = "app",
    shell = false,
    network = false,
    secrets = false
  },
  commands = {
    {
      id = "doctor",
      description = "Run extension health checks",
      risky = false
    }
  }
}
```

---

## 4. Lua Entrypoint Contract

```lua
return {
  activate = function(ctx)
    ctx.commands.register("doctor", function(args)
      return {
        ok = true,
        data = {
          message = "Extension healthy"
        }
      }
    end)
  end,

  deactivate = function(ctx)
    -- cleanup if needed
  end
}
```

---

## 5. Context API

Allowed context methods depend on permissions.

```lua
ctx.logger.info(message)
ctx.logger.warn(message)
ctx.logger.error(message)
ctx.fs.read_app(path)
ctx.fs.write_app(path, content)
ctx.commands.register(id, handler)
ctx.events.emit(name, payload)
ctx.result.ok(data)
ctx.result.err(code, message)
```

Restricted methods:

```lua
ctx.shell.run(command)
ctx.network.request(options)
ctx.secrets.get(ref)
ctx.fs.read_project(path)
ctx.fs.write_project(path, content)
```

Restricted methods require explicit manifest permission and user trust.

---

## 6. Trust and Execution

Execution requires:

1. valid manifest
2. extension installed in approved directory
3. trust state allows execution
4. command is declared
5. permissions satisfy command requirements
6. args validate

---

## 7. UI Exposure

Renderer may display:

- name
- version
- description
- commands
- permissions
- trust state
- last run status

Renderer must not execute raw Lua or display secret values.
