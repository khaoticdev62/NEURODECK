# Volume IX — Plugin SDK & Hermes Integration

## Philosophy
Everything is extensible. Nothing is trusted.

## Plugin Categories
Prompt extensions, command extensions, agent extensions, UI extensions, macro extensions, controller extensions, memory extensions, model extensions.

## Hermes Runtime
Hermes is the primary scripting runtime for lightweight, controller-friendly, Steam Deck-friendly plugins.

## Lifecycle
on_load, on_enable, on_disable, on_unload.

## Manifest

```json
{
  "id": "promptdrive.git-tools",
  "name": "Git Tools",
  "version": "1.0.0",
  "author": "Khaotic Labs",
  "permissions": ["commands", "workspace"]
}
```

## Permissions
prompt.read/create/modify, command.read/execute, agent.read/execute, memory.read/write, controller.read/bind, ui.panel/widget/modal.

## Sandboxing
Plugins never receive raw database access, raw IPC access, OS shell access, or credential access.

## APIs
prompts, commands, agents, memory, workspace, controller, storage, events, notifications.

## Certification
SDK cannot ship unless sandboxing, permissions, storage isolation, lifecycle hooks, prompt extensions, command extensions, agent extensions, UI extensions, controller extensions, and memory extensions all work.
