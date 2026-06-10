# NEURODECK PromptDrive — Repo Execution Runbook

## Purpose

This runbook is the execution layer after the scaffold, hardening guide, vertical slice build pack, and AI coding-agent implementation prompt.

Use this to move PromptDrive from generated scaffold into a runnable, testable, production-grade vertical slice.

---

## Required Inputs

You should have these artifacts available:

```txt
neurodeck-promptdrive-scaffold.zip
PROMPTDRIVE_PRODUCTION_HARDENING_VERTICAL_SLICE_GUIDE.md
PROMPTDRIVE_VERTICAL_SLICE_BUILD_PACK.md
PROMPTDRIVE_AI_CODING_AGENT_IMPLEMENTATION_PROMPT.md
```

---

## Execution Goal

The first production vertical slice must prove this full loop:

```txt
Launch NEURODECK
→ Open PromptDrive Composer
→ Select a prompt template
→ Fill slots
→ Use autocomplete
→ Preview final prompt
→ Execute prompt through IPC
→ Save the workflow as a macro
→ Re-run macro
→ Navigate everything with controller mappings
```

No fake UI-only success.  
No mocked runtime that lies.  
No “TODO: wire later” nonsense.

---

# Phase 1 — Repo Bootstrap

## 1. Unpack Scaffold

```bash
unzip neurodeck-promptdrive-scaffold.zip
cd neurodeck
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Baseline Audit

```bash
pnpm build
pnpm lint
pnpm test
```

## 4. Capture Failures

Create:

```txt
docs/audit/BOOTSTRAP_FAILURES.md
```

Document:

```txt
Command run
Error output
Package affected
Likely root cause
Fix applied
Verification result
```

---

# Phase 2 — Fix Build System First

Do not touch features until the repo builds.

## Required Checks

```txt
Root workspace resolves
Every package has package.json
Every package has tsconfig.json
Exports are valid
TypeScript paths resolve
Electron main builds
Preload builds
Renderer builds
Tailwind compiles
Vite config works
```

## Completion Gate

```bash
pnpm build
```

must pass cleanly.

---

# Phase 3 — Shared Types Lockdown

Shared types are the spine of PromptDrive.

## Must Exist

```txt
packages/shared-types/src/controller.ts
packages/shared-types/src/prompts.ts
packages/shared-types/src/commands.ts
packages/shared-types/src/macros.ts
packages/shared-types/src/agents.ts
packages/shared-types/src/index.ts
```

## Required Types

```ts
RiskLevel
ControllerBinding
ControllerProfile
PromptTemplate
PromptSlot
PromptPackManifest
CommandDefinition
MacroDefinition
MacroStep
AgentDefinition
Suggestion
```

## Completion Gate

```bash
pnpm --filter @neurodeck/shared-types build
```

---

# Phase 4 — Storage Layer

## Required Files

```txt
packages/storage/src/db.ts
packages/storage/src/migrations.ts
packages/storage/src/repositories/prompt.repository.ts
packages/storage/src/repositories/macro.repository.ts
packages/storage/src/repositories/agent.repository.ts
packages/storage/src/repositories/controller.repository.ts
```

## Required Tables

```sql
prompts
prompt_slots
commands
macros
macro_steps
agents
controller_profiles
sessions
settings
```

## Completion Gate

A local SQLite DB can be created, migrated, seeded, and queried.

```bash
pnpm --filter @neurodeck/storage test
```

---

# Phase 5 — Controller Runtime

## Required Behavior

```txt
Tap detection
Hold detection
Chord detection
Action registry
Steam Deck default profile
Keyboard fallback profile
Controller profile validation
```

## Default Bindings

```txt
L4.tap       OPEN_PROMPT_LIBRARY
L4.hold      OPEN_AGENT_WHEEL
L5.tap       SAVE_PROMPT
L5.hold      OPEN_SNIPPET_VAULT
R4.tap       ACCEPT_SUGGESTION
R4.hold      REGENERATE
R5.tap       OPEN_COMMAND_PALETTE
R5.hold      EXECUTE_PROMPT
L4+R4        COMPLETE_PROMPT
L5+R5        TOGGLE_MACRO_RECORDING
B.tap        BACK
B.hold       CANCEL_OPERATION
```

## Completion Gate

Controller events dispatch action IDs, not direct UI calls.

---

# Phase 6 — PromptDrive Core

## Required Runtime Flow

```txt
Load prompt pack
Validate manifest
Load templates
Select template
Fill slots
Validate required slots
Render preview
Return final prompt string
```

## Required Tests

```txt
Template with all slots renders correctly
Missing required slot fails validation
Invalid prompt pack fails safely
Unknown slot is reported
Preview output is deterministic
```

---

# Phase 7 — Autocomplete Engine

## Required Sources

```txt
Prompt templates
Prompt slots
Commands
Macros
Agents
Recent actions
Pinned items
Project files
```

## Required Performance

```txt
Suggestion response under 50ms for seed dataset
```

## Ranking Formula

```txt
prefix match
+ fuzzy match
+ context match
+ recency
+ pinned boost
+ active agent/persona boost
```

---

# Phase 8 — Electron IPC

Renderer must never directly access:

```txt
Filesystem
SQLite
Shell command execution
Prompt pack loading
Macro persistence
```

## Required IPC Groups

```txt
prompts
commands
macros
agents
controller
settings
diagnostics
```

## Completion Gate

Renderer calls:

```ts
window.neurodeck.prompts.list()
window.neurodeck.prompts.preview()
window.neurodeck.prompts.execute()
window.neurodeck.macros.startRecording()
window.neurodeck.macros.stopRecording()
window.neurodeck.controller.getProfile()
```

---

# Phase 9 — Renderer Vertical Slice

## Required Screens

```txt
WorkspaceScreen
PromptComposerScreen
PromptLibraryScreen
CommandPaletteScreen
MacroRecorderScreen
ControllerMapperScreen
AgentConsoleScreen
DiagnosticsScreen
```

## First Slice Screen Priority

Build only what the vertical slice needs first:

```txt
PromptComposerScreen
PromptLibraryPanel
PromptPreviewPanel
SuggestionList
MacroStatusBar
DeckButtonHint
```

## Completion Gate

User can complete the first vertical slice without keyboard.

---

# Phase 10 — Macro Engine

## Required Flow

```txt
Start recording
Capture action IDs
Capture payload snapshots
Stop recording
Name macro
Persist macro
Replay macro
Handle failure step
Require confirmation for risky steps
```

## Completion Gate

```txt
L5+R5 starts macro recording
L5+R5 stops macro recording
Saved macro appears in macro library
Macro replay reproduces prompt flow
```

---

# Phase 11 — Controller-Only QA

## Must Pass

```txt
Can open prompt library with L4
Can move template selection with D-pad
Can accept autocomplete with R4
Can execute prompt with R5 hold
Can save with L5
Can record macro with L5+R5
Can exit every modal with B
Can cancel long operation with B hold
No dead-end focus states
```

---

# Phase 12 — Steam Deck Validation

## Handheld

```txt
1280×800
Large enough text
No clipped panels
No tiny hit targets
No required keyboard
No hover-only controls
```

## Docked

```txt
1920×1080
Layout scales
Controller hints remain visible
Focus graph remains valid
```

## Suspend / Resume

```txt
Prompt state persists
Macro recording safely pauses or cancels
No DB corruption
No lost controller profile
```

---

# Phase 13 — AI Coding-Agent Usage Protocol

When using Claude, Kimi, Gemini, or another coding agent:

1. Paste the implementation prompt.
2. Attach this runbook.
3. Attach the vertical slice build pack.
4. Tell the agent to inspect the repo before editing.
5. Require it to run build/test/lint after changes.
6. Reject any answer that creates mock success.
7. Require a changed-files report.
8. Require command output summary.

## Agent Must Not

```txt
Invent missing files without checking
Replace architecture with simpler toy version
Skip IPC security
Bypass SQLite
Hardcode prompt output
Remove controller mappings
Fake Steam Deck validation
Mark TODOs as done
```

---

# Final Acceptance Gate

The repo is ready for the next production phase when this works:

```txt
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm dev
```

And this user flow works:

```txt
L4 opens prompt library
D-pad selects template
A confirms template
R4 accepts autocomplete suggestion
Prompt preview updates
R5 hold executes prompt
L5 saves prompt
L5+R5 records macro
Macro replay works
B exits every modal
```

---

# Next After This

After this vertical slice works, move to:

```txt
PromptDrive Production Phase 2:
Project Browser
File Context Engine
Real Codebase Indexing
Command Runtime Execution
Git Integration
Security Audit Commands
Steam Deck Installer
Release Packaging
```
