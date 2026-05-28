# DeckCode: Steam Deck Coding Controller Profile  
## Product Requirements Document (PRD) + Software Design Specification (SDS)

**Version:** 1.0  
**Profile Name:** DeckCode Predictive Coding Profile  
**Target Device:** Steam Deck LCD/OLED control surface  
**Primary Use Case:** Programming on Steam Deck without requiring an external keyboard for navigation, code review, quick edits, debugging, terminal work, Git workflows, and AI-assisted coding.

---

# 1. Executive Summary

DeckCode is a Steam Deck-specific controller profile and input runtime for programming. It converts the Steam Deck’s full control surface into a coding-first command system: right trackpad for precision pointer/caret control, left trackpad for dense command menus, rear grips for modifier layers, triggers for accept/execute flows, sticks for scrolling and caret navigation, gyro for fine cursor correction, touchscreen for direct UI, and mic for optional voice commands.

The base mapping is intentionally separate from a normal game profile. A game profile optimizes movement, camera, combat, inventory, and pause behavior. DeckCode optimizes editor control, symbol insertion, terminal flow, Git, tests, debugging, search, refactoring, and AI coding actions.

The key idea: **stop thinking “button = key.” Think “input source = semantic command stream.”** That keeps the profile portable across VS Code, JetBrains, Neovim, terminal IDEs, browser IDEs, and custom tools.

---

# 2. Source Basis

This specification extends the uploaded full-fidelity Steam Deck controller schema. The base document establishes that the correct abstraction is Steam Input native mode with action sets, action-set layers, activators, analog/motion paths, semantic actions, and auxiliary channels for touchscreen/mic/system controls. It also identifies that Steam/QAM/power/volume should remain system-reserved, while trackpads, sticks, triggers, face buttons, D-pad, grips, gyro, touchscreen, and mic should be represented as structured sources rather than raw one-off buttons.

The coding profile below keeps those foundations but replaces gameplay semantics with programming semantics.

---

# 3. Product Requirements Document

## 3.1 Problem Statement

Coding on Steam Deck is possible, but the default controller experience is clunky for real work. Text-heavy workflows still need a keyboard, while navigation-heavy workflows can be made much better with a purpose-built controller profile. The Steam Deck has enough inputs to become a compact coding console, but only if the mapping is layered, predictive, safe, and editor-aware.

Without a dedicated coding schema, users run into these problems:

- Too much reliance on the on-screen keyboard.
- Trackpads used only as basic mouse surfaces instead of command surfaces.
- Rear grips wasted instead of becoming Ctrl/Alt/Shift/Meta layers.
- No consistent command layout across editor, terminal, Git, and debug views.
- Dangerous commands like discard/push/delete can be triggered too easily.
- Predictive coding features are disconnected from the controller.
- Input modes fight each other when switching between mouse, keyboard, and controller-like behavior.

## 3.2 Product Vision

DeckCode turns Steam Deck into a coding handheld with a controller-native workflow:

- Navigate code quickly.
- Edit common structures without hunting for symbols.
- Use a command palette without touching the keyboard.
- Accept completions and quick fixes from triggers/buttons.
- Run tests, debug, commit, and search from trackpad menus.
- Use AI assistance as an explicit, review-first workflow.
- Keep destructive commands gated behind hold/chord/confirmation.
- Support multiple editors through adapter bindings.

## 3.3 Goals

| Goal | Description |
|---|---|
| Full control-surface utilization | Every Steam Deck input is mapped as a command, modifier, auxiliary channel, or system-reserved control. |
| Coding-first semantics | Inputs emit coding actions, not generic game actions. |
| Predictive coding support | Context-aware suggestions surface likely actions such as quick fix, accept completion, run test, explain error, or generate commit message. |
| Safety | Destructive commands require hold/chord/confirmation. |
| Editor portability | Schema supports VS Code, JetBrains, Neovim, terminal IDEs, and browser IDEs. |
| Accessibility | Provide no-gyro, no-trackpad, toggle-modifier, and simplified command menu modes. |
| Low cognitive load | The physical grammar stays stable across editor, terminal, Git, debug, and AI modes. |

## 3.4 Non-Goals

- Replacing a full keyboard for long-form typing marathons.
- Remapping Steam/QAM/power/volume into normal coding actions.
- Automatically applying AI code edits without preview.
- Running destructive Git or shell commands without user confirmation.
- Depending on one editor’s private APIs only.

## 3.5 Target Users

| Persona | Needs |
|---|---|
| Solo dev on Steam Deck | Quick edit, commit, run, debug, and test loops while away from desk. |
| TUI/terminal developer | Neovim/tmux/git workflow with minimal keyboard dependency. |
| Game developer | Fast project navigation, build/test/debug, log review, asset/script edits. |
| AI-assisted coder | Controlled AI suggestions with review-before-apply behavior. |
| Accessibility-focused coder | Reduced keyboard strain, remappable grips, toggle modifiers, no-gyro fallback. |

## 3.6 Supported Coding Environments

| Environment | Support Level | Adapter Strategy |
|---|---:|---|
| VS Code desktop/web | Tier 1 | Command palette commands, keyboard shortcut bridge, extension API optional. |
| GitHub Codespaces | Tier 1 | Browser-safe shortcut profile + command palette bridge. |
| Neovim/tmux | Tier 1 | Terminal key sequence adapter + command macros. |
| JetBrains IDEs | Tier 2 | Keymap adapter + action IDs where available. |
| Zed / Cursor / Windsurf-style editors | Tier 2 | VS Code-like command/shortcut compatibility profile. |
| Raw terminal | Tier 1 | Shell command macros + history/pane/navigation commands. |

## 3.7 Functional Requirements

### FR-001: Full Input Coverage

Every non-system Steam Deck input must be represented.

| Input | Coding Role |
|---|---|
| A/B/X/Y | Confirm, cancel, quick fix/completion, search/symbol picker. |
| D-pad | Caret navigation, selection extension, terminal history, command list navigation. |
| L1/R1 | Previous/next tab, pane, suggestion, or debugger step family. |
| L2/R2 | Selection layer and accept/execute layer using analog soft/full pulls. |
| Left stick | Viewport scroll/pan, document movement, panel navigation. |
| Right stick | Caret movement and focus recovery. |
| L3/R3 | Center viewport / focus editor / recenter cursor. |
| Stick touch | Gyro gates, precision-preview gates, mode hints. |
| Left trackpad | 16-slot command hub. |
| Right trackpad | Precision pointer/caret/mouse surface. |
| Trackpad clicks | Execute highlighted command / primary or secondary click. |
| L4/L5/R4/R5 | Ctrl, Alt/Symbol, Shift/Selection, Meta/AI layers. |
| View/Menu | Explorer/layout toggle and command palette/help overlay. |
| Gyro | Fine cursor adjustment, gated by touch. |
| Touchscreen | Direct UI override. |
| Mic | Optional voice command/PTT. |
| Steam/QAM/power/volume | System-reserved. |

### FR-002: Action Sets

DeckCode must support these action sets:

1. `global`
2. `editing`
3. `selection`
4. `symbol_entry`
5. `command_hub`
6. `terminal`
7. `git`
8. `debug`
9. `test`
10. `ai_assist`
11. `accessibility`

### FR-003: Modifier Layers

Rear grips become the backbone of the schema:

| Grip | Layer | Meaning |
|---|---|---|
| L4 | Ctrl Layer | Word nav, save, copy/paste, go-to actions. |
| L5 | Alt/Symbol Layer | Brackets, braces, quotes, pipes, arrows, snippets. |
| R4 | Shift/Selection Layer | Extend selection, multi-cursor, selection transforms. |
| R5 | Meta/AI Layer | AI actions, test actions, high-level workflow automation. |

### FR-004: Predictive Coding

The system must predict likely next actions based on context:

| Context | Predicted Actions |
|---|---|
| Cursor on diagnostic | Quick fix, explain error, AI fix, go to problem. |
| Completion menu visible | Accept, next, previous, show docs. |
| Terminal focused | Previous command, run predicted command, clear, interrupt. |
| Selection active | Refactor, explain, copy, extract function, generate tests. |
| Git dirty + tests green | Stage, commit message, commit review. |
| Failed test visible | Open failure, rerun test, AI fix test. |
| File tree focused | Open, rename, new file, delete with confirm. |
| Debug paused | Step over, step into, inspect, continue, stop. |

### FR-005: Safety Gates

Commands are categorized into three safety levels.

| Safety Class | Examples | Requirement |
|---|---|---|
| Safe | Accept completion, open file, go to definition, format selection. | Can execute on press. |
| Preview Required | AI patch, rename symbol, bulk replace, commit. | Must show diff/preview first. |
| Confirm Required | Push, discard changes, delete file, run side-effect shell command. | Hold/chord + explicit confirm. |

### FR-006: Editor Prompting

On-screen prompts must show semantic command names, not hard-coded button meanings.

Good: `R5 + X: Refactor Selection`  
Bad: `Press X to do magic stuff`

### FR-007: Accessibility

DeckCode must provide:

- Toggle modifier mode.
- Reduced chord mode.
- No-gyro mode.
- No-trackpad mode.
- Left-handed swapped profile.
- Larger command hub labels.
- Hold-time tuning.
- Haptic strength tuning.
- Prediction off switch.
- AI off switch.

---

# 4. Controller Mapping Schema

## 4.1 Base Global Layer

| Control | Action | Notes |
|---|---|---|
| Right trackpad axis | Precision pointer/caret movement | Main mouse/cursor surface. |
| Right trackpad click | Primary click / select | Hold for secondary click. |
| Right trackpad swipe up/down | Scroll viewport | Secondary scroll path. |
| Gyro | Micro pointer adjustment | Gated by right trackpad touch or right stick touch. |
| Left stick axis | Viewport pan/scroll | Useful for logs and long files. |
| Left stick click | Center viewport on cursor | Recovers position quickly. |
| Right stick axis | Analog caret movement | Fine code navigation without D-pad spam. |
| Right stick click | Focus editor | Escapes stuck panels. |
| A | Confirm / Enter | Context-sensitive. |
| B | Cancel / Escape | Context-sensitive. |
| X | Quick fix / Completion | Context-sensitive. |
| Y | Search / Symbol picker | Context-sensitive. |
| View | Toggle explorer | Hold = layout toggle. |
| Menu | Command palette | Hold = profile help overlay. |

## 4.2 D-Pad Editing Layer

| Control | Base | L4 Ctrl | R4 Selection | L5 Symbol |
|---|---|---|---|---|
| D-pad Left | Caret left | Word left | Extend left | Insert `<` |
| D-pad Right | Caret right | Word right | Extend right | Insert `>` |
| D-pad Up | Caret up | Document top | Extend up | Insert `|` |
| D-pad Down | Caret down | Document bottom | Extend down | Insert backtick |

## 4.3 Face Buttons

| Button | Base | Double | Hold | With L4 | With L5 | With R4 | With R5 |
|---|---|---|---|---|---|---|---|
| A | Confirm / Enter | Insert line below | Confirm hold action | Select all | Insert `()` | Commit selection | Accept AI |
| B | Cancel / Escape | Close popup | Undo | Redo | Insert `{}` | Clear selection | Reject AI |
| X | Quick fix | Rename symbol | Toggle breakpoint | Cut | Insert `[]` | Duplicate selection | AI refactor |
| Y | Search / symbols | Find in files | Show docs | Copy | Insert quotes | Find next occurrence | AI explain |

## 4.4 Shoulder and Trigger Layer

| Control | Action |
|---|---|
| LB | Previous tab / previous pane |
| RB | Next tab / next pane |
| LB hold | Previous recent file |
| RB hold | Next recent file |
| L2 soft pull | Soft selection layer |
| L2 full pull | Block selection / multi-cursor mode |
| R2 soft pull | Accept completion/suggestion |
| R2 full pull | Execute line / insert newline / run predicted safe command |

## 4.5 Rear Grip Layers

| Grip | Layer | Core Use |
|---|---|---|
| L4 | Ctrl Layer | Save, word nav, go-to-definition, select-all, copy/cut. |
| L5 | Alt/Symbol Layer | Brackets, braces, quotes, semicolon, comments, arrows. |
| R4 | Shift/Selection Layer | Selection extension, multi-cursor, expand/shrink selection. |
| R5 | Meta/AI Layer | AI, tests, generated fixes, commit summaries, code review. |

## 4.6 Left Trackpad Command Hub

The left trackpad is a 16-slot touch menu. Touch previews, click executes, hold pins open.

| Slot | Label | Command |
|---:|---|---|
| 0 | Files | Open file palette. |
| 1 | Symbols | Open symbol picker. |
| 2 | Search | Search workspace. |
| 3 | Terminal | Toggle terminal. |
| 4 | Run | Run current file/app. |
| 5 | Test | Run nearest/file tests. |
| 6 | Debug | Start/continue debug. |
| 7 | Git | Open source control. |
| 8 | Problems | Focus diagnostics. |
| 9 | Refactor | Open refactor menu. |
| 10 | Format | Format document/selection. |
| 11 | Snippets | Open snippet picker. |
| 12 | AI Explain | Explain selection/error. |
| 13 | AI Fix | Fix current error/test. |
| 14 | AI Generate | Generate from comment/prompt. |
| 15 | Settings | Open DeckCode settings. |

## 4.7 Terminal Mode

| Control | Terminal Action |
|---|---|
| D-pad Up/Down | Command history previous/next. |
| D-pad Left/Right | Cursor left/right. |
| A | Enter. |
| B | Escape. |
| X | Ctrl+C interrupt. |
| Y | Terminal search. |
| LB/RB | Previous/next terminal pane. |
| L2 full | Clear terminal. |
| R2 full | Run predicted command after confirmation if unsafe. |
| Left trackpad | Terminal macro radial menu. |

## 4.8 Git Mode

| Control | Git Action |
|---|---|
| Left pad Git slot | Open Git status. |
| L4 + A | Stage current file/selection. |
| L4 + X | Discard with confirmation. |
| L4 + Y | Copy diff. |
| R5 + Y | Generate commit message. |
| R5 + R2 full | Commit with review. |
| R5 + LB | Pull. |
| R5 + RB | Push with confirmation. |

## 4.9 Debug/Test Mode

| Control | Debug/Test Action |
|---|---|
| Left pad Debug slot | Start/continue debugger. |
| L4 + D-pad Right | Step over. |
| L4 + D-pad Down | Step into. |
| L4 + D-pad Up | Step out. |
| L4 + D-pad Left | Restart debug. |
| X hold | Toggle breakpoint. |
| B hold | Stop debugging. |
| R5 + LB | Run nearest test. |
| R5 + RB | Run current file tests. |

---

# 5. Predictive Coding Design

## 5.1 Prediction Inputs

The prediction engine consumes:

- Focused application.
- Active editor mode.
- Cursor location.
- Selection state.
- Language server completions.
- Diagnostics/errors.
- Git status.
- Terminal prompt state.
- Recent command history.
- Test/debug state.
- User frequency history.
- Safety class of command.

## 5.2 Ranking Formula

```text
score =
  context_match      * 0.35 +
  completion_signal  * 0.20 +
  recency            * 0.15 +
  user_frequency     * 0.10 +
  safety             * 0.15 +
  editor_confidence  * 0.05
```

## 5.3 Prediction Output

Predictions surface in four places:

1. Left trackpad command hub hints.
2. X quick-fix action.
3. R2 accept/execute action.
4. R5 AI/workflow layer.

## 5.4 Prediction Rules

```yaml
rules:
  - id: diagnostic_quick_fix
    when: diagnostics.visible && cursor.on_error
    suggest: [quick_fix, ai_fix_error, explain_error]
    primary_binding: X

  - id: completion_accept
    when: completion_menu.visible
    suggest: [accept_completion, next_completion, show_docs]
    primary_binding: R2.soft

  - id: terminal_history
    when: terminal.focused && prompt.ready
    suggest: [history_match, run_predicted_command]
    primary_binding: R2.full

  - id: selection_refactor
    when: selection.exists && R5.held
    suggest: [refactor_selection, explain_selection, extract_function]
    primary_binding: R5+X

  - id: git_commit_ready
    when: git.dirty && tests.green
    suggest: [stage_all, generate_commit_message, commit_with_review]
    primary_binding: R5+Y

  - id: failed_test
    when: test.failed
    suggest: [open_failure, rerun_test, ai_fix_test]
    primary_binding: left_pad.test
```

## 5.5 Safety Behavior

Prediction is allowed to suggest dangerous actions, but not execute them.

| Command Type | Prediction Behavior |
|---|---|
| Safe | Can execute directly. |
| Preview required | Opens preview/diff first. |
| Confirm required | Requires hold/chord and final confirm. |
| Unsafe terminal command | Requires visible command preview and A confirm. |

---

# 6. Software Design Specification

## 6.1 Architecture Overview

```text
Physical Input
  -> Event Normalizer
  -> Activator Engine
  -> Layer/Set Resolver
  -> Context Detector
  -> Prediction Engine
  -> Conflict Resolver
  -> Command Dispatcher
  -> Editor/Terminal/Git Adapter
  -> Haptics + Prompt Renderer
```

## 6.2 Core Components

### 6.2.1 Input Source Manager

Responsibilities:

- Poll Steam Deck inputs.
- Normalize axis values.
- Track button states.
- Track touch states.
- Track gyro deltas.
- Reserve Steam/QAM/power/volume.
- Emit timestamped `InputEvent` objects.

### 6.2.2 Activator Engine

Supports:

- Press.
- Release.
- Hold.
- Double press.
- Chord.
- Repeat.
- Soft trigger.
- Full trigger.
- Swipe.
- Touch menu selection.

### 6.2.3 Action Set Resolver

Determines active set:

```text
if terminal focused -> terminal
else if debugger paused -> debug
else if git panel focused -> git
else if command hub open -> command_hub
else -> editing
```

### 6.2.4 Layer Resolver

Layer priority:

1. System reserved.
2. Active modal action set.
3. Held rear-grip layer.
4. Explicit chord.
5. Activator specificity.
6. Prediction override.
7. Base mapping.

### 6.2.5 Context Detector

Collects:

- Focused window/app.
- Current editor panel.
- Cursor scope.
- LSP state.
- Diagnostics.
- Git state.
- Terminal prompt state.
- Test/debug status.

Implementation adapters may use editor extensions, CLI watchers, keyboard shortcut state, or local IPC.

### 6.2.6 Prediction Engine

Responsibilities:

- Score likely actions.
- Surface safe primary action.
- Gate unsafe predictions.
- Learn user frequency locally.
- Never transmit code unless an AI adapter is explicitly enabled.

### 6.2.7 Command Dispatcher

Dispatch methods:

- Native editor command.
- Keyboard shortcut.
- Terminal command.
- Shell script.
- IPC message.
- Extension API call.
- Clipboard operation.
- Steam on-screen keyboard request.

### 6.2.8 Adapter Layer

| Adapter | Dispatch Strategy |
|---|---|
| VS Code | Command IDs, keybindings, optional extension host. |
| Neovim | Key sequences, Lua RPC, tmux integration. |
| JetBrains | Keymap actions, IDE scripting where available. |
| Browser IDE | Browser-safe shortcuts and command palette macros. |
| Terminal | Shell macros and TTY-safe control sequences. |
| Git | CLI wrapper with preview and confirmation. |

### 6.2.9 Haptics + Prompt Renderer

Haptics:

- Light tick for menu slot hover.
- Strong tick for command execute.
- Double tick for unsafe preview.
- Buzz pulse for blocked action.
- Soft pulse for prediction update.

Prompts:

- Show action name.
- Show layer name.
- Show safety state.
- Show active editor context.
- Show fallback shortcut.

## 6.3 Data Models

### InputEvent

```ts
type InputEvent = {
  source: string;
  event: "press" | "release" | "hold" | "double" | "axis" | "touch" | "swipe";
  value?: number | { x: number; y: number };
  timestampMs: number;
  activeSet: string;
  activeLayers: string[];
};
```

### CodingAction

```ts
type CodingAction = {
  id: string;
  label: string;
  category:
    | "navigation"
    | "editing"
    | "symbol"
    | "terminal"
    | "git"
    | "debug"
    | "test"
    | "ai"
    | "system";
  safety: "safe" | "preview_required" | "confirm_required";
  dispatch: DispatchTarget[];
};
```

### Prediction

```ts
type Prediction = {
  actionId: string;
  confidence: number;
  reason: string;
  safety: "safe" | "preview_required" | "confirm_required";
  preferredBinding: string;
};
```

### Binding

```ts
type Binding = {
  source: string;
  event: string;
  guard?: string;
  emit: string;
  mode?: string;
  processors?: string[];
  safetyOverride?: "safe" | "preview_required" | "confirm_required";
};
```

## 6.4 Conflict Resolution Algorithm

```pseudo
function resolve(inputEvent, context):
  if inputEvent.source in system_reserved:
    return pass_to_system

  candidates = findBindings(inputEvent.source, inputEvent.event)

  candidates = filterByActiveSet(candidates, context.activeSet)
  candidates = filterByLayer(candidates, context.activeLayers)

  if candidates.empty:
    return no_op

  sort candidates by:
    1. active action set match
    2. held modifier layer match
    3. explicit chord match
    4. activator specificity
    5. safety gate validity
    6. prediction confidence
    7. base binding weight

  winner = candidates[0]

  if winner.command.safety == confirm_required:
    return open_confirm_prompt(winner)

  if winner.command.safety == preview_required:
    return open_preview(winner)

  return dispatch(winner)
```

## 6.5 Predictive Action Algorithm

```pseudo
function predict(context):
  actions = commandRegistry.availableFor(context.activeSet)

  for action in actions:
    action.score =
      contextMatch(action, context) * 0.35 +
      completionSignal(action, context) * 0.20 +
      recency(action) * 0.15 +
      userFrequency(action) * 0.10 +
      safetyScore(action) * 0.15 +
      adapterConfidence(action, context.editor) * 0.05

  ranked = sortDescending(actions, by=score)

  return ranked.take(5)
```

## 6.6 Trigger Processing

```pseudo
softPull = trigger.value >= 0.25
fullPull = trigger.value >= 0.85

if R2.softPull && completion.visible:
  emit completion.accept

if R2.fullPull && terminal.focused:
  emit terminal.run_predicted_command_or_prompt

if L2.softPull:
  activate selection_soft

if L2.fullPull:
  activate block_selection
```

## 6.7 Trackpad Processing

Right trackpad:

```pseudo
if rightTrackpad.touch:
  pointer.move(delta)
  gyro.enabled = true

if rightTrackpad.click.press:
  pointer.primary_click()

if rightTrackpad.click.hold > 350ms:
  pointer.secondary_click()
```

Left trackpad:

```pseudo
if leftTrackpad.touch:
  commandHub.preview(slotAtPosition)

if leftTrackpad.click.press:
  commandHub.executeHighlighted()

if leftTrackpad.click.hold > 500ms:
  commandHub.pinOpen()
```

## 6.8 Security and Privacy

Requirements:

- No source code leaves the device unless AI integration is explicitly enabled.
- AI requests must show what code/context will be sent.
- Shell commands generated by AI must never run automatically.
- Git push/discard/delete always require confirmation.
- Store user frequency history locally.
- Allow telemetry to be disabled.
- Redact secrets from AI/context payloads.
- Block commands containing obvious credential patterns unless user confirms.

## 6.9 Performance Requirements

| Requirement | Target |
|---|---:|
| Input event processing | < 4 ms |
| Prediction refresh | < 50 ms |
| Command dispatch | < 16 ms for local shortcuts |
| Menu hover haptic | < 25 ms |
| Context refresh | < 250 ms |
| Cold profile load | < 1 s |

## 6.10 Error Handling

| Error | Behavior |
|---|---|
| Editor adapter unavailable | Fall back to keyboard shortcut profile. |
| Context unknown | Use safe global/editing mappings only. |
| Prediction uncertain | Do not override base action. |
| Modifier stuck | Auto-release on timeout, suspend, or focus loss. |
| Gyro drift | Rebaseline on touch release or wake. |
| Unsafe command predicted | Show preview and require confirmation. |

## 6.11 Testing Plan

### Unit Tests

- Binding resolution.
- Activator timing.
- Chord precedence.
- Safety gate routing.
- Prediction scoring.
- Trigger threshold handling.
- Touch menu slot selection.
- Gyro gate activation.

### Integration Tests

- VS Code command dispatch.
- Neovim/tmux command dispatch.
- Terminal macros.
- Git preview/confirm workflow.
- Debug/test commands.
- AI preview workflow.
- Steam on-screen keyboard fallback.

### Acceptance Tests

| Test | Pass Criteria |
|---|---|
| Full input coverage | Every non-system Deck input mapped. |
| Command hub | All 16 slots preview and execute correctly. |
| Selection flow | R4 + D-pad extends selection without moving base caret. |
| Symbol entry | L5 inserts paired syntax reliably. |
| Quick fix | X opens quick fix on diagnostics. |
| Completion | R2 soft accepts visible completion. |
| Terminal | X sends interrupt, R2 full runs confirmed command. |
| Git safety | Push/discard/delete require confirmation. |
| AI safety | AI patch opens preview before apply. |
| Accessibility | Toggle-modifier mode works without holding grips. |

---

# 7. Implementation Roadmap

## Phase 1: Core Profile

- Build JSON schema.
- Implement base editing mappings.
- Implement left trackpad command hub.
- Implement grip modifier layers.
- Build basic VS Code and terminal adapters.
- Add safety gates.

## Phase 2: Prediction

- Add context detector.
- Add diagnostics/completion detection.
- Add prediction scoring.
- Add prediction prompt UI.
- Add local frequency history.

## Phase 3: Workflow Adapters

- Git adapter.
- Test runner adapter.
- Debug adapter.
- Neovim/tmux adapter.
- JetBrains adapter.

## Phase 4: AI Assist

- Add explicit AI context preview.
- Add explain/fix/refactor/generate actions.
- Add secret redaction.
- Add patch preview and apply flow.

## Phase 5: Polish + Accessibility

- Add no-gyro profile.
- Add no-trackpad profile.
- Add left-handed profile.
- Add haptic customization.
- Add onboarding overlay.
- Add validation suite.

---

# 8. Definition of Done

DeckCode is complete when:

- Every Steam Deck input is mapped or intentionally system-reserved.
- Coding workflows work across editor, terminal, Git, test, debug, and AI flows.
- Prediction improves speed without hijacking control.
- Destructive actions cannot fire accidentally.
- User can remap or disable every non-system action.
- Accessibility variants are shipped.
- A validation suite proves there are no unresolved binding collisions.
- The profile can be exported, versioned, and shared.

---

# 9. Companion Files

This spec is paired with:

- `deckcode-controller-profile.schema.json` — machine-readable controller schema.
- `deckcode-prd-sds.md` — this PRD/SDS document.
