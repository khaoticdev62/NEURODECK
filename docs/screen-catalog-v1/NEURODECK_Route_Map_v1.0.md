# NEURODECK Route Map v1.0

**Date:** 2026-06-09  
**Framework:** Electron + React Router or equivalent route layer

## Route Principles

- Routes are renderer-owned views.
- Privileged data comes through preload-exposed APIs only.
- Overlays use overlay routes or global state but must be deep-linkable in tests.
- Boot and Recovery are system routes and may be rendered before the full AppShell is available.

## Route Table

| Route | Screen ID | Screen | Shell Required | Auth/Setup Required | Notes |
|---|---|---|---|---|---|
| `internal://boot` | SCR-BOOT | Boot / Startup Screen | No | No | Initialize NEURODECK safely, validate runtime, load settings, detect previous crash state, and route the user to onboarding, recovery, or workspace. |
| `/onboarding` | SCR-ONB | First-Run Onboarding | Yes | No | Guide a new user through core setup without blocking them from entering the app. |
| `/workspace` | SCR-WKS | AI Workspace | Yes | Yes | Provide the primary AI interaction surface for local/remote model use, session continuity, memory visibility, and agent context. |
| `overlay://command-palette` | SCR-CMD | Command Palette Overlay | Yes | Yes | Expose global navigation and safe command execution from anywhere in the app. |
| `/models` | SCR-MDL | Model Manager | Yes | Yes | Let users configure local and remote AI providers, choose defaults, test connectivity, and recover from broken models. |
| `/agents` | SCR-AGT | Agent Manager | Yes | Yes | Manage built-in and user-created agents/personas used to shape AI workflows. |
| `/memory` | SCR-MEM | Memory and Context Manager | Yes | Yes | Give users transparent control over what NEURODECK remembers, where it came from, and whether it can be used in future sessions. |
| `/sessions` | SCR-SES | Session Browser | Yes | Yes | Allow users to find, resume, organize, export, and delete AI sessions. |
| `/extensions` | SCR-PLG | Plugins and Hermes Extensions | Yes | Yes | Manage Lua-based Hermes extensions and future plugin packages with explicit permissions and diagnostics. |
| `/settings` | SCR-SET | Settings Hub | Yes | Yes | Centralize app preferences, appearance, input, model defaults, privacy, storage, and reset operations. |
| `/settings/security` | SCR-SEC | Security and Privacy Center | Yes | Yes | Expose security posture, secrets status, extension trust, log redaction, and privacy controls. |
| `/diagnostics` | SCR-DIAG | Diagnostics Dashboard | Yes | No | Give users and developers a clear health view of app runtime, models, storage, plugins, logs, and Steam Deck compatibility. |
| `/settings/themes` | SCR-THEME | Theme Manager | Yes | Yes | Let users preview and select NEURODECK visual themes without breaking accessibility or Steam Deck readability. |
| `/exports` | SCR-EXP | Export Manager | Yes | Yes | Centralize export of sessions, diagnostics, logs, and selected memory data. |
| `/maintenance` | SCR-UPD | Update and Maintenance | Yes | Yes | Support safe app updates, migration checks, checksums, repair flows, and maintenance tasks. |
| `/recovery` | SCR-ERR | Error Recovery Center | No | No | Provide a safe recovery path when NEURODECK cannot start or a critical subsystem fails. |


## Navigation Tree

```text
Boot
├─ Onboarding
├─ Error Recovery
└─ AppShell
   ├─ Workspace
   │  ├─ Command Palette Overlay
   │  ├─ Export Manager
   │  └─ Memory/Agent Context Rail
   ├─ Sessions
   ├─ Models
   ├─ Agents
   ├─ Memory
   ├─ Extensions
   ├─ Diagnostics
   └─ Settings
      ├─ Security & Privacy
      ├─ Themes
      └─ Maintenance
```

## Route Guards

| Guard | Applies To | Behavior |
|---|---|---|
| `requiresSetup` | Workspace, Models, Sessions, Agents, Memory, Extensions, Settings | Redirect to onboarding if setup incomplete, unless user skipped setup. |
| `safeMode` | Extensions, Models, Agents | Disable risky actions and show recovery banner. |
| `dirtySettings` | Settings routes | Confirm before leaving with unsaved changes. |
| `extensionTrust` | Extensions commands | Block execution until extension is trusted. |
| `providerSecretStatus` | Model execution | Route to provider setup if required secret missing. |

## Deep Link Policy

NEURODECK v1.0 should support internal route restoration only. External deep links are out of scope unless explicitly added to packaging/release specs.
