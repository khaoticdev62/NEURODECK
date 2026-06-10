# NEURODECK PromptDrive — AI Coding Agent Implementation Prompt

## Role

You are a senior Electron, React, TypeScript, Steam Deck controller UX, and systems engineer. You are implementing NEURODECK PromptDrive as a real production-grade controller-native AI prompting and coding subsystem.

You are not writing a concept. You are not making a mockup. You are not creating placeholder code. You are applying a real implementation against the existing repo scaffold.

## Mission

Turn the current NEURODECK PromptDrive scaffold into a runnable vertical slice:

```text
Prompt Composer
→ Prompt Template Selection
→ Slot Fill
→ Autocomplete
→ Prompt Preview
→ Execute Prompt
→ Save Prompt as Macro
→ Persist Data
→ Controller Navigation
```

The result must build, lint, test, and run.

## Non-Negotiable Rules

1. Do not replace the project with a new architecture.
2. Do not remove existing packages unless they are broken beyond repair and you document why.
3. Do not create fake runtime behavior.
4. Do not use placeholder implementations that pretend to work.
5. Do not hardcode everything into one component.
6. Do not bypass Electron security boundaries.
7. Do not let the renderer access filesystem, SQLite, or shell commands directly.
8. Do not break Steam Deck 1280×800 layout assumptions.
9. Do not introduce Docker or WSL requirements.
10. Do not invent nonexistent APIs without adding their implementation.

## Required Tech Stack

Use the repo stack:

```text
Electron
React
TypeScript
Tailwind CSS
SQLite
pnpm workspaces
```

## Required First Commands

Run these first and record failures:

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm --filter desktop dev
```

If any command fails, fix the first real blocker before adding new features.

## Implementation Priority

### Phase 1 — Make the Repo Build

Fix:

```text
package exports
TypeScript path aliases
missing dependencies
broken imports
bad tsconfig references
Electron/Vite boot errors
Tailwind config errors
SQLite initialization errors
```

Definition of done:

```bash
pnpm build
```

must pass.

---

### Phase 2 — Wire Electron Security Correctly

Implement secure process separation:

```text
Renderer → Preload → IPC → Main Process → Storage/Runtime
```

Renderer must only use:

```ts
window.neurodeck.prompts
window.neurodeck.commands
window.neurodeck.macros
window.neurodeck.controller
window.neurodeck.agents
```

Main process owns:

```text
SQLite
filesystem
prompt pack loading
macro persistence
command execution
agent execution
```

Electron BrowserWindow must enforce:

```ts
contextIsolation: true
nodeIntegration: false
sandbox: true
```

---

### Phase 3 — Implement SQLite Storage

Create working migrations for:

```text
prompts
prompt_slots
prompt_usage
commands
macros
macro_steps
controller_profiles
agents
sessions
settings
```

Implement repositories:

```text
PromptRepository
MacroRepository
AgentRepository
ControllerProfileRepository
CommandRepository
```

No in-memory-only persistence unless clearly marked as a temporary fallback for test mode.

---

### Phase 4 — Implement PromptDrive Core

Required files:

```text
packages/promptdrive-core/src/prompt-parser.ts
packages/promptdrive-core/src/slot-resolver.ts
packages/promptdrive-core/src/prompt-validator.ts
packages/promptdrive-core/src/prompt-preview.ts
packages/promptdrive-core/src/prompt-pack-loader.ts
packages/promptdrive-core/src/prompt-pack-validator.ts
```

Required behavior:

```text
load prompt templates
parse slot variables like {language}
validate required slots
fill slots
generate final prompt preview
return useful validation errors
```

Example template:

```text
Refactor {target} using {language}. Preserve behavior. Constraints: {constraints}. Output: {output_format}.
```

Must render correctly after slot fill.

---

### Phase 5 — Implement Autocomplete Engine

Required files:

```text
packages/autocomplete-engine/src/trie.ts
packages/autocomplete-engine/src/fuzzy.ts
packages/autocomplete-engine/src/ranker.ts
packages/autocomplete-engine/src/autocomplete-engine.ts
```

Autocomplete must support:

```text
prompt templates
commands
macros
agents
slot values
recent actions
```

Ranking formula:

```text
score =
  prefixMatch * 35
+ fuzzyMatch * 20
+ contextMatch * 20
+ recentUsage * 10
+ pinnedItem * 10
+ personaMatch * 5
```

Acceptance:

```text
D-pad navigates suggestions
R4 accepts selected suggestion
Suggestions update under 50ms for seeded packs
```

---

### Phase 6 — Implement Controller Runtime

Required files:

```text
packages/controller-runtime/src/action-registry.ts
packages/controller-runtime/src/default-actions.ts
packages/controller-runtime/src/controller-profile.ts
packages/controller-runtime/src/input-dispatcher.ts
packages/controller-runtime/src/chord-detector.ts
packages/controller-runtime/src/hold-detector.ts
packages/controller-runtime/src/profiles/steamdeck.default.ts
```

Default Steam Deck bindings:

```text
L4.tap      OPEN_PROMPT_LIBRARY
L4.hold     OPEN_AGENT_WHEEL
L5.tap      SAVE_PROMPT
L5.hold     OPEN_SNIPPET_VAULT
R4.tap      ACCEPT_SUGGESTION
R4.hold     REGENERATE
R5.tap      OPEN_COMMAND_PALETTE
R5.hold     EXECUTE_PROMPT
L4+R4       COMPLETE_PROMPT
L5+R5       START_MACRO_RECORDING
A           ACCEPT
B           BACK
X           EDIT_SELECTED_BLOCK
Y           OPEN_CONTEXT_MENU
L1/R1       SWITCH_PANEL
L2/R2       CYCLE_CATEGORY
D-pad       NAVIGATION
```

Every action must have:

```text
controller binding
keyboard fallback
description
risk level where applicable
```

---

### Phase 7 — Implement Prompt Composer UI

Required screen:

```text
apps/desktop/src/renderer/screens/PromptComposerScreen.tsx
```

Required components:

```text
PromptBlockCard
PromptSlotPicker
PromptPreviewPanel
SuggestionList
DeckButtonHint
DeckFocusRing
```

Required UX:

```text
L4 opens prompt library
D-pad moves focus
A selects item
X edits selected slot
R4 accepts autocomplete
R5 hold executes prompt
B exits modal or backs out safely
```

Must fit 1280×800 cleanly.

---

### Phase 8 — Implement Macro Save Flow

Required files:

```text
packages/macro-engine/src/macro-recorder.ts
packages/macro-engine/src/macro-player.ts
packages/macro-engine/src/macro-validator.ts
```

Required behavior:

```text
record action sequence
persist macro
save prompt execution as macro
replay macro deterministically
pause on failure
require confirmation for risky steps
```

Vertical slice requires at minimum:

```text
Save final filled prompt as a macro
Show macro in macro list
Replay macro to rebuild prompt
```

---

### Phase 9 — Implement Agent Runtime Stub Properly

This can be minimal, but not fake.

Required built-in agents:

```text
Architect
Developer
Refactor
Testing
Security
UX
Documentation
Release
Steam Deck QA
```

Each agent must have:

```text
id
name
role
system prompt
capabilities
```

Agent execution can initially return structured local output if no provider is configured, but it must clearly pass through the agent runtime pipeline.

---

### Phase 10 — Testing

Add tests for:

```text
prompt parser
slot resolver
prompt validator
prompt preview
autocomplete ranker
controller action registry
hold detection
chord detection
macro recorder
macro player
SQLite repositories
IPC handlers
```

Required commands:

```bash
pnpm build
pnpm lint
pnpm test
```

All must pass before calling the work complete.

## Required Vertical Slice Acceptance Test

A tester must be able to:

1. Launch NEURODECK desktop app.
2. Open Prompt Composer.
3. Select “Production Safe Refactor.”
4. Fill required slots.
5. Use autocomplete to choose language/output format.
6. Preview final prompt.
7. Execute prompt through selected agent.
8. Save final prompt as macro.
9. Reopen macro and replay it.
10. Navigate the whole flow using controller mappings or keyboard fallback.

## Steam Deck QA Requirements

Validate:

```text
1280×800 handheld layout
no horizontal overflow
large enough text
visible focus states
B always backs out
R4 accepts autocomplete
R5 executes only with safe confirmation
L5 saves prompt/macro
L5+R5 starts macro recording
suspend/resume does not corrupt state
```

## Output Required From Coding Agent

When finished, provide:

```text
1. Summary of changed files
2. Commands run
3. Test results
4. Known limitations
5. Any remaining blockers
6. Screens or logs proving vertical slice runs
7. Exact next tickets
```

## Quality Bar

This should feel like the first working piece of a controller-native AI coding cockpit — not a web form with buttons taped to it.

If a feature cannot be completed, leave the repo in a better state, document the exact blocker, and do not pretend it works.
