# NeuroDeck OS Complete Platform Implementation Set

## Required execution order

### 1. Design source of truth

`NeuroDeck_OS_Controller_Wireframe_Spec.md`

Defines the original 56 controller-native screens, shell, visual system, focus rules, UX states, recovery behavior, and controller contract.

### 2. Core implementation

`NeuroDeck_OS_Production_Implementation_Mega_Prompt.md`

Builds the secure Electron harness, controller runtime, focus engine, AI plans and permissions, workspaces, files, terminal, Git, browser, agents, workflows, models, remote systems, recovery, tests, and SteamOS packaging.

### 3. Platform completion

`NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md`

Adds the remaining must-have operating-platform systems:

- Application library and package lifecycle
- Steam shortcut and launch-profile management
- Sandboxed extensions and signed marketplace
- SDK and CLI
- Knowledge vault, retrieval, and scoped memory
- Voice, dictation, screen context, and document intake
- Clipboard, snippets, sharing, downloads, and LAN transfer
- Sync, backup, restore, import/export, and migration
- Device, Bluetooth, audio, display, dock, and removable-storage services
- Resource governor and durable scheduler
- Profiles, guest mode, vault, and identity controls
- Offline queue and session continuity
- Privacy lifecycle, telemetry, support, supply-chain security
- Localization, help, safe mode, presentation, and kiosk foundations
- 70 additional controller-native screens

## Agent instruction

Place all three specification files inside the target repository.

Run the core implementation prompt first. Then run the missing must-have features prompt against the same repository.

The second prompt must extend shared services rather than building duplicate permissions, notifications, settings, task queues, search, recovery, or controller systems.

A coding agent must not report completion based on routes, UI scaffolds, static cards, or mocked data. Completion requires real services, typed IPC, controller traversal, failure states, tests, and acceptance evidence.
