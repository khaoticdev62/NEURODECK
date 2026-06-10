# NEURODECK PromptDrive — Vertical Slice Build Pack
## Production Implementation Handoff

This pack converts the scaffold into the first complete working loop:

**Controller Input → Prompt Template → Slot Fill → Autocomplete → Preview → Execute → Save Macro → Persist State**

No MVP shortcuts. This is the first production-grade vertical slice.

---

## 1. Vertical Slice Goal

The first complete slice must prove that PromptDrive is real:

1. App boots in Electron.
2. React renderer loads at 1280×800.
3. Controller actions dispatch through the action registry.
4. Prompt Library opens with L4 or keyboard fallback.
5. User selects a production prompt template.
6. Prompt slots are filled through controller-friendly UI.
7. Autocomplete suggests slot values and commands.
8. Final prompt preview renders correctly.
9. R5 hold executes prompt through secure IPC.
10. Prompt can be saved as a macro with L5 + R5.
11. SQLite persists prompt usage, macro, and controller profile.

---

## 2. Implementation Order

### Step 1 — Make the repo boot

Run:

```bash
pnpm install
pnpm build
pnpm dev
```

Fix before moving on:

- Missing package exports
- Bad tsconfig references
- Electron preload path issues
- Tailwind config problems
- Broken workspace names
- Renderer import aliases

Exit criteria:

```text
Electron main starts
Preload loads
Renderer loads
No blank window
No console fatal errors
```

---

## 3. Required Package Build Order

Build packages in this order:

```text
1. shared-types
2. storage
3. controller-runtime
4. promptdrive-core
5. autocomplete-engine
6. command-runtime
7. macro-engine
8. agent-runtime
9. desktop app
```

Never wire UI before the core packages compile. That is how spaghetti gets born.

---

## 4. Shared Types Completion

File:

```text
packages/shared-types/src/index.ts
```

Must export:

```ts
export * from './controller';
export * from './prompts';
export * from './commands';
export * from './macros';
export * from './agents';
export * from './suggestions';
export * from './ipc';
```

Add:

```ts
export type RiskLevel = 'safe' | 'medium' | 'destructive';

export type ExecutionStatus =
  | 'idle'
  | 'pending'
  | 'confirmation_required'
  | 'running'
  | 'success'
  | 'failed';
```

Exit criteria:

```text
All packages import shared types from @neurodeck/shared-types
No duplicate local type definitions
```

---

## 5. Controller Runtime Completion

Files:

```text
packages/controller-runtime/src/action-registry.ts
packages/controller-runtime/src/dispatcher.ts
packages/controller-runtime/src/chord-detector.ts
packages/controller-runtime/src/hold-detector.ts
packages/controller-runtime/src/profiles/steamdeck.default.ts
```

### Required Actions

```ts
export const REQUIRED_ACTIONS = [
  'NAV_UP',
  'NAV_DOWN',
  'NAV_LEFT',
  'NAV_RIGHT',
  'ACCEPT',
  'BACK',
  'CANCEL',
  'OPEN_PROMPT_LIBRARY',
  'OPEN_COMMAND_PALETTE',
  'OPEN_AGENT_WHEEL',
  'ACCEPT_SUGGESTION',
  'NEXT_SUGGESTION',
  'PREVIOUS_SUGGESTION',
  'EXECUTE_PROMPT',
  'SAVE_PROMPT',
  'COMPLETE_PROMPT',
  'START_MACRO_RECORDING',
  'STOP_MACRO_RECORDING',
  'NEW_SESSION'
] as const;
```

### Default Steam Deck Profile

```ts
export const steamDeckDefaultProfile = {
  id: 'steamdeck.default',
  name: 'Steam Deck Default',
  device: 'steamdeck',
  bindings: {
    'DPadUp.tap': 'NAV_UP',
    'DPadDown.tap': 'NAV_DOWN',
    'DPadLeft.tap': 'NAV_LEFT',
    'DPadRight.tap': 'NAV_RIGHT',
    'A.tap': 'ACCEPT',
    'B.tap': 'BACK',
    'B.hold': 'CANCEL',
    'X.tap': 'EDIT_SELECTED_BLOCK',
    'Y.tap': 'OPEN_CONTEXT_MENU',
    'L1.tap': 'PREVIOUS_PANEL',
    'R1.tap': 'NEXT_PANEL',
    'L2.tap': 'PREVIOUS_CATEGORY',
    'R2.tap': 'NEXT_CATEGORY',
    'L4.tap': 'OPEN_PROMPT_LIBRARY',
    'L4.hold': 'OPEN_AGENT_WHEEL',
    'L5.tap': 'SAVE_PROMPT',
    'L5.hold': 'OPEN_SNIPPET_VAULT',
    'R4.tap': 'ACCEPT_SUGGESTION',
    'R4.hold': 'REGENERATE',
    'R5.tap': 'OPEN_COMMAND_PALETTE',
    'R5.hold': 'EXECUTE_PROMPT',
    'L4+R4.chord': 'COMPLETE_PROMPT',
    'L5+R5.chord': 'START_MACRO_RECORDING'
  }
};
```

Exit criteria:

```text
Tap detection works
Hold detection works
Chord detection works
Every action has keyboard fallback
Controller profile persists to SQLite
```

---

## 6. PromptDrive Core Completion

Files:

```text
packages/promptdrive-core/src/prompt-parser.ts
packages/promptdrive-core/src/slot-resolver.ts
packages/promptdrive-core/src/prompt-validator.ts
packages/promptdrive-core/src/prompt-preview.ts
packages/promptdrive-core/src/prompt-pack-loader.ts
```

### Required Behavior

Given:

```text
Refactor {target} using {language}. Preserve behavior. Constraints: {constraints}.
```

And slots:

```json
{
  "target": "src/App.tsx",
  "language": "TypeScript",
  "constraints": "Steam Deck 1280x800 controller-first UI"
}
```

Output:

```text
Refactor src/App.tsx using TypeScript. Preserve behavior. Constraints: Steam Deck 1280x800 controller-first UI.
```

Exit criteria:

```text
Missing required slots block execution
Preview renders before execution
Prompt pack validation catches malformed packs
Prompt templates can be imported from prompt-packs/*
```

---

## 7. Autocomplete Engine Completion

Files:

```text
packages/autocomplete-engine/src/trie.ts
packages/autocomplete-engine/src/fuzzy.ts
packages/autocomplete-engine/src/ranker.ts
packages/autocomplete-engine/src/autocomplete-engine.ts
```

Required sources:

```text
Prompt templates
Prompt slots
Commands
Macros
Agents
Recent usage
Pinned items
Files
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

Exit criteria:

```text
Suggestions under 50ms for 1,000 items
D-pad can move through suggestions
R4 accepts selected suggestion
L2/R2 filters suggestion category
```

---

## 8. Secure IPC Completion

Files:

```text
apps/desktop/src/preload/index.ts
apps/desktop/src/preload/neurodeck-api.ts
apps/desktop/src/main/ipc/prompts.ipc.ts
apps/desktop/src/main/ipc/commands.ipc.ts
apps/desktop/src/main/ipc/macros.ipc.ts
apps/desktop/src/main/ipc/controller.ipc.ts
apps/desktop/src/main/ipc/agents.ipc.ts
```

Renderer can call only:

```ts
window.neurodeck.prompts.list()
window.neurodeck.prompts.preview(payload)
window.neurodeck.prompts.execute(payload)
window.neurodeck.macros.startRecording()
window.neurodeck.macros.stopRecording()
window.neurodeck.controller.getProfile()
window.neurodeck.controller.dispatchAction(action)
```

Security rules:

```text
No nodeIntegration in renderer
contextIsolation enabled
Renderer cannot access fs directly
Renderer cannot spawn child processes
All payloads validated in main process
All destructive commands require confirmation
```

Exit criteria:

```text
Renderer has no direct filesystem access
IPC payloads are typed
Invalid IPC payload returns safe error
Prompt execution works through main process
```

---

## 9. SQLite Completion

Files:

```text
packages/storage/src/db.ts
packages/storage/src/migrations.ts
packages/storage/src/repositories/*.ts
```

Required tables:

```text
prompts
prompt_slots
prompt_usage
commands
macros
macro_steps
agents
controller_profiles
sessions
settings
```

Exit criteria:

```text
Migrations run on app boot
Seed prompt packs import into DB
Controller profile loads from DB
Macro saves to DB
Prompt usage increments after execution
```

---

## 10. Renderer Vertical Slice

Files:

```text
apps/desktop/src/renderer/screens/PromptComposerScreen.tsx
apps/desktop/src/renderer/screens/PromptLibraryScreen.tsx
apps/desktop/src/renderer/screens/CommandPaletteScreen.tsx
apps/desktop/src/renderer/components/promptdrive/PromptBlockCard.tsx
apps/desktop/src/renderer/components/promptdrive/PromptSlotPicker.tsx
apps/desktop/src/renderer/components/promptdrive/PromptPreviewPanel.tsx
apps/desktop/src/renderer/components/promptdrive/SuggestionList.tsx
apps/desktop/src/renderer/stores/promptdrive.store.ts
apps/desktop/src/renderer/stores/controller.store.ts
```

### Required UI Loop

```text
L4 opens Prompt Library
A selects template
D-pad moves through slots
R4 accepts autocomplete suggestion
Prompt preview updates live
R5 hold executes prompt
L5 saves prompt
L5 + R5 records macro
```

Exit criteria:

```text
Whole loop works controller-only
Keyboard is optional
All focused elements show visible focus ring
B exits modal safely
No focus dead ends
```

---

## 11. First Production Prompt Pack

Folder:

```text
prompt-packs/coding.production/
```

Required templates:

```text
production-safe-refactor.json
fix-error-with-root-cause.json
generate-tests-production.json
security-audit-owasp.json
steamdeck-ui-audit.json
electron-hardening-review.json
repo-cleanup-plan.json
```

Each template must include:

```json
{
  "id": "string",
  "title": "string",
  "category": "string",
  "intent": "string",
  "role": "string",
  "template": "string",
  "slots": [],
  "risk": "safe | medium | destructive",
  "requiresConfirmation": true
}
```

---

## 12. Macro Vertical Slice

Required macro:

```json
{
  "id": "macro.full_component_audit",
  "title": "Full Component Audit",
  "steps": [
    { "order": 1, "actionId": "OPEN_PROMPT_LIBRARY" },
    { "order": 2, "actionId": "SELECT_TEMPLATE", "payload": { "templateId": "ui.steamdeck.audit" } },
    { "order": 3, "actionId": "ACCEPT_SUGGESTION" },
    { "order": 4, "actionId": "EXECUTE_PROMPT" }
  ],
  "binding": "L5+R5"
}
```

Exit criteria:

```text
Macro saves
Macro reloads after restart
Macro playback executes same steps
Macro failure identifies failed step
```

---

## 13. Test Commands

Add root scripts:

```json
{
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build",
    "dev": "pnpm --filter @neurodeck/desktop dev"
  }
}
```

Required test files:

```text
packages/promptdrive-core/src/*.test.ts
packages/autocomplete-engine/src/*.test.ts
packages/controller-runtime/src/*.test.ts
packages/macro-engine/src/*.test.ts
packages/storage/src/*.test.ts
```

---

## 14. Steam Deck QA Checklist

Test on device:

```text
1280x800 handheld
1280x720 fallback
1920x1080 docked
L4 opens Prompt Library
L5 saves prompt
R4 accepts suggestion
R5 opens Command Palette
R5 hold executes prompt
L4+R4 completes prompt
L5+R5 records macro
B backs out of every modal
Hold B cancels operation
Suspend/resume does not corrupt DB
Offline mode works
Prompt pack corruption is handled safely
```

---

## 15. Vertical Slice Definition of Done

The vertical slice is done when:

```text
pnpm install succeeds
pnpm build succeeds
pnpm dev launches Electron
Renderer loads without fatal errors
SQLite migrations run
Prompt packs seed
Controller profile loads
L4 opens Prompt Library
Prompt template can be selected
Slots can be filled
Autocomplete works
Preview renders
R5 executes prompt through IPC
Prompt usage persists
Macro can be recorded
Macro can be replayed
No required keyboard use
Steam Deck 1280x800 layout is clean
```

---

## 16. Next Pack After This

After this vertical slice is implemented, create:

**PromptDrive Production Expansion Pack I**

Covering:

```text
Real model provider integration
Ollama connector
OpenAI-compatible API connector
Local file/project scanner
Git command runtime
Patch/diff viewer
Safe write operations
Plugin/Lua bridge
Full controller mapper UI
Full diagnostics panel
```

