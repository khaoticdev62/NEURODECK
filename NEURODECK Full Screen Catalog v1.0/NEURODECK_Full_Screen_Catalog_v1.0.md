# NEURODECK Full Screen Catalog v1.0

**Version:** v1.0  
**Date:** 2026-06-09  
**Product:** NEURODECK  
**Framework:** Electron + React + TypeScript + Tailwind CSS  
**Primary Platform:** Steam Deck Game Mode + Desktop Mode  
**Purpose:** Define every production screen, route, UI state, controller path, IPC touchpoint, error state, and QA expectation required to build NEURODECK v1.0 without design drift.

---

## 0. How to Use This Catalog

This catalog is an implementation contract. Every screen must be built from the approved design tokens, component library, IPC registry, and SDS service boundaries. A screen is not production-ready until it satisfies its acceptance criteria, controller navigation rules, accessibility requirements, and QA cases.

### Required Companion Documents

- `NEURODECK_Canonical_Production_PRD_v1.0.md`
- `NEURODECK_Electron_SDS_v1.0.md`
- `NEURODECK_IPC_Contract_Registry_v1.0.md`
- `NEURODECK_Design_Tokens_Component_Library_v1.0.md`
- `NEURODECK_v1.0_Production_Release_Gates.md`

### Global Screen Rules

1. Every screen must work at **1280 × 800** without clipped primary actions.
2. Every critical flow must be reachable with controller only.
3. Every route must have loading, empty, error, and recovery states where applicable.
4. Renderer UI must never directly access filesystem, shell, secrets, or raw model processes.
5. All privileged actions must go through typed IPC exposed by preload.
6. No screen may rely on color alone to communicate status.
7. All destructive actions require confirmation with a plain-English consequence summary.
8. All logs, reports, and error views must redact secrets.
9. All overlays must be escapable with `B` / `Esc` unless doing so would corrupt data.
10. The app must never show a blank window as a failure state.

---

## 1. Global Layout System

### 1.1 Canonical App Shell

```text
┌────────────────────────────────────────────────────────────────┐
│ TopStatusBar: app state, model, session, telemetry, clock       │
├──────────────┬──────────────────────────────────────┬──────────┤
│ NavRail      │ Primary Route Content                │ Context  │
│              │                                      │ Rail     │
│              │                                      │ optional │
├──────────────┴──────────────────────────────────────┴──────────┤
│ Input / Action Footer / Controller Hints when applicable        │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Steam Deck Layout Behavior

At 1280 × 800:

- NavRail may collapse to icons.
- Context rail must be collapsible.
- Footer actions must remain reachable.
- Input console must account for virtual keyboard.
- Hit targets should be controller-friendly and touch-safe.

### 1.3 Global Controller Mapping Baseline

| Input | Global Meaning |
|---|---|
| D-pad / Left Stick | Move focus |
| A | Activate / confirm |
| B | Back / close overlay / cancel |
| X | Secondary action |
| Y | Details / help / alternate action |
| Start/Menu | Command palette |
| Select/View | Diagnostics quick panel where appropriate |
| L1/R1 | Cycle tabs/panels |
| L4 | Persona / context action |
| R4 | Regenerate / retry |
| L5 | Save / export |
| R5 | New session / new item |

---

## 2. Route Inventory

| Screen ID | Screen | Route | Priority | Owner |
|---|---|---|---|---|
| SCR-BOOT | Boot / Startup Screen | `internal://boot` | P0 | App Shell |
| SCR-ONB | First-Run Onboarding | `/onboarding` | P0 | App Shell / Settings |
| SCR-WKS | AI Workspace | `/workspace` | P0 | Workspace |
| SCR-CMD | Command Palette Overlay | `overlay://command-palette` | P0 | App Shell |
| SCR-MDL | Model Manager | `/models` | P0 | Model Service |
| SCR-AGT | Agent Manager | `/agents` | P1 | Agent Service |
| SCR-MEM | Memory and Context Manager | `/memory` | P1 | Memory Service |
| SCR-SES | Session Browser | `/sessions` | P0 | Session Service |
| SCR-PLG | Plugins and Hermes Extensions | `/extensions` | P0 | Hermes Extension Service |
| SCR-SET | Settings Hub | `/settings` | P0 | Settings Service |
| SCR-SEC | Security and Privacy Center | `/settings/security` | P0 | Security Service |
| SCR-DIAG | Diagnostics Dashboard | `/diagnostics` | P0 | Diagnostics Service |
| SCR-THEME | Theme Manager | `/settings/themes` | P1 | Design System |
| SCR-EXP | Export Manager | `/exports` | P1 | Session Service |
| SCR-UPD | Update and Maintenance | `/maintenance` | P1 | Update Service |
| SCR-ERR | Error Recovery Center | `/recovery` | P0 | App Shell / Diagnostics |

---

## 3. Screen Specifications

### 3.1 SCR-BOOT — Boot / Startup Screen

**Route:** `internal://boot`  
**Navigation Entry:** System startup only  
**Priority:** P0  
**Owner:** App Shell  
**Linked Requirements:** ND-APP-001, ND-APP-003, ND-DIAG-003, ND-PKG-001  
**Primary Components:** AppShell, TopStatusBar, DiagnosticsPanel, Toast  
**IPC Touchpoints:** `app:getVersion, app:getRuntimeInfo, diagnostics:healthCheck, settings:get`

#### Purpose

Initialize NEURODECK safely, validate runtime, load settings, detect previous crash state, and route the user to onboarding, recovery, or workspace.

#### Layout Requirements

- Full-screen tactical glass background with minimal loading telemetry.
- Centered NEURODECK wordmark/status module.
- Bottom-left runtime text: version, build channel, platform.
- Bottom-right startup stage indicator.
- No dense panels until app state is verified.

#### Required UI States

- Cold launch
- Warm launch after normal shutdown
- First launch
- Launch after crash
- Launch with corrupted config
- Launch offline
- Launch missing model runtime
- Launch from Steam Deck Game Mode

#### Error and Recovery States

- Config parse failure must route to Error Recovery with reset option.
- Database lock must show retry/repair/export logs actions.
- Missing app data directory must attempt safe creation once, then fail visibly.
- Renderer startup failure must be captured by main process where possible.

#### Controller Focus Rules

- No complex focus graph.
- B button cancels optional startup checks only after safe minimum app load.
- Menu button opens diagnostics only if boot completes enough to render recovery tools.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-boot.viewed`
- `scr-boot.action.started`
- `scr-boot.action.completed`
- `scr-boot.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Boot completes under target budget on Steam Deck.
- Crash recovery is detected and user is not dumped into a blank window.
- No secrets, raw paths with tokens, or stack traces are exposed to normal users.
- All fatal states have at least one recovery action.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_boot/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.2 SCR-ONB — First-Run Onboarding

**Route:** `/onboarding`  
**Navigation Entry:** Boot -> Onboarding; Settings -> Restart Onboarding  
**Priority:** P0  
**Owner:** App Shell / Settings  
**Linked Requirements:** ND-SET-001, ND-MDL-001, ND-CTL-002, ND-SEC-002  
**Primary Components:** AppShell, Panel, Button, TextInput, Select, ModelCard, ConfirmDialog  
**IPC Touchpoints:** `settings:get, settings:set, model:listProviders, secrets:set, diagnostics:healthCheck`

#### Purpose

Guide a new user through core setup without blocking them from entering the app.

#### Layout Requirements

- Left rail shows steps: Welcome, Runtime, Model, Privacy, Controls, Finish.
- Main panel contains one task per step.
- Right side displays contextual status and Deck control hints.
- Footer contains Back, Skip, Continue, Finish.

#### Required UI States

- Fresh install
- Existing config but onboarding incomplete
- Offline setup
- Local-only setup
- Remote provider setup
- Steam Deck controls detected
- No controller detected

#### Error and Recovery States

- Provider key validation failure must not discard typed key.
- Missing local model runtime offers skip and configure later.
- Permission denial writing config shows exact safe folder, not raw internals.

#### Controller Focus Rules

- D-pad moves between step controls.
- A activates highlighted control.
- B returns to previous step.
- Y skips optional step.
- Start finishes if all required steps are valid.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-onb.viewed`
- `scr-onb.action.started`
- `scr-onb.action.completed`
- `scr-onb.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- User can complete onboarding with controller only.
- User can skip remote provider setup.
- No API key is ever echoed back into renderer after save.
- Onboarding completion flag is stored.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_onb/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.3 SCR-WKS — AI Workspace

**Route:** `/workspace`  
**Navigation Entry:** Primary default route  
**Priority:** P0  
**Owner:** Workspace  
**Linked Requirements:** ND-WKS-001, ND-WKS-002, ND-WKS-003, ND-WKS-004, ND-WKS-005, ND-CTL-001  
**Primary Components:** AppShell, ChatViewport, ResponseCard, InputConsole, MemoryPanel, AgentCard, TopStatusBar, TelemetryWidget, CommandPalette  
**IPC Touchpoints:** `session:getActive, session:update, model:runPrompt, model:cancel, model:regenerate, memory:list, persona:getActive, agent:list`

#### Purpose

Provide the primary AI interaction surface for local/remote model use, session continuity, memory visibility, and agent context.

#### Layout Requirements

- TopStatusBar spans the top with active model, persona, latency, token status, network state.
- Center ChatViewport owns most space and supports streaming cards.
- Right Context Rail contains MemoryPanel and Agent status, collapsible at 1280x800.
- Bottom InputConsole remains always reachable and never overlaps virtual keyboard.
- CommandPalette overlays from center when invoked.

#### Required UI States

- Empty new session
- Existing session loaded
- Streaming response
- Paused/canceled generation
- Model error
- Offline model unavailable
- Context window warning
- Memory disabled
- Agent active
- Export mode

#### Error and Recovery States

- Model timeout renders recoverable ResponseCard.
- Provider auth failure links to Security/Provider Settings.
- Context overflow shows summarization/export options.
- Renderer cannot freeze during streaming.

#### Controller Focus Rules

- Default focus is InputConsole on new session.
- D-pad up from InputConsole enters latest ResponseCard actions.
- D-pad right opens Context Rail.
- L1/R1 cycle Workspace panels.
- R4 regenerates last response.
- L5 saves/export marks session.
- Start opens CommandPalette.
- B exits overlay or returns focus to InputConsole.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-wks.viewed`
- `scr-wks.action.started`
- `scr-wks.action.completed`
- `scr-wks.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Prompt can be entered and submitted controller-only.
- Streaming response remains scrollable/cancelable.
- Failed model calls preserve prompt text.
- All visible cards expose focusable actions.
- At 1280x800 no primary control is clipped.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_wks/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.4 SCR-CMD — Command Palette Overlay

**Route:** `overlay://command-palette`  
**Navigation Entry:** Start/Menu button, Ctrl+K, top bar action  
**Priority:** P0  
**Owner:** App Shell  
**Linked Requirements:** ND-APP-004, ND-CTL-002, ND-HRM-003  
**Primary Components:** CommandPalette, TextInput, Badge, IconButton, Toast  
**IPC Touchpoints:** `command:list, command:run, hermes:listCommands, hermes:run`

#### Purpose

Expose global navigation and safe command execution from anywhere in the app.

#### Layout Requirements

- Centered modal overlay with search input at top.
- Results grouped by App, Workspace, Model, Hermes, Diagnostics.
- Right preview pane shows command description, permissions, shortcut, and risk.
- Footer shows controller hints.

#### Required UI States

- Closed
- Open with recent commands
- Filtering
- No results
- Unsafe command requires confirmation
- Command running
- Command failed

#### Error and Recovery States

- Unavailable command must explain missing dependency.
- Permission-gated Hermes command must route to permission review.
- Command failure returns structured error card, not raw exception.

#### Controller Focus Rules

- Opening palette focuses search box.
- D-pad up/down navigates results.
- A runs highlighted command.
- Y toggles details.
- B closes.
- Start closes if already open.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-cmd.viewed`
- `scr-cmd.action.started`
- `scr-cmd.action.completed`
- `scr-cmd.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Palette opens from every route.
- Only allowlisted commands can execute.
- Search results update within interaction budget.
- Dangerous commands require explicit confirmation.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_cmd/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.5 SCR-MDL — Model Manager

**Route:** `/models`  
**Navigation Entry:** NavRail -> Models; Command Palette -> Models  
**Priority:** P0  
**Owner:** Model Service  
**Linked Requirements:** ND-MDL-001, ND-MDL-002, ND-MDL-003, ND-MDL-004, ND-SEC-002  
**Primary Components:** ModelCard, Panel, Button, Select, TextInput, ConfirmDialog, DiagnosticsPanel, Toast  
**IPC Touchpoints:** `model:list, model:getProvider, model:testProvider, model:setDefault, secrets:set, secrets:getStatus, diagnostics:modelCheck`

#### Purpose

Let users configure local and remote AI providers, choose defaults, test connectivity, and recover from broken models.

#### Layout Requirements

- Provider list on left.
- Selected provider/model details center.
- Right panel shows health checks, token/key status, and troubleshooting.
- Bottom action row: Test, Set Default, Edit, Remove.

#### Required UI States

- No providers configured
- Local provider detected
- Remote provider configured
- Provider needs secret
- Provider test running
- Provider test passed
- Provider test failed
- Default model selected
- Model unavailable

#### Error and Recovery States

- Invalid API key never displays raw value.
- Local binary missing shows install/config instructions.
- Provider network failure distinguishes offline from auth failure.
- Unsupported model config shows schema validation error.

#### Controller Focus Rules

- D-pad left/right moves provider list to details.
- A selects provider/action.
- Y tests provider.
- X opens edit.
- B returns to previous route.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-mdl.viewed`
- `scr-mdl.action.started`
- `scr-mdl.action.completed`
- `scr-mdl.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- User can configure at least one provider without touching terminal.
- Default provider persists.
- Provider tests produce actionable pass/fail results.
- Secrets remain inaccessible to renderer after save.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_mdl/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.6 SCR-AGT — Agent Manager

**Route:** `/agents`  
**Navigation Entry:** NavRail -> Agents; Workspace Context Rail -> Manage Agents  
**Priority:** P1  
**Owner:** Agent Service  
**Linked Requirements:** ND-AGT-001, ND-AGT-002, ND-PRS-001, ND-PRS-002  
**Primary Components:** AgentCard, Panel, Button, Select, Badge, ConfirmDialog, TextInput  
**IPC Touchpoints:** `agent:list, agent:get, agent:create, agent:update, agent:runTask, persona:list, persona:get`

#### Purpose

Manage built-in and user-created agents/personas used to shape AI workflows.

#### Layout Requirements

- Agent grid/list with status badges.
- Details panel for instructions, tools, limits, and current persona.
- Right safety panel shows permissions and allowed tools.
- Footer actions: Activate, Edit, Duplicate, Disable.

#### Required UI States

- Built-in agents only
- Custom agents present
- Agent active
- Agent disabled
- Agent running task
- Agent task failed
- Persona linked
- No persona selected

#### Error and Recovery States

- Malformed instruction template blocks save with line-level guidance.
- Agent command failure cannot crash workspace.
- Unsafe tool request is denied with permission explanation.

#### Controller Focus Rules

- D-pad moves through cards.
- A opens details.
- X edits.
- Y duplicates.
- B returns.
- R1 switches between Agents and Personas tab.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-agt.viewed`
- `scr-agt.action.started`
- `scr-agt.action.completed`
- `scr-agt.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Built-in agents cannot be accidentally deleted.
- Custom agent can be created and activated.
- Agent task execution is permission-aware.
- Agent status visible in Workspace.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_agt/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.7 SCR-MEM — Memory and Context Manager

**Route:** `/memory`  
**Navigation Entry:** NavRail -> Memory; Workspace MemoryPanel -> Expand  
**Priority:** P1  
**Owner:** Memory Service  
**Linked Requirements:** ND-MEM-001, ND-MEM-002, ND-MEM-003, ND-WKS-004  
**Primary Components:** MemoryPanel, Panel, TextInput, Button, Badge, ConfirmDialog, Toast  
**IPC Touchpoints:** `memory:list, memory:get, memory:create, memory:update, memory:delete, memory:search, memory:setVisibility`

#### Purpose

Give users transparent control over what NEURODECK remembers, where it came from, and whether it can be used in future sessions.

#### Layout Requirements

- Search and filters at top.
- Memory list by category/source.
- Details drawer shows content, source session, created date, visibility, delete controls.
- Right rail explains memory safety and current mode.

#### Required UI States

- No memory
- Memory disabled
- Search results
- Memory selected
- Memory pending approval
- Memory hidden
- Memory deleted
- Bulk select mode

#### Error and Recovery States

- Database read failure shows repair/export path.
- Delete failure must not remove UI item until confirmed.
- Search failure must preserve filter state.

#### Controller Focus Rules

- A opens selected memory.
- X toggles visibility.
- Y enters bulk mode.
- B exits details/bulk mode.
- D-pad moves list/details.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-mem.viewed`
- `scr-mem.action.started`
- `scr-mem.action.completed`
- `scr-mem.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- User can view every stored memory item.
- User can hide/delete memory.
- Memory source is visible.
- No hidden memory is used in context injection.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_mem/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.8 SCR-SES — Session Browser

**Route:** `/sessions`  
**Navigation Entry:** NavRail -> Sessions; Workspace -> Session menu  
**Priority:** P0  
**Owner:** Session Service  
**Linked Requirements:** ND-SES-001, ND-SES-002, ND-SES-003, ND-SES-004  
**Primary Components:** SessionCard, Panel, TextInput, Select, Button, ConfirmDialog, Toast  
**IPC Touchpoints:** `session:list, session:get, session:create, session:rename, session:delete, session:export, session:archive`

#### Purpose

Allow users to find, resume, organize, export, and delete AI sessions.

#### Layout Requirements

- Top search/filter row.
- Session cards in virtualized list/grid.
- Right preview panel with summary, model/persona, timestamps, token count, tags.
- Bottom actions: Open, New, Export, Archive/Delete.

#### Required UI States

- No sessions
- Sessions loading
- Search filtering
- Session selected
- Exporting
- Archived view
- Delete confirmation
- Corrupted session detected

#### Error and Recovery States

- Corrupt session opens recovery/export raw data option.
- Export failure shows target path and retry.
- Delete requires confirmation and supports undo if possible.

#### Controller Focus Rules

- D-pad moves session cards.
- A opens selected.
- X exports.
- Y creates new.
- B returns to Workspace.
- L1/R1 switch filters.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-ses.viewed`
- `scr-ses.action.started`
- `scr-ses.action.completed`
- `scr-ses.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Session resumes to exact prior conversation state.
- Search works with controller.
- Export produces readable file.
- Deletion cannot happen from single accidental press.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_ses/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.9 SCR-PLG — Plugins and Hermes Extensions

**Route:** `/extensions`  
**Navigation Entry:** NavRail -> Extensions; Command Palette -> Hermes  
**Priority:** P0  
**Owner:** Hermes Extension Service  
**Linked Requirements:** ND-HRM-001, ND-HRM-002, ND-HRM-003, ND-HRM-004, ND-HRM-005  
**Primary Components:** PluginCard, Panel, Badge, Button, ConfirmDialog, DiagnosticsPanel, Toast  
**IPC Touchpoints:** `hermes:listExtensions, hermes:installLocal, hermes:run, hermes:setTrust, hermes:getManifest, hermes:doctor`

#### Purpose

Manage Lua-based Hermes extensions and future plugin packages with explicit permissions and diagnostics.

#### Layout Requirements

- Installed extension list left.
- Manifest/permissions/details center.
- Doctor/security results right.
- Footer actions: Run, Trust/Untrust, Install Local, Disable, Remove.

#### Required UI States

- No extensions
- Extensions installed
- Extension disabled
- Untrusted extension
- Trusted extension
- Command running
- Doctor warnings
- Install from local package

#### Error and Recovery States

- Invalid manifest blocks install.
- Untrusted extension cannot execute commands.
- Shell/network permission requests require explicit review.
- Extension runtime failure shows logs with redaction.

#### Controller Focus Rules

- A opens extension details.
- X runs selected safe command.
- Y opens permission review.
- B returns.
- Start opens CommandPalette filtered to Hermes commands.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-plg.viewed`
- `scr-plg.action.started`
- `scr-plg.action.completed`
- `scr-plg.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- User can install local Hermes package.
- Permissions are visible before trust.
- Untrusted code does not execute.
- Extension errors do not crash app.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_plg/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.10 SCR-SET — Settings Hub

**Route:** `/settings`  
**Navigation Entry:** NavRail -> Settings; Command Palette -> Settings  
**Priority:** P0  
**Owner:** Settings Service  
**Linked Requirements:** ND-SET-001, ND-SET-002, ND-SET-003, ND-DSN-002, ND-CTL-003  
**Primary Components:** Panel, Button, Select, TextInput, Badge, ConfirmDialog, Toast  
**IPC Touchpoints:** `settings:get, settings:set, settings:reset, app:getRuntimeInfo, secrets:getStatus`

#### Purpose

Centralize app preferences, appearance, input, model defaults, privacy, storage, and reset operations.

#### Layout Requirements

- Settings category list left.
- Selected setting group center.
- Context help/right rail explains impact and reset options.
- Sticky footer shows Save/Revert only when dirty.

#### Required UI States

- Clean settings
- Dirty settings
- Save success
- Validation error
- Reset confirmation
- Theme preview
- Controller mapping preview
- Virtual keyboard config

#### Error and Recovery States

- Invalid setting cannot save and highlights exact field.
- Config write failure keeps unsaved changes.
- Reset shows precise scope.

#### Controller Focus Rules

- D-pad left/right moves categories/details.
- A edits/selects.
- X resets current group.
- Y opens help.
- B discards or asks confirmation if dirty.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-set.viewed`
- `scr-set.action.started`
- `scr-set.action.completed`
- `scr-set.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Every setting has label, help text, default, and validation.
- Dirty state is visible.
- Reset cannot erase secrets without explicit confirmation.
- Settings work with controller only.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_set/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.11 SCR-SEC — Security and Privacy Center

**Route:** `/settings/security`  
**Navigation Entry:** Settings -> Security; Command Palette -> Security  
**Priority:** P0  
**Owner:** Security Service  
**Linked Requirements:** ND-SEC-001, ND-SEC-002, ND-SEC-003, ND-SEC-004, ND-HRM-004  
**Primary Components:** Panel, Badge, Button, ConfirmDialog, DiagnosticsPanel, Toast  
**IPC Touchpoints:** `secrets:getStatus, secrets:delete, security:getReport, security:audit, hermes:listExtensions, logs:redactionTest`

#### Purpose

Expose security posture, secrets status, extension trust, log redaction, and privacy controls.

#### Layout Requirements

- Security posture summary top.
- Sections: Secrets, Extensions, Logs, Local Services, Privacy.
- Right rail displays current risk notes and recommended fixes.
- Action row for Audit Now, Rotate/Remove, Disable Extension.

#### Required UI States

- Healthy
- Warnings present
- Critical risk
- Secrets configured
- No secrets
- Untrusted extension installed
- Audit running
- Redaction test failed

#### Error and Recovery States

- Secret deletion requires confirmation.
- Audit failure shows partial findings.
- Redaction test failure blocks production release gate.

#### Controller Focus Rules

- A opens selected security item.
- X fixes recommended issue if one-click safe.
- Y shows technical detail.
- B returns to Settings.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-sec.viewed`
- `scr-sec.action.started`
- `scr-sec.action.completed`
- `scr-sec.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Secrets are never displayed in plaintext.
- Extension trust can be reviewed and revoked.
- Audit results map to release gates.
- Local services are shown with bind address/port.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_sec/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.12 SCR-DIAG — Diagnostics Dashboard

**Route:** `/diagnostics`  
**Navigation Entry:** NavRail -> Diagnostics; Boot Recovery -> Diagnostics; Command Palette  
**Priority:** P0  
**Owner:** Diagnostics Service  
**Linked Requirements:** ND-DIAG-001, ND-DIAG-002, ND-DIAG-003, ND-PKG-003  
**Primary Components:** DiagnosticsPanel, TelemetryWidget, Panel, Button, Badge, Toast  
**IPC Touchpoints:** `diagnostics:healthCheck, diagnostics:getReport, logs:list, logs:open, app:getRuntimeInfo, model:list, hermes:doctor`

#### Purpose

Give users and developers a clear health view of app runtime, models, storage, plugins, logs, and Steam Deck compatibility.

#### Layout Requirements

- Top health score/status strip.
- Main grid of health cards: App, Renderer, Models, Sessions, Memory, Hermes, Security, Steam Deck.
- Right log/recent errors panel.
- Footer actions: Run Full Doctor, Export Report, Open Logs.

#### Required UI States

- All healthy
- Warnings
- Critical
- Doctor running
- Report exported
- Logs unavailable
- Offline
- Steam Deck mode detected

#### Error and Recovery States

- Health check failure returns partial report.
- Export failure shows write target.
- Logs with secrets are redacted before display/export.

#### Controller Focus Rules

- D-pad navigates health cards.
- A opens card details.
- X exports report.
- Y runs doctor.
- B returns.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-diag.viewed`
- `scr-diag.action.started`
- `scr-diag.action.completed`
- `scr-diag.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Full diagnostics can run without crashing app.
- Report can be exported.
- Every critical issue has next-step guidance.
- Sensitive data is redacted in UI and export.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_diag/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.13 SCR-THEME — Theme Manager

**Route:** `/settings/themes`  
**Navigation Entry:** Settings -> Appearance; Command Palette -> Theme  
**Priority:** P1  
**Owner:** Design System  
**Linked Requirements:** ND-DSN-001, ND-DSN-002, ND-DSN-003, ND-CTL-001  
**Primary Components:** Panel, Button, Select, Badge, ConfirmDialog, Toast  
**IPC Touchpoints:** `settings:get, settings:set, app:getRuntimeInfo`

#### Purpose

Let users preview and select NEURODECK visual themes without breaking accessibility or Steam Deck readability.

#### Layout Requirements

- Theme gallery left/center.
- Live preview panel shows workspace sample.
- Right rail shows contrast, motion, and performance notes.
- Footer actions: Apply, Preview, Reset.

#### Required UI States

- Theme selected
- Preview active
- High contrast mode
- Reduced motion mode
- Theme invalid
- Theme applied

#### Error and Recovery States

- Theme token parse failure falls back to safe default.
- Low contrast custom theme cannot be applied without warning.

#### Controller Focus Rules

- D-pad moves theme cards.
- A previews.
- X applies.
- Y toggles accessibility metrics.
- B exits preview.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-theme.viewed`
- `scr-theme.action.started`
- `scr-theme.action.completed`
- `scr-theme.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- Theme switch does not reload app.
- High contrast remains available.
- Current theme persists.
- Preview never hides primary UI controls.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_theme/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.14 SCR-EXP — Export Manager

**Route:** `/exports`  
**Navigation Entry:** Session Browser -> Export; Workspace -> Export; Command Palette  
**Priority:** P1  
**Owner:** Session Service  
**Linked Requirements:** ND-SES-003, ND-DIAG-002, ND-SEC-004  
**Primary Components:** Panel, Select, Button, SessionCard, ConfirmDialog, Toast  
**IPC Touchpoints:** `session:export, session:list, logs:export, diagnostics:getReport`

#### Purpose

Centralize export of sessions, diagnostics, logs, and selected memory data.

#### Layout Requirements

- Export source selector top.
- Options panel center for format, destination, included metadata.
- Preview summary right.
- Footer actions: Export, Cancel, Open Folder.

#### Required UI States

- No export selected
- Session export
- Diagnostics export
- Log export
- Export running
- Export complete
- Export failed

#### Error and Recovery States

- Write permission failure offers alternate folder.
- Export cancellation cleans partial file.
- Logs must be redacted before export.

#### Controller Focus Rules

- A edits option.
- X starts export.
- B cancels/back.
- Y opens preview.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-exp.viewed`
- `scr-exp.action.started`
- `scr-exp.action.completed`
- `scr-exp.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- At least Markdown and JSON session export supported.
- Export path visible before writing.
- Sensitive values redacted.
- Failure preserves user choices.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_exp/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.15 SCR-UPD — Update and Maintenance

**Route:** `/maintenance`  
**Navigation Entry:** Settings -> Maintenance; Diagnostics -> Updates  
**Priority:** P1  
**Owner:** Update Service  
**Linked Requirements:** ND-PKG-001, ND-PKG-002, ND-PKG-003, ND-DIAG-003  
**Primary Components:** Panel, Button, Badge, DiagnosticsPanel, ConfirmDialog, Toast  
**IPC Touchpoints:** `app:getVersion, update:check, update:download, update:apply, settings:get, diagnostics:healthCheck`

#### Purpose

Support safe app updates, migration checks, checksums, repair flows, and maintenance tasks.

#### Layout Requirements

- Version/build info top.
- Update status center.
- Maintenance actions list: Check updates, Repair config, Clear cache, Verify package.
- Right panel shows release channel and risk notes.

#### Required UI States

- Up to date
- Update available
- Downloading
- Ready to apply
- Update failed
- Migration needed
- Repair available
- Offline

#### Error and Recovery States

- Update failure leaves current version untouched.
- Checksum mismatch blocks install.
- Migration failure routes to Error Recovery.

#### Controller Focus Rules

- A opens selected action.
- X checks update.
- Y verifies package/checksum.
- B returns.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-upd.viewed`
- `scr-upd.action.started`
- `scr-upd.action.completed`
- `scr-upd.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- No destructive maintenance runs without confirmation.
- Checksum mismatch is blocking.
- Offline state is clear.
- Current version remains usable after failed update.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_upd/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---

### 3.16 SCR-ERR — Error Recovery Center

**Route:** `/recovery`  
**Navigation Entry:** Boot failure; fatal error; diagnostics critical action  
**Priority:** P0  
**Owner:** App Shell / Diagnostics  
**Linked Requirements:** ND-APP-003, ND-DIAG-003, ND-SET-003, ND-SEC-004  
**Primary Components:** Panel, Button, DiagnosticsPanel, ConfirmDialog, Toast  
**IPC Touchpoints:** `diagnostics:getReport, settings:reset, logs:export, app:restart, app:getRuntimeInfo`

#### Purpose

Provide a safe recovery path when NEURODECK cannot start or a critical subsystem fails.

#### Layout Requirements

- Critical error summary top.
- Recovery actions center with risk levels.
- Technical details collapsible panel.
- Export report/logs action always visible if possible.

#### Required UI States

- Recoverable config error
- Database issue
- Renderer crash loop
- Extension crash
- Model crash
- Update migration failure
- Safe mode active

#### Error and Recovery States

- If logs cannot export, show path and manual copy instructions.
- If reset fails, preserve report and show exact next action.
- If extension crash caused issue, disable extension in safe mode.

#### Controller Focus Rules

- Default focus is safest primary action.
- A runs selected recovery.
- Y exports report.
- X shows technical details.
- B unavailable if no safe prior route.

#### Keyboard and Touch Rules

- Keyboard equivalents must exist for all controller actions.
- `Esc` mirrors `B` behavior unless a modal explicitly requires confirmation.
- Touch targets must remain usable on the Steam Deck touchscreen.
- Text entry screens must not be obscured by the virtual keyboard.

#### Accessibility Requirements

- All interactive elements must expose accessible names.
- Focus order must match visual order.
- Status must use icon/text plus color, not color alone.
- Reduced motion mode must disable nonessential transitions.
- High contrast mode must preserve hierarchy and focus visibility.

#### Telemetry / Local Diagnostics Events

- `scr-err.viewed`
- `scr-err.action.started`
- `scr-err.action.completed`
- `scr-err.error`

Telemetry is local/diagnostic by default unless the user explicitly enables external reporting.

#### QA Acceptance Criteria

- No fatal error produces a blank screen.
- User can export report/logs.
- Safe mode disables extensions and nonessential services.
- Reset is scoped and confirmed.

#### Implementation Notes

- Use only approved design tokens and registered components.
- Route code should live under `src/renderer/routes/scr_err/` or an equivalent feature route folder.
- All IPC calls must use typed preload APIs; no renderer-side Node access.
- Screen-level state should be recoverable after renderer reload where practical.
- Add Playwright coverage for normal, empty, loading, and failure states.

---


## 4. Cross-Screen State Requirements

### 4.1 Loading States

Every route that calls IPC must define:

- Initial loading skeleton
- Reload/loading after action
- Timeout state
- Retry action
- User-safe error copy

### 4.2 Empty States

Empty states must include:

- Explanation of why the state is empty
- Primary next action
- Secondary learn-more/help action when useful
- Controller hint

### 4.3 Error States

All screen errors must use a shared error object:

```ts
export type NeurodeckError = {
  code: string;
  message: string;
  userMessage: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recoveryActions: Array<{
    id: string;
    label: string;
    risk: 'safe' | 'moderate' | 'destructive';
  }>;
  redactedDetails?: string;
};
```

### 4.4 Confirmation Copy Pattern

Destructive confirmations must follow this copy model:

```text
Action: Delete session
Consequence: This removes the local session from this device.
Recovery: This cannot be undone unless you exported it.
Confirm: Hold A or type DELETE depending on input mode.
```

---

## 5. Required Route-Level Test Matrix

Each screen requires:

| Test Type | Required |
|---|---:|
| Render smoke test | Yes |
| Route navigation test | Yes |
| Controller focus test | Yes |
| Keyboard navigation test | Yes |
| Loading state test | Yes |
| Empty state test | When applicable |
| Error state test | Yes |
| IPC mocked-contract test | Yes |
| Accessibility axe test | Yes |
| 1280×800 visual test | Yes |
| 1920×1080 visual test | Yes |
| Reduced motion test | When motion exists |
| High contrast test | Yes |

---

## 6. Production Definition of Done

A screen is production-ready only when:

- It is listed in the route registry.
- It uses approved components and tokens.
- It has loading/empty/error/recovery states.
- It has a controller focus graph.
- It passes 1280×800 Steam Deck layout QA.
- It has typed IPC usage only.
- It has accessibility labels and keyboard fallback.
- It has Playwright route coverage.
- It has no console errors during normal operation.
- It does not expose secrets in UI, logs, telemetry, or exported reports.
- It is traceable back to PRD requirement IDs.

---

## 7. Screen Build Order

Recommended implementation order:

1. `SCR-BOOT` — Boot / Startup
2. `SCR-ERR` — Error Recovery
3. `SCR-WKS` — AI Workspace
4. `SCR-CMD` — Command Palette
5. `SCR-SES` — Session Browser
6. `SCR-MDL` — Model Manager
7. `SCR-SET` — Settings Hub
8. `SCR-SEC` — Security and Privacy Center
9. `SCR-DIAG` — Diagnostics Dashboard
10. `SCR-PLG` — Plugins and Hermes Extensions
11. `SCR-MEM` — Memory and Context Manager
12. `SCR-AGT` — Agent Manager
13. `SCR-THEME` — Theme Manager
14. `SCR-EXP` — Export Manager
15. `SCR-UPD` — Update and Maintenance
16. `SCR-ONB` — First-Run Onboarding

Boot and recovery come first because a production app needs a way to fail cleanly before it gets fancy. Pretty crashes are still crashes.

---

## 8. AI Builder Guardrails

When using Claude, Codex, Kimi, Gemini, Cursor, or another AI builder:

- Do not generate new screens outside this catalog without updating the route registry.
- Do not invent new visual tokens.
- Do not call IPC channels not listed in the IPC registry.
- Do not put secrets, shell access, or filesystem access into renderer code.
- Do not merge a screen without controller and 1280×800 tests.
- Do not treat placeholder content as production data.
- Do not remove error states to simplify the UI.

---

## 9. Final Release Gate for Screen Catalog

The catalog is accepted when every P0 screen has:

- Final wireframe/layout spec
- Route path
- Component list
- IPC list
- Controller focus rules
- Error states
- Accessibility rules
- Acceptance criteria
- Test coverage mapping

P1 screens may ship in basic form only if their routes are hidden or clearly marked as preview.
