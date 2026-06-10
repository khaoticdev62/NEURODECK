# NEURODECK PromptDrive — Production Hardening Checklist + First Vertical Slice Implementation Guide

## Purpose

This guide converts the current PromptDrive scaffold into a runnable production-quality vertical slice. It focuses on the first complete end-to-end workflow:

> Controller input → Prompt Composer → Autocomplete → Prompt Preview → Execute Prompt → Save Macro → Persist Data

This is the first serious proof that PromptDrive is not a menu mockup. It is the system spine.

---

## 1. Immediate Repo Hardening

### 1.1 Validate Install

Run from the repo root:

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter desktop dev
```

Expected result:

- Workspace installs without missing package errors.
- TypeScript project references resolve.
- Electron main process boots.
- React renderer loads.
- Tailwind styles apply.
- No blank white screen.

### 1.2 Lock the Toolchain

Add or confirm:

```text
.nvmrc
.node-version
pnpm-lock.yaml
packageManager field in package.json
```

Recommended:

```json
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### 1.3 Add Core Scripts

Root `package.json` should include:

```json
{
  "scripts": {
    "dev": "pnpm --filter desktop dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "qa:deck": "pnpm test && pnpm typecheck && pnpm build"
  }
}
```

---

## 2. First Vertical Slice Definition

The first vertical slice must prove this exact flow:

```text
R5 opens Command Palette
L4 opens Prompt Library
D-pad selects Production Safe Refactor
A confirms template
R4 accepts autocomplete suggestion
Preview updates live
R5 hold executes prompt
L5 saves prompt
L5 + R5 records macro
Macro persists to SQLite
```

This slice touches every critical subsystem:

- Controller runtime
- PromptDrive core
- Autocomplete engine
- Renderer state
- IPC bridge
- Storage layer
- Macro engine

If this works, the app has a real spine.

---

## 3. Required Implementation Order

### Step 1 — Fix Type Exports

Files:

```text
packages/shared-types/src/index.ts
packages/shared-types/src/controller.ts
packages/shared-types/src/prompts.ts
packages/shared-types/src/commands.ts
packages/shared-types/src/macros.ts
packages/shared-types/src/agents.ts
```

`index.ts` must export everything:

```ts
export * from "./controller";
export * from "./prompts";
export * from "./commands";
export * from "./macros";
export * from "./agents";
```

Acceptance:

```bash
pnpm --filter @neurodeck/shared-types build
```

passes without errors.

---

### Step 2 — Implement Controller Action Dispatcher

Files:

```text
packages/controller-runtime/src/action-registry.ts
packages/controller-runtime/src/input-dispatcher.ts
packages/controller-runtime/src/chord-detector.ts
packages/controller-runtime/src/profiles/steamdeck.default.ts
```

Required actions:

```ts
export const ACTIONS = {
  OPEN_PROMPT_LIBRARY: "OPEN_PROMPT_LIBRARY",
  OPEN_COMMAND_PALETTE: "OPEN_COMMAND_PALETTE",
  ACCEPT_SUGGESTION: "ACCEPT_SUGGESTION",
  EXECUTE_PROMPT: "EXECUTE_PROMPT",
  SAVE_PROMPT: "SAVE_PROMPT",
  START_MACRO_RECORDING: "START_MACRO_RECORDING",
  STOP_MACRO_RECORDING: "STOP_MACRO_RECORDING",
  COMPLETE_PROMPT: "COMPLETE_PROMPT",
  OPEN_AGENT_WHEEL: "OPEN_AGENT_WHEEL",
  BACK: "BACK",
  CANCEL: "CANCEL"
} as const;
```

Default bindings:

```ts
export const steamDeckDefaultBindings = {
  "L4.tap": "OPEN_PROMPT_LIBRARY",
  "L4.hold": "OPEN_AGENT_WHEEL",
  "L5.tap": "SAVE_PROMPT",
  "L5+R5": "START_MACRO_RECORDING",
  "R4.tap": "ACCEPT_SUGGESTION",
  "R4.hold": "REGENERATE",
  "R5.tap": "OPEN_COMMAND_PALETTE",
  "R5.hold": "EXECUTE_PROMPT",
  "L4+R4": "COMPLETE_PROMPT",
  "B.tap": "BACK"
};
```

Acceptance:

- Tap works.
- Hold works.
- Chord works.
- B always resolves to BACK.
- Unknown input safely no-ops.

---

### Step 3 — Implement Prompt Pack Loader

Files:

```text
packages/promptdrive-core/src/prompt-pack-loader.ts
packages/promptdrive-core/src/prompt-pack-validator.ts
packages/promptdrive-core/src/prompt-preview.ts
packages/promptdrive-core/src/slot-resolver.ts
```

Prompt preview example:

```ts
export function renderPromptPreview(template: string, slots: Record<string, string>) {
  return template.replace(/\{(.*?)\}/g, (_, key) => slots[key] ?? `{${key}}`);
}
```

Acceptance:

- Loads `prompt-packs/coding.production`.
- Validates manifest.
- Loads templates.
- Replaces slots correctly.
- Missing required slots are flagged.

---

### Step 4 — Implement Autocomplete Engine

Files:

```text
packages/autocomplete-engine/src/autocomplete-engine.ts
packages/autocomplete-engine/src/trie.ts
packages/autocomplete-engine/src/fuzzy.ts
packages/autocomplete-engine/src/ranker.ts
```

Minimum production behavior:

```text
Input: "ref"
Output:
1. Production Safe Refactor
2. Refactor Current File
3. Refactor for Steam Deck
```

Acceptance:

- Query returns suggestions under 50ms.
- Empty query returns pinned/recent items.
- R4 accepts the highlighted suggestion.

---

### Step 5 — Implement SQLite Runtime

Files:

```text
packages/storage/src/db.ts
packages/storage/src/migrations.ts
packages/storage/src/repositories/prompt.repository.ts
packages/storage/src/repositories/macro.repository.ts
packages/storage/src/repositories/controller.repository.ts
```

Required behavior:

- Create DB on first launch.
- Run migrations once.
- Seed default controller profile.
- Seed default prompt packs.
- Persist macros.

Acceptance:

```text
App restart keeps saved macros and bindings.
```

---

### Step 6 — Wire Secure Electron IPC

Files:

```text
apps/desktop/src/main/ipc/prompts.ipc.ts
apps/desktop/src/main/ipc/macros.ipc.ts
apps/desktop/src/main/ipc/controller.ipc.ts
apps/desktop/src/preload/index.ts
apps/desktop/src/preload/neurodeck-api.ts
```

Renderer must only call:

```ts
window.neurodeck.prompts.list();
window.neurodeck.prompts.preview(templateId, slots);
window.neurodeck.prompts.execute(templateId, slots);
window.neurodeck.macros.startRecording();
window.neurodeck.macros.stopRecording();
window.neurodeck.controller.dispatch(action);
```

Acceptance:

- Renderer has no direct filesystem access.
- Renderer has no direct database access.
- All privileged work runs in main process.

---

### Step 7 — Build Prompt Composer Vertical Slice UI

Files:

```text
apps/desktop/src/renderer/screens/PromptComposerScreen.tsx
apps/desktop/src/renderer/components/PromptBlockCard.tsx
apps/desktop/src/renderer/components/PromptSlotPicker.tsx
apps/desktop/src/renderer/components/PromptPreviewPanel.tsx
apps/desktop/src/renderer/components/SuggestionList.tsx
apps/desktop/src/renderer/stores/promptdrive.store.ts
apps/desktop/src/renderer/stores/controller.store.ts
```

Required visible layout:

```text
┌──────────────────────────────────────────────┐
│ PromptDrive | Agent | Model | Controller     │
├───────────────┬──────────────────────────────┤
│ Prompt Library│ Prompt Preview               │
│ Templates     │ Rendered final prompt         │
├───────────────┴──────────────────────────────┤
│ Suggestions / Slot Editor                    │
└──────────────────────────────────────────────┘
```

Acceptance:

- L4 opens library panel.
- D-pad moves focus.
- A selects prompt.
- R4 accepts suggestion.
- Preview updates.
- R5 hold executes.

---

## 4. Hardening Checklist

### Controller UX

- [ ] No required mouse usage.
- [ ] No required keyboard usage.
- [ ] B exits every modal.
- [ ] Hold B cancels active operation.
- [ ] L4/L5/R4/R5 show visible hints.
- [ ] Chord inputs never accidentally trigger destructive actions.
- [ ] Focus never disappears.
- [ ] Every focus node has back path.

### Prompt System

- [ ] Prompt packs validate before loading.
- [ ] Corrupt prompt pack is disabled safely.
- [ ] Missing slots are clearly marked.
- [ ] Prompt preview never executes automatically.
- [ ] Destructive prompts require hold-confirm.

### Storage

- [ ] Migrations are idempotent.
- [ ] DB path is user-writable on Steam Deck.
- [ ] Failed write shows recoverable error.
- [ ] User data persists after restart.

### Electron Security

- [ ] `contextIsolation` enabled.
- [ ] `nodeIntegration` disabled in renderer.
- [ ] Preload exposes narrow API only.
- [ ] IPC validates payloads.
- [ ] No arbitrary command execution from renderer.
- [ ] No remote code loading.

### Steam Deck UX

- [ ] 1280×800 layout passes.
- [ ] Text readable at handheld distance.
- [ ] UI works docked at 1920×1080.
- [ ] Suspend/resume does not corrupt state.
- [ ] Controller reconnect does not break focus.

---

## 5. First Vertical Slice QA Script

Run this manually on desktop first, then Steam Deck:

```text
1. Launch app.
2. Confirm Prompt Composer is visible.
3. Press R5.
4. Confirm Command Palette opens.
5. Press B.
6. Confirm Command Palette closes.
7. Press L4.
8. Confirm Prompt Library opens.
9. D-pad to Production Safe Refactor.
10. Press A.
11. Confirm prompt loads.
12. Select language slot.
13. Press R4.
14. Confirm autocomplete inserts highlighted suggestion.
15. Confirm preview updates.
16. Hold R5.
17. Confirm execution confirmation appears.
18. Confirm execution.
19. Press L5.
20. Confirm prompt saves.
21. Press L5 + R5.
22. Confirm macro recording starts.
23. Perform one prompt selection action.
24. Press L5 + R5 again.
25. Confirm macro saves.
26. Restart app.
27. Confirm saved prompt and macro still exist.
```

---

## 6. Production Exit Criteria For This Slice

This vertical slice is complete when:

```text
Controller input triggers registered actions.
Prompt packs load from disk.
Prompt templates render previews.
Autocomplete inserts slot values.
Prompt execution routes through IPC.
Macros record and persist.
SQLite survives restart.
Steam Deck layout works at 1280×800.
No privileged APIs are exposed to renderer.
```

---

## 7. Next Document After This

After this slice is implemented, the next document should be:

**PromptDrive Vertical Slice II — Controller Mapper + Macro Replay Full Implementation**

That should cover:

- Visual controller mapper
- Live input detection
- Binding conflict resolution
- Profile import/export
- Macro replay debugger
- Failed macro recovery
- Steam Deck specific QA gates
