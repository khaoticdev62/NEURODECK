# NeuroDeck OS / NDX Harness

## Production Wireframe, Controller UX, and Interaction Specification

**Document type:** Product design specification  
**Target platform:** Steam Deck LCD/OLED, SteamOS Game Mode and Desktop Mode  
**Primary resolution:** 1280 × 800, 16:10  
**Secondary layouts:** 1920 × 1080 docked, 2560 × 1440 docked  
**Input requirement:** 100% operable with Steam Deck controls  
**Implementation direction:** Electron + React + TypeScript + Tailwind CSS with a hardened local core service  
**Maturity target:** Production architecture, not an MVP or visual-only prototype

---

# 1. Product Definition

NeuroDeck OS is a controller-native AI operating harness that runs above SteamOS. It unifies local and cloud AI, project workspaces, code editing, terminal control, file management, browser sessions, workflows, remote systems, learning modules, and system utilities into one coherent interface.

The product must behave like a console operating system rather than a desktop application stretched onto an 800p screen.

## 1.1 Core product promise

A user can:

1. Launch NeuroDeck from Steam Game Mode.
2. Navigate every screen with the controller.
3. Ask for work through speech, predictive input, structured commands, or direct manipulation.
4. Inspect the AI plan before execution.
5. Approve, modify, pause, cancel, or roll back every meaningful operation.
6. Return safely to SteamOS at any time.

## 1.2 Non-negotiable principles

- No required mouse.
- No required touchscreen.
- No required external keyboard.
- No hover-only actions.
- No unreviewed destructive AI execution.
- No hidden background agents.
- No dead-end screens.
- No focus loss.
- No tiny desktop-scale controls.
- No mocked system status in production.
- No silent permission expansion.
- No destructive action without a recovery path.
- No UI surface without loading, empty, error, offline, and restricted states.

---

# 2. Experience Architecture

```text
SteamOS
└── NeuroDeck OS Harness
    ├── NDX Shell
    │   ├── Global Navigation
    │   ├── Workspace Manager
    │   ├── Command Palette
    │   ├── Notification Center
    │   └── Quick Overlay
    ├── Controller Runtime
    │   ├── Steam Input Adapter
    │   ├── Spatial Focus Engine
    │   ├── Haptics Service
    │   └── Input Profile Manager
    ├── AI Runtime
    │   ├── Model Router
    │   ├── Agent Manager
    │   ├── Context Broker
    │   └── Prompt/Tool Policy Layer
    ├── Execution Runtime
    │   ├── Typed Tool Registry
    │   ├── Permission Broker
    │   ├── Action Queue
    │   ├── Validation Layer
    │   └── Recovery Manager
    ├── Workstation Services
    │   ├── Files
    │   ├── Terminal/PTTY
    │   ├── Git
    │   ├── Browser
    │   ├── Code/LSP
    │   ├── SSH/Remote
    │   └── Workflow Engine
    └── Storage
        ├── SQLite State
        ├── Encrypted Secrets
        ├── Workspace Snapshots
        ├── Logs
        └── User Preferences
```

---

# 3. Screen System

## 3.1 Base canvas

- Native target: `1280 × 800`
- Safe inset: `24 px`
- Standard spacing grid: `8 px`
- Minimum focusable target: `48 × 48 px`
- Preferred button height: `52 px`
- Preferred list row height: `64–80 px`
- Primary navigation rail: `88 px expanded icon rail`, `240 px labeled rail`
- Context panel: `320 px`
- Top system rail: `56 px`
- Bottom controller rail: `56 px`
- Modal maximum width: `760 px`
- Fullscreen dialog safe width: `1184 px`

## 3.2 Default shell anatomy

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Brand / Workspace                      Model   Network   Battery   Time      │ 56
├────────────┬───────────────────────────────────────────────┬─────────────────┤
│            │                                               │                 │
│  Primary   │               Active View                     │ Context Panel   │
│  Rail      │                                               │                 │
│  88/240    │                                               │ 320             │
│            │                                               │                 │
├────────────┴───────────────────────────────────────────────┴─────────────────┤
│ [A] Select   [B] Back   [X] Actions   [Y] AI   [Menu] Commands              │ 56
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Shell display modes

### Standard mode

Primary rail + active view + optional context panel.

### Focus mode

Navigation and context panel collapse. Used for code, terminal, browser, media, and complex workflows.

### Split mode

Two equal or weighted panes. Used for compare, code + AI, file + preview, terminal + logs.

### Overlay mode

Quick system controls appear over the current application without destroying underlying state.

### Theater mode

Large cards and reduced information density for docked/controller-at-distance use.

---

# 4. Controller Contract

## 4.1 Universal mapping

| Input        | Global behavior                          |
| ------------ | ---------------------------------------- |
| A            | Select, open, confirm                    |
| B            | Back, close, cancel                      |
| X            | Context menu / object actions            |
| Y            | Ask AI about focused object              |
| LB / RB      | Previous / next primary tab              |
| LT / RT      | Previous / next pane, workspace, or mode |
| D-pad        | Precise focus movement                   |
| Left stick   | Accelerated spatial navigation           |
| Right stick  | Scroll, pan, inspect                     |
| L3           | Pin, favorite, bookmark                  |
| R3           | Expand, inspect, or focus selected item  |
| View         | Activity and notifications               |
| Menu         | Universal command palette                |
| L4           | Push-to-talk                             |
| L5           | Predictive keyboard / input mode         |
| R4           | AI radial actions                        |
| R5           | Execute, run, or resume                  |
| Steam button | SteamOS system behavior                  |
| Quick Access | NeuroDeck quick overlay where supported  |

## 4.2 Chorded controls

| Chord       | Action                             |
| ----------- | ---------------------------------- |
| LB + RB     | Return to NeuroDeck Home           |
| LT + RT     | Workspace switcher                 |
| Menu + B    | Emergency cancel active operation  |
| View + Y    | Read current screen aloud          |
| L4 + R4     | Voice command with current context |
| L5 + R5     | Toggle edit/navigation mode        |
| LB + X      | Open recent items                  |
| RB + X      | Open running tasks                 |
| Menu + View | Lock NeuroDeck                     |

Chords must be configurable and never conflict with SteamOS-reserved controls.

## 4.3 Hold behavior

- Hold `B` for 700 ms: close the current stack of transient overlays.
- Hold `R5` for 700 ms: run with confirmation summary.
- Hold `Y` for 700 ms: open full contextual AI canvas.
- Hold `View` for 700 ms: show complete task timeline.
- Hold `Menu` for 700 ms: open full command search with predictive keyboard.

## 4.4 Haptics

| Event                    | Haptic response         |
| ------------------------ | ----------------------- |
| Focus movement           | Very light tick         |
| Pane boundary            | Medium tick             |
| Selection                | Short pulse             |
| Success                  | Two rising pulses       |
| Warning                  | One long pulse          |
| Destructive confirmation | Heavy double pulse      |
| Invalid action           | Short-low-short pattern |
| Agent needs approval     | Distinct triple pulse   |

Haptics must have off, low, medium, and high settings.

---

# 5. Spatial Focus Engine

## 5.1 Focus node contract

```ts
export interface FocusNode {
  id: string
  groupId: string
  role: 'button' | 'listitem' | 'tab' | 'field' | 'treeitem' | 'slider' | 'canvas-node'
  disabled: boolean
  hidden: boolean
  priority: number
  up?: string
  down?: string
  left?: string
  right?: string
  fallback?: string
  onFocus?: () => void
  onBlur?: () => void
  onActivate: () => void
  onContext?: () => void
  onAssist?: () => void
}
```

## 5.2 Rules

1. Every view defines an initial focus target.
2. Closing a modal restores focus to its invoking element.
3. Removing a focused element transfers focus to the nearest valid sibling.
4. Virtualized lists preserve logical focus by item ID.
5. Focus never lands on hidden or disabled elements.
6. Scrolling follows focus with at least 24 px visual breathing room.
7. Pane transitions preserve the most recently focused control in each pane.
8. Modal focus is trapped until the modal closes.
9. Focus order follows task logic, not raw DOM order.
10. Focus movement must be deterministic at all supported resolutions.

## 5.3 Focus visual state

- 2 px inner focus border.
- 4 px outer bloom or elevated shadow.
- 1.03–1.05 scale increase where layout permits.
- Focused text becomes primary contrast.
- Secondary action hints appear only when helpful.
- No layout reflow.
- Reduced-motion mode removes scaling and uses border/contrast only.

---

# 6. Global Components

## 6.1 Top System Rail

Displays:

- NeuroDeck logo
- Active workspace
- Active profile
- Current AI model
- Connection state
- VPN state
- CPU/GPU warning indicator
- Battery percentage and charging
- Time
- Agent activity indicator

Actions:

- `A`: Open status details.
- `X`: Configure focused status item.
- `Y`: Explain status or anomaly.
- `LB/RB`: Move between rail groups when rail is focused.

States:

- Normal
- Offline
- Battery saver
- Thermal warning
- Agent approval required
- Restricted workspace
- Update available

## 6.2 Primary Navigation Rail

Destinations:

1. Home
2. AI
3. Workspaces
4. Build
5. Files
6. Terminal
7. Browser
8. Automations
9. Models
10. Learn
11. System

Behavior:

- `LB/RB` cycles destinations globally.
- `A` opens.
- `X` opens destination-specific quick actions.
- `L3` pins/unpins secondary destinations.
- Rail collapses in Focus mode.

## 6.3 Bottom Controller Rail

Always shows the four most relevant controls.

```text
[A] Open     [B] Back     [X] Actions     [Y] Ask AI
```

Secondary hints may appear to the right:

```text
[R5] Run     [L5] Keyboard     [Menu] Commands
```

Rules:

- Maximum six visible hints.
- Hints update within 100 ms of focus change.
- Labels use verbs, not vague nouns.
- Destructive actions are never shown as a casual default hint.

## 6.4 Toasts

Categories:

- Information
- Success
- Warning
- Error
- Approval required
- Background task complete

Controller behavior:

- `View` opens the source event.
- `B` dismisses.
- Toasts never steal focus.
- Critical errors can expand into a blocking recovery dialog.

## 6.5 Context Panel

Contains:

- Focused item title
- Status
- Description
- Metadata
- Available actions
- AI suggestions
- Permissions
- Related items
- Recent activity

The panel must not duplicate the main view. It should explain or extend it.

---

# 7. Screen Inventory

| ID     | Screen                     |
| ------ | -------------------------- |
| ND-001 | Boot and Session Start     |
| ND-002 | Lock Screen                |
| ND-003 | First-Run Welcome          |
| ND-004 | Controller Calibration     |
| ND-005 | AI Provider Setup          |
| ND-006 | Workspace Discovery        |
| ND-007 | Guided Controller Tutorial |
| ND-008 | Home Command Center        |
| ND-009 | Universal Command Palette  |
| ND-010 | Global Search              |
| ND-011 | Activity Center            |
| ND-012 | Notification Center        |
| ND-013 | AI Command Canvas          |
| ND-014 | AI Execution Timeline      |
| ND-015 | Approval Queue             |
| ND-016 | Agent Operations Center    |
| ND-017 | Agent Detail               |
| ND-018 | Workspace Hub              |
| ND-019 | Workspace Detail           |
| ND-020 | Workspace Switcher         |
| ND-021 | Build Studio               |
| ND-022 | Code Editor                |
| ND-023 | Symbol Navigator           |
| ND-024 | Diagnostics and Problems   |
| ND-025 | Git Control Center         |
| ND-026 | File Manager               |
| ND-027 | File Preview               |
| ND-028 | Universal Terminal         |
| ND-029 | Command Builder            |
| ND-030 | Browser Hub                |
| ND-031 | Browser View               |
| ND-032 | Workflow Library           |
| ND-033 | Workflow Forge             |
| ND-034 | Workflow Run Detail        |
| ND-035 | Model Control Center       |
| ND-036 | Model Detail               |
| ND-037 | Routing Profiles           |
| ND-038 | Learning Hub               |
| ND-039 | Guided Lab                 |
| ND-040 | Remote Systems             |
| ND-041 | Remote Session             |
| ND-042 | System Dashboard           |
| ND-043 | Controller Settings        |
| ND-044 | Display and Theme Settings |
| ND-045 | Network and VPN            |
| ND-046 | Privacy and Permissions    |
| ND-047 | Storage and Recovery       |
| ND-048 | Integrations               |
| ND-049 | Updates                    |
| ND-050 | Quick Access Overlay       |
| ND-051 | Power Menu                 |
| ND-052 | Recovery Timeline          |
| ND-053 | Before/After Diff          |
| ND-054 | Emergency Stop             |
| ND-055 | Error Recovery             |
| ND-056 | About and Diagnostics      |

---

# 8. Screen Specifications

---

## ND-001 — Boot and Session Start

### Purpose

Initialize the harness, verify core services, restore the previous session, and surface failures without trapping the user.

### Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                              NEURODECK                                       │
│                        Controller-Native AI OS                               │
│                                                                              │
│                    ● Loading core services                                   │
│                    ○ Restoring workspace                                     │
│                    ○ Checking model runtime                                  │
│                    ○ Connecting controller                                   │
│                                                                              │
│                     [B] Return to SteamOS                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### States

- Normal boot
- Fast resume
- Offline boot
- Core service unavailable
- Database migration
- Recovery mode
- Safe mode
- Update completion

### Requirements

- Boot can never spin indefinitely.
- A detailed status view appears after 10 seconds or on `X`.
- `B` always provides a safe exit to SteamOS.
- Failed optional services do not block basic shell access.
- Failed critical services offer Retry, Safe Mode, Diagnostics, and Exit.

---

## ND-002 — Lock Screen

### Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  7:42 PM                                                    82%              │
│                                                                              │
│                         Welcome back, Khaotic                                │
│                                                                              │
│                   [A] Unlock with controller PIN                             │
│                   [Y] Use account authentication                             │
│                   [B] Power options                                          │
│                                                                              │
│                 2 workflows paused · 1 approval waiting                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Security

- Controller PIN uses randomized or privacy-aware selection options.
- Credential fields never expose predictive history.
- Locking pauses sensitive agents by policy.
- Remote sessions may continue only if explicitly configured.

---

## ND-003 — First-Run Welcome

### Goal

Explain NeuroDeck in under 30 seconds and begin setup.

### Cards

- Controller-native AI
- Private local workspaces
- Review before execution
- Recover every major change

### Actions

- `A`: Begin setup
- `X`: Accessibility
- `Y`: Explain privacy model
- `B`: Exit

---

## ND-004 — Controller Calibration

### Sections

1. Button detection
2. Stick dead zones
3. Trigger calibration
4. Back-button mapping
5. Haptics
6. Focus movement speed
7. Hold duration
8. Accessibility presets

### Test surface

A live controller diagram highlights the last input and current mapped behavior.

### Acceptance criteria

- Every supported input can be tested.
- Unavailable rear buttons do not block setup.
- Settings can be reset with a hold-confirm action.
- Calibration is stored per controller profile.

---

## ND-005 — AI Provider Setup

### Provider groups

- Local runtime
- OpenAI-compatible provider
- Cloud coding model
- Speech provider
- Vision provider
- Embedding provider

### Provider card

```text
Provider Name
Status: Not connected
Capabilities: Chat · Code · Vision
Privacy: Cloud processing
Cost control: Not configured

[A] Configure    [Y] Explain    [X] Advanced
```

### Requirements

- Keys are entered through secure fields.
- Secrets are stored using OS-backed secure storage where available.
- The renderer never receives raw stored keys after setup.
- A connection test must validate real capability, not merely HTTP reachability.
- Offline mode remains fully usable with supported local models.

---

## ND-006 — Workspace Discovery

### Sources

- Home directory projects
- Git repositories
- Recent folders
- Steam library tools
- SSH hosts
- Removable storage
- Manually selected folder

### Flow

1. Choose sources.
2. Preview discovered workspaces.
3. Exclude sensitive folders.
4. Assign default permissions.
5. Create workspace index.

### Safety

Scanning is read-only. No files are modified.

---

## ND-007 — Guided Controller Tutorial

### Lessons

1. Move focus
2. Open and go back
3. Open object actions
4. Ask AI about an item
5. Open predictive input
6. Approve a harmless plan
7. Pause and resume a simulated task

### Completion

The final exercise creates a test workspace and then deletes it with a visible recovery path.

---

## ND-008 — Home Command Center

### Layout

```text
┌──────────┬───────────────────────────────────────────────────┬───────────────┐
│          │ Good evening, Khaotic                             │ System Pulse  │
│  HOME    │ What are we building today?                      │ CPU 14%       │
│          │                                                   │ RAM 6.2 GB    │
│  AI      │ [ Hold L4 to speak or press A to type ]          │ Battery 82%   │
│          │                                                   │ Tasks 3       │
│  BUILD   ├───────────────────────────────────────────────────┤               │
│          │ Continue                                          │ AI Profile    │
│  FILES   │ [NeuroDeck UI Audit] 72%                         │ Local First   │
│          │ [K-Script Compiler] Last opened yesterday         │               │
│  ...     ├───────────────────────────────────────────────────┤               │
│          │ Quick Actions                                     │               │
│          │ [Open] [Ask AI] [Terminal] [Workflow]            │               │
├──────────┴───────────────────────────────────────────────────┴───────────────┤
│ [A] Open   [X] Actions   [Y] Ask AI   [L4] Speak   [Menu] Commands          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Modules

- Conversational launch field
- Continue cards
- Pinned workspaces
- Quick actions
- Running tasks
- Recommendations
- System pulse
- Update/alert strip

### Recommendation rules

Recommendations must be based on:

- Current workspace state
- Recent user actions
- Incomplete approved tasks
- Real system conditions
- Explicitly enabled suggestions

No invented urgency or fake personalization.

### Empty state

“Create or discover a workspace” with actions for folder, Git, remote host, and sample learning lab.

---

## ND-009 — Universal Command Palette

### Open with

`Menu`

### Search domains

- Screens
- Commands
- Files
- Symbols
- Workspaces
- Workflows
- Agents
- Settings
- Recent actions

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Search commands, files, workspaces, and actions...           │
├──────────────────────────────────────────────────────────────┤
│ Suggested                                                     │
│ > Open active workspace terminal                             │
│ > Pause all agents                                           │
│ > Switch to Battery Saver                                    │
│ > Search symbols                                             │
├──────────────────────────────────────────────────────────────┤
│ [A] Run  [X] Details  [Y] Explain  [L5] Keyboard  [B] Close │
└──────────────────────────────────────────────────────────────┘
```

### Requirements

- Results are grouped and ranked.
- Dangerous commands show a risk badge before activation.
- Commands with missing requirements show why they are unavailable.
- Natural-language queries resolve to inspectable command candidates, not immediate execution.

---

## ND-010 — Global Search

### Filters

- Everywhere
- Current workspace
- Files
- Code
- Conversations
- Tasks
- Logs
- Browser history
- Learning content

### Results

Each result includes source, location, modified date, relevance, and quick actions.

### Controller behavior

- `LT/RT`: Move result category.
- `R3`: Preview.
- `Y`: Summarize or explain.
- `X`: Context actions.

---

## ND-011 — Activity Center

### Categories

- Running
- Waiting for approval
- Completed
- Failed
- Paused
- Scheduled

### Task card

```text
UI Audit Agent
Running · Step 4 of 7
Inspecting controller focus paths
Elapsed: 02:18
Files touched: 0

[A] Open   [X] Actions   [R5] Pause
```

### Batch controls

- Pause all
- Resume all safe tasks
- Cancel selected
- Open approval queue
- Export execution report

---

## ND-012 — Notification Center

### Notification types

- Task update
- Approval needed
- System warning
- Model unavailable
- Update
- Remote connection
- Security event

### Rules

- Notifications never masquerade as errors.
- Repeated events collapse into one threaded card.
- The user can mute by source or category.
- Security and destructive-action alerts cannot be fully disabled.

---

## ND-013 — AI Command Canvas

### Purpose

Turn intent into a transparent, editable execution plan.

### Layout

```text
┌────────────┬──────────────────────────────────────────────┬─────────────────┐
│ Intent     │ Plan                                         │ Impact          │
│            │                                              │                 │
│ "Audit the │ 1. Inspect routes                            │ Risk: Medium    │
│ settings   │ 2. Run controller tests                      │ Files: 12 max   │
│ screens"   │ 3. Capture failures                          │ Network: No     │
│            │ 4. Propose fixes                             │ Reversible: Yes │
│            │ 5. Apply approved patches                    │                 │
│            │ 6. Re-run validation                         │ Model: Local    │
├────────────┴──────────────────────────────────────────────┴─────────────────┤
│ [A] Approve  [X] Edit Plan  [Y] Explain  [R5] Run  [B] Cancel             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Plan editing

The user can:

- Remove steps
- Reorder safe independent steps
- Change model
- Restrict file scope
- Disable network
- Set maximum changed files
- Require approval before each patch
- Require test success before completion
- Create a Git branch
- Set timeout or compute budget

### Required plan metadata

- Goal
- Inputs
- Tools
- Permissions
- Risk
- Files or resources in scope
- Network requirements
- Expected outputs
- Validation
- Rollback
- Completion definition

---

## ND-014 — AI Execution Timeline

### Timeline item states

- Queued
- Running
- Waiting
- Passed
- Failed
- Skipped
- Rolled back

### Live panels

- Current step
- Agent reasoning summary
- Tool call
- Output
- Files changed
- Resource use
- Validation status

### Controls

- Pause
- Resume
- Cancel
- Inspect tool output
- Require next-step approval
- Change model at safe boundary
- Roll back current step

The UI displays a concise explanation, not hidden chain-of-thought.

---

## ND-015 — Approval Queue

### Approval classes

- File modification
- Shell command
- Network request
- Credential access
- Package install
- Git push
- Remote connection
- Privileged operation
- External communication

### Approval card

```text
REQUEST: Modify 4 files
Agent: UI Auditor
Reason: Repair inaccessible focus order
Scope: src/renderer/settings/*
Risk: Medium
Rollback: Git snapshot available

[A] Approve once
[X] Customize
[Y] Explain
[B] Deny
```

### Customization

- Change scope
- Approve specific files only
- Read-only instead
- Require preview
- Approve for this task
- Deny and revise plan

---

## ND-016 — Agent Operations Center

### Agent groups

- Active
- Paused
- Templates
- Completed
- Disabled

### Agent card fields

- Name
- Role
- Goal
- Status
- Model
- Workspace
- Permissions
- Current step
- Token/compute consumption
- Last activity

### Actions

- Open
- Pause
- Duplicate configuration
- Restrict
- Archive
- Export report
- Delete completed record

---

## ND-017 — Agent Detail

### Tabs

- Overview
- Timeline
- Files
- Tools
- Permissions
- Logs
- Output

### Overview

```text
Agent: Repository Maintainer
Status: Waiting for approval
Goal: Remove dead Tauri code and validate Electron wiring
Workspace: NeuroDeck
Model: Local Coder
Branch: agent/repo-maintenance-2026-06-21
```

### Safety view

Shows:

- Current effective permissions
- Denied requests
- Last privilege change
- Network destinations
- Processes started
- Child agents
- Rollback point

---

## ND-018 — Workspace Hub

### Views

- Grid cards
- Compact list
- Recent
- Pinned
- Archived
- Remote

### Workspace card

```text
NeuroDeck
Electron · React · TypeScript
Branch: feature/controller-shell
Health: 2 warnings
Last opened: Today

[A] Open   [X] Actions   [Y] Summarize
```

### Actions

- Open
- Resume last state
- Open terminal
- Run workflow
- View health
- Archive
- Duplicate profile
- Export workspace definition

---

## ND-019 — Workspace Detail

### Tabs

- Overview
- Sessions
- Files
- Git
- Tasks
- Models
- Permissions
- Environment
- History

### Overview modules

- Workspace health
- Recent activity
- Open sessions
- Git status
- Recommended next actions
- Resource profile
- Current agents
- Recovery points

---

## ND-020 — Workspace Switcher

### Open with

`LT + RT`

### Layout

A centered horizontal carousel of workspace cards with live thumbnails.

### Controls

- Left stick / D-pad: select
- `A`: switch
- `X`: actions
- `Y`: summarize state
- `R5`: resume most recent task
- `B`: close

Switching preserves the complete UI state of each workspace.

---

## ND-021 — Build Studio

### Purpose

Controller-native project development dashboard.

### Regions

- Project tree
- Editor stack
- Task runner
- AI coding panel
- Terminal
- Problems
- Git summary

### Modes

- Navigate
- Edit
- Review
- Debug
- Test

### Mode indicator

Always visible in the top-right of the editor region.

---

## ND-022 — Code Editor

### Controller editing model

#### Navigation mode

- D-pad: symbol/line movement
- Left stick: accelerated movement
- LB/RB: previous/next tab
- LT/RT: previous/next editor pane
- X: code actions
- Y: explain selection
- R4: AI radial
- R5: run current target
- L5: enter edit mode

#### Edit mode

- Predictive token wheel
- Snippet insertion
- Voice-to-code
- Structural edits
- Character keyboard as fallback

### Structural actions

- Add import
- Wrap block
- Extract method
- Rename symbol
- Generate test
- Add guard clause
- Move block
- Convert expression
- Fix diagnostic
- Format scope

### Editor overlays

- Completion list
- Signature help
- Diagnostic card
- Diff review
- Symbol breadcrumb
- Mini command strip

### Requirements

- LSP responses never trap focus.
- Completion can be dismissed with `B`.
- AI-generated edits always appear in a diff unless the user opted into a trusted low-risk rule.
- Long files support symbol-first navigation.

---

## ND-023 — Symbol Navigator

### Categories

- Classes
- Functions
- Methods
- Variables
- Types
- Imports
- Diagnostics
- TODOs

### Actions

- Jump
- Peek
- Rename
- Find references
- Explain
- Add to AI context
- Pin

---

## ND-024 — Diagnostics and Problems

### Grouping

- By severity
- By file
- By source
- By test
- By accessibility category

### Diagnostic card

```text
ERROR TS2322
SettingsPanel.tsx:184
Type 'undefined' is not assignable to type 'ControllerProfile'.

[A] Open   [X] Fix options   [Y] Explain   [R5] Run targeted test
```

### Bulk operations

- Fix all safe issues
- Create repair plan
- Ignore with reason
- Export report
- Run validation

---

## ND-025 — Git Control Center

### Sections

- Working tree
- Staged
- Branches
- Commits
- Remotes
- Pull requests
- Recovery branches

### Controller workflow

1. Select changed file.
2. Preview diff.
3. Stage or discard.
4. Build commit message with AI assistance.
5. Review exact commit.
6. Commit locally.
7. Push only after separate confirmation.

### Rules

- Push is never bundled silently with commit.
- Force push requires critical confirmation.
- Discard changes requires recovery snapshot where technically possible.
- The current branch is always visible.

---

## ND-026 — File Manager

### Layout modes

- List + preview
- Dual pane
- Tree
- Recent
- Workspace-only
- Storage overview

### Controller actions

- `A`: Open
- `X`: File actions
- `Y`: Explain/summarize
- `L3`: Favorite
- `R3`: Preview
- `LT/RT`: Pane switch
- `L5`: Rename/search input

### File actions

- Open
- Copy
- Move
- Rename
- Duplicate
- Compress
- Extract
- Share
- Add to workspace
- Add to AI context
- Delete
- Secure delete where supported

### Destructive behavior

Delete opens a summary showing item count, size, recovery support, and destination.

---

## ND-027 — File Preview

### Supported previews

- Text/code
- Markdown
- Images
- PDF
- Audio
- Video
- Archive contents
- JSON/YAML
- Logs
- Diff

### AI actions

- Summarize
- Explain
- Extract tasks
- Compare
- Convert
- Identify anomalies
- Generate metadata

No content is uploaded to a cloud model without explicit provider policy approval.

---

## ND-028 — Universal Terminal

### Modes

- Direct
- Command Builder
- Intent
- History
- Split
- Remote

### Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Workspace: NeuroDeck  ·  bash  ·  local  ·  branch: feature/controller      │
├──────────────────────────────────────────────────────────────────────────────┤
│ $ npm run test:controller                                                   │
│ > 142 passed, 3 failed                                                      │
│                                                                              │
│ [Focus failure output...]                                                   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Command suggestion: npm run test:controller -- --failed                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [A] Focus terminal  [X] Actions  [Y] Explain output  [L5] Input  [R5] Run  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Safety

- Commands generated by AI appear as editable, structured proposals.
- Privileged commands require explicit approval.
- Terminal output is parsed only as untrusted data.
- Escape sequences are sanitized.
- Secrets are redacted from logs and AI context.

---

## ND-029 — Command Builder

### Block types

- Program
- Subcommand
- Flag
- Value
- Path
- Pipe
- Redirect
- Conditional
- Environment variable

### Example

```text
[git] [branch] [--merged] [main]
   |       |         |       |
 program command    flag    value
```

### Features

- Context-aware valid options
- Man-page explanation
- Risk badge
- Preview exact shell command
- Copy without running
- Save as reusable action
- Run in local or remote terminal

---

## ND-030 — Browser Hub

### Sections

- Open tabs
- Workspaces
- Saved sessions
- Downloads
- History
- Web apps
- Dev tools
- Privacy profiles

### Card behavior

Browser tabs are grouped by workspace and can be suspended to save resources.

---

## ND-031 — Browser View

### Controller browser controls

- Left stick: focus navigation
- Right stick: scroll
- D-pad: precise focus
- A: activate
- B: browser back or close overlay
- X: page actions
- Y: ask AI about page
- LB/RB: tab switch
- LT/RT: browser pane switch
- L5: address/search input
- R3: reader/focus mode

### Features

- Reader mode
- Controller cursor fallback
- Download manager
- Permission prompts
- Per-site profiles
- Developer tools
- Open in workspace
- Save page to knowledge base
- Summarize with privacy warning

---

## ND-032 — Workflow Library

### Categories

- Development
- System
- Git
- Security
- Media
- Learning
- Remote
- User-created

### Workflow card

```text
Repository Quality Gate
12 steps · Last run successful
Triggers: Manual, pre-push
Permissions: Files, tests, local Git

[A] Open   [R5] Run   [X] Actions   [Y] Explain
```

---

## ND-033 — Workflow Forge

### Canvas interactions

- D-pad: move between nodes
- Left stick: pan
- Right stick: zoom
- A: open node
- X: node actions
- Y: generate/explain
- LB/RB: incoming/outgoing edge
- L3: pin
- R3: isolate node
- R5: run from selected node

### Node types

- Trigger
- Condition
- Tool action
- AI decision
- User approval
- Script
- Delay
- Parallel branch
- Merge
- Validator
- Output
- Rollback

### Rules

- AI decision nodes must define bounded outputs.
- Every workflow can be dry-run.
- Permission requirements are calculated before execution.
- Cycles require explicit loop limits.
- Unreachable nodes are flagged.
- Destructive nodes require recovery metadata.

---

## ND-034 — Workflow Run Detail

### Tabs

- Timeline
- Inputs
- Outputs
- Logs
- Approvals
- Recovery
- Metrics

### Controls

- Pause
- Resume
- Cancel
- Retry failed node
- Skip optional node
- Re-run from checkpoint
- Export report

---

## ND-035 — Model Control Center

### Sections

- Active models
- Installed local models
- Connected providers
- Downloads
- Capability matrix
- Resource use
- Routing profiles

### Model card

```text
Local Coder 14B
Status: Loaded
RAM: 8.1 GB
Context: 32K
Capabilities: Code · Tools
Speed: 18 tok/s
Privacy: Local

[A] Open   [X] Actions   [Y] Explain
```

---

## ND-036 — Model Detail

### Tabs

- Overview
- Capabilities
- Performance
- Storage
- Permissions
- Usage
- Logs

### Controls

- Load
- Unload
- Benchmark
- Assign to profile
- Set context limit
- Restrict tools
- Delete model
- Move model storage

### Requirements

Resource estimates must come from measured or provider-reported data, not fabricated UI values.

---

## ND-037 — Routing Profiles

### Default profiles

- Balanced
- Local First
- Offline
- Battery Saver
- Maximum Quality
- Fast Coding
- Private Workspace
- Low Cost

### Routing rule example

```text
IF task contains source code
AND local coder is loaded
AND battery > 25%
THEN use Local Coder 14B
ELSE use configured cloud coding provider after approval
```

### Editor

Rules are configured through controller-friendly condition cards, not raw JSON unless Advanced mode is opened.

---

## ND-038 — Learning Hub

### Areas

- IT fundamentals
- SOC and security
- Linux
- Networking
- Development
- Git
- AI tooling
- Steam Deck system skills
- User-created curricula

### Learning card

- Progress
- Estimated session length
- Hands-on lab availability
- Required tools
- Offline capability

---

## ND-039 — Guided Lab

### Layout

- Instruction pane
- Live terminal or code pane
- Objectives
- Hints
- AI coach
- Validation panel

### AI coach rules

- Gives hints before direct answers by default.
- Can switch to plain-English mode.
- Never claims task completion without real validation.
- Tracks the commands the learner actually ran.

---

## ND-040 — Remote Systems

### Systems

- SSH hosts
- Homelab devices
- Development servers
- Windows machines through supported remote tooling
- Containers/VMs through configured providers
- Network shares

### Host card

- Online status
- Latency
- Last connection
- Trust status
- Active tasks
- Credentials profile

---

## ND-041 — Remote Session

### Modes

- Terminal
- Files
- Metrics
- Services
- Logs
- Port forwarding
- Remote desktop launch

### Safety

- Remote actions are visibly marked.
- Host identity is always present.
- Destructive commands repeat the target hostname in confirmation.
- Clipboard transfer can be disabled per host.

---

## ND-042 — System Dashboard

### Modules

- CPU
- GPU
- RAM
- Storage
- Battery
- Thermal
- Fan
- Network
- Running services
- AI runtime
- Background tasks

### Views

- Overview
- Performance
- Processes
- Services
- Logs
- Hardware
- Diagnostics

### Actions

- Apply performance profile
- Stop process
- Restart user service
- Clear safe caches
- Export diagnostic bundle
- Ask AI about anomaly

---

## ND-043 — Controller Settings

### Sections

- Global mapping
- App profiles
- Rear buttons
- Focus speed
- Repeat delay
- Hold duration
- Haptics
- Gyro
- Trackpad fallback
- Accessibility
- Test controller

### Profile management

- Default
- Coding
- Terminal
- Browser
- Workflow Forge
- Game-overlay
- Custom

---

## ND-044 — Display and Theme Settings

### Sections

- Appearance
- Contrast
- Text size
- Motion
- Transparency
- Focus style
- Docked density
- Wallpaper
- Live wallpaper performance
- OLED-safe behavior

### Theme foundation

Base direction:

- Deep black/navy background
- Solid surfaces
- Ultraviolet accent
- Minimal glass
- Strong focus rings
- No neon overload
- No CRT effects

---

## ND-045 — Network and VPN

### Sections

- Connections
- Wi-Fi
- Ethernet
- VPN
- DNS
- Proxy
- Remote access
- Firewall status
- Network diagnostics

### VPN profiles

- OpenVPN
- WireGuard
- Provider import where legally and technically supported
- Per-workspace routing
- Kill switch
- Auto-connect rules

### Safety

Credentials and configuration files are treated as secrets.

---

## ND-046 — Privacy and Permissions

### Views

- Agent permissions
- Provider data policy
- Workspace boundaries
- Secret access
- Network destinations
- Audit history
- Consent rules

### Permission matrix

Rows: agents/tools/providers  
Columns: read files, write files, network, shell, secrets, Git push, remote systems.

### Requirements

- Effective access is visible.
- Inherited permissions are distinguishable.
- Revocation applies immediately where technically possible.
- Past access remains in audit history.

---

## ND-047 — Storage and Recovery

### Sections

- Disk usage
- Model storage
- Workspace cache
- Browser data
- Logs
- Snapshots
- Trash
- Recovery points
- Cleanup recommendations

### Cleanup behavior

Recommendations must show:

- Exact categories
- Estimated reclaimable size
- Consequences
- Recovery availability
- Items excluded

No “one-click magic cleanup” that hides what is being deleted.

---

## ND-048 — Integrations

### Categories

- Git providers
- Model providers
- Cloud storage
- Remote systems
- Development tools
- Learning platforms
- Notifications
- Steam/Deck integrations

### Integration card states

- Connected
- Disconnected
- Expired
- Permission changed
- Error
- Unsupported on current platform

---

## ND-049 — Updates

### Sections

- NeuroDeck app
- Core service
- Controller profiles
- Model runtime
- Plugins
- Workflow templates

### Update flow

1. Check
2. Review changelog
3. Validate compatibility
4. Create rollback point
5. Download
6. Apply
7. Verify
8. Offer rollback on failure

---

## ND-050 — Quick Access Overlay

### Open

Steam Deck Quick Access integration where available, otherwise configured chord.

### Layout

```text
┌──────────────────────────────┐
│ NEURODECK                    │
├──────────────────────────────┤
│ AI                           │
│ Ask about current screen     │
│ Continue last task           │
│ Pause agents                 │
├──────────────────────────────┤
│ Workspace                    │
│ Switch workspace             │
│ Save state                   │
│ Open terminal                │
├──────────────────────────────┤
│ System                       │
│ Performance profile          │
│ Model profile                │
│ VPN                          │
├──────────────────────────────┤
│ 2 tasks · 1 approval         │
└──────────────────────────────┘
```

### Requirements

- Opens within 250 ms after invocation when already running.
- Does not destroy the underlying screen state.
- Uses reduced animations.
- Can be dismissed with `B`.

---

## ND-051 — Power Menu

### Options

- Lock NeuroDeck
- Suspend
- Restart NeuroDeck
- Restart core service
- Return to SteamOS
- Restart device
- Shut down

Each option shows impact on running tasks.

---

## ND-052 — Recovery Timeline

### Timeline events

- File changes
- Package installation
- Settings changes
- Workflow checkpoints
- Git commits
- Agent operations
- System configuration

### Actions

- Inspect
- Compare
- Revert event
- Restore to point
- Branch from point
- Export snapshot

### Rules

The UI must distinguish:

- Fully reversible
- Partially reversible
- Manually recoverable
- Irreversible external action

---

## ND-053 — Before/After Diff

### Content types

- Code
- Text
- JSON/YAML
- Settings
- File tree
- Permission changes
- Workflow graph
- System configuration

### Controls

- Previous/next change
- Accept/reject chunk
- Explain change
- Restore original
- Export patch
- Run validation

---

## ND-054 — Emergency Stop

### Trigger

`Menu + B`

### Behavior

1. Pause all agent execution.
2. Stop queued tool calls.
3. Prevent new privileged operations.
4. Show active processes and remote actions.
5. Offer controlled termination.
6. Preserve logs and recovery points.

### Dialog

```text
EMERGENCY STOP ACTIVE

All NeuroDeck agents are paused.
2 local processes and 1 remote session remain active.

[A] Review
[X] Terminate safe processes
[Y] Explain
[B] Keep paused
```

---

## ND-055 — Error Recovery

### Error structure

- Plain-language problem
- Technical code
- Affected feature
- What still works
- Recovery actions
- Diagnostic details
- Export/share option

### Recovery actions

- Retry
- Restart feature
- Use fallback
- Enter safe mode
- Restore previous state
- Open logs
- Return home
- Exit to SteamOS

No generic “Something went wrong” without actionable details.

---

## ND-056 — About and Diagnostics

### Information

- App version
- Core version
- Build hash
- Platform
- Controller runtime
- Database version
- Installed integrations
- License information
- Diagnostic export

### Privacy

Diagnostic export previews included data and automatically redacts secrets.

---

# 9. Global Modals and Overlays

## 9.1 Confirmation modal

Used for medium-risk actions.

Contents:

- Exact action
- Scope
- Consequence
- Recovery
- Confirm / cancel

## 9.2 Critical confirmation modal

Used for irreversible, privileged, or external actions.

Requirements:

- Red critical header
- Target repeated
- Hold-to-confirm
- Optional typed/controller phrase for extreme operations
- Cannot be accepted accidentally through button repeat

## 9.3 Permission modal

Shows:

- Requesting agent/tool
- Requested capability
- Reason
- Scope
- Duration
- Risk
- Alternatives

## 9.4 Input overlay

Modes:

- Natural language
- Command
- Code
- Search
- Numeric
- Secret

## 9.5 AI radial menu

Contextual segments:

- Explain
- Summarize
- Inspect
- Transform
- Generate
- Compare
- Automate
- More

## 9.6 Item context menu

Opened with `X`.

Rules:

- Maximum seven top-level actions.
- Destructive actions are separated.
- Disabled actions explain why.
- Frequently used action order can adapt without moving destructive controls.

## 9.7 Model picker

Displays:

- Model
- Local/cloud
- Capability
- Speed
- cost policy
- Privacy
- Availability

## 9.8 Workspace picker

Displays live state and running tasks before switching.

---

# 10. Predictive Input System

## 10.1 Input hierarchy

1. Direct selection
2. Structured choices
3. Predictive completion
4. Snippets
5. Voice
6. Full keyboard

The user should type as little as possible.

## 10.2 Natural-language keyboard

- Word suggestions
- Phrase completion
- Recent safe phrases
- Workspace terms
- Voice button
- Undo
- Clear
- Submit

## 10.3 Code keyboard

- Language-aware tokens
- Symbols
- Snippets
- Delimiter pairing
- Completion ranking
- Scope-aware identifiers
- Refactor actions

## 10.4 Terminal keyboard

- Command history
- Executable suggestions
- Flags
- Paths
- Environment variables
- Pipes and redirects
- Risk preview

## 10.5 Secret keyboard

- No suggestion history
- No clipboard by default
- No screen capture where supported
- Temporary reveal
- Clear on cancel
- Never sent to AI context

---

# 11. Controller User Flows

## Flow A — Ask AI to repair a project issue

1. Open Home.
2. Select workspace.
3. Hold `L4`.
4. Say: “Find and fix controller navigation failures in settings.”
5. AI Command Canvas opens.
6. Review scope, risk, and validation.
7. Press `X` to restrict changes to `src/renderer/settings`.
8. Press `A` to approve.
9. Execution Timeline opens.
10. Agent requests file-write approval.
11. Review diff.
12. Approve selected changes.
13. Tests run.
14. Completion report shows passed and failed checks.
15. Press `L3` to save the recovery point.

## Flow B — Run a terminal command without typing

1. Open Terminal.
2. Press `Y`.
3. Say or select “Show merged local Git branches.”
4. Review exact command.
5. Press `Y` to explain.
6. Press `R5` to run.
7. Select output row.
8. Press `X` for next actions.

## Flow C — Create a workflow

1. Open Automations.
2. Open Workflow Forge.
3. Add Manual Trigger.
4. Add Run Tests node.
5. Add condition for success.
6. Add AI Audit on success.
7. Add Approval node before changes.
8. Add Validation node.
9. Dry-run.
10. Save as “Repository Quality Gate.”

## Flow D — Switch model because of battery

1. Battery warning appears.
2. Press `A` to inspect.
3. Select “Switch AI profile.”
4. Choose Battery Saver.
5. Review which running tasks will change model.
6. Confirm.
7. Tasks switch only at safe boundaries.

## Flow E — Recover from a bad agent patch

1. Open Activity.
2. Open completed agent.
3. Open Files tab.
4. Select changed file.
5. Open Before/After Diff.
6. Reject bad chunk or open Recovery Timeline.
7. Restore the pre-task checkpoint.
8. Re-run validation.

---

# 12. State Requirements for Every Screen

Every screen and major component must implement:

## Loading

- Skeleton or progress indicator
- Current operation
- Cancel where safe
- Timeout handling

## Empty

- Plain explanation
- Primary next action
- Optional learn-more action
- No decorative dead space

## Error

- Error summary
- What remains available
- Retry
- Alternative path
- Diagnostic details

## Offline

- Local capabilities
- Cloud-disabled explanation
- Reconnect action
- Queue behavior

## Restricted

- Missing permission
- Request access
- Use read-only mode
- Explain policy

## Partial

- Show available data
- Mark incomplete modules
- Avoid blocking the entire screen

## Success

- Confirm outcome
- Show result
- Offer next logical action
- Avoid pointless celebration animation

---

# 13. Visual Design System

## 13.1 Color tokens

```css
--ndx-bg-0: #090a0f;
--ndx-bg-1: #0e1017;
--ndx-surface-1: #141721;
--ndx-surface-2: #1b1f2b;
--ndx-surface-3: #24293a;
--ndx-border: #343a4f;

--ndx-text-1: #f6f7fb;
--ndx-text-2: #b2b8c9;
--ndx-text-3: #7f879b;

--ndx-accent: #8b5cf6;
--ndx-accent-strong: #a78bfa;
--ndx-ai: #b794ff;

--ndx-success: #4ade80;
--ndx-warning: #fbbf24;
--ndx-danger: #fb5b6b;
--ndx-info: #60a5fa;
```

## 13.2 Typography

- UI: Geist Sans, Inter, or IBM Plex Sans
- Code: JetBrains Mono or IBM Plex Mono
- Body: 16 px
- Secondary: 14 px minimum
- Card title: 18 px
- Section heading: 22–24 px
- Page heading: 28–32 px
- Large hero: 36–44 px

## 13.3 Radius

- Small controls: 8 px
- Cards: 12 px
- Large panels: 16 px
- Full overlays: 20 px

## 13.4 Motion

- Focus transition: 90–140 ms
- Modal transition: 160–220 ms
- Screen transition: 180–260 ms
- Overlay: 120–180 ms
- Reduced-motion mode: opacity and border only

## 13.5 Iconography

- Lucide-compatible outline language
- 2 px visual weight
- 20–24 px standard
- 28 px primary navigation
- Icons always accompanied by text on first use or ambiguous actions

---

# 14. Accessibility

## Required support

- Adjustable text scale
- High contrast
- Color-blind-safe status reinforcement
- Reduced motion
- Screen reader labels
- Read-current-screen command
- Subtitle/caption support
- Haptic adjustment
- Hold duration adjustment
- Repeat-rate adjustment
- Single-hand controller profile
- Remappable controls
- Voice input optional, never required

## Color rule

No status may rely only on color. Use icon, text, shape, or pattern reinforcement.

---

# 15. Performance Budgets

## Shell

- Initial focus response: under 100 ms
- Navigation input response: under 50 ms
- Screen transition: under 300 ms
- Quick overlay open: under 250 ms when warm
- Memory target for shell without heavy modules: under 500 MB
- Idle CPU target: under 2% average where practical

## Large modules

- Code editor and browser load lazily.
- Inactive browser tabs suspend.
- Local models are unloaded by profile rules.
- Background animations stop when hidden.
- Virtualization is required for long lists and logs.

---

# 16. Security Architecture

```text
User Intent
    ↓
Planner
    ↓
Structured Plan
    ↓
Policy Evaluation
    ↓
Permission Approval
    ↓
Typed Tool Invocation
    ↓
Deterministic Executor
    ↓
Validation
    ↓
Audit + Recovery
```

## Mandatory boundaries

- Renderer has no unrestricted shell access.
- Tools use typed schemas.
- Arguments are validated.
- Shell commands are escaped or executed without shell interpolation where possible.
- Network destinations are logged.
- Secrets are isolated.
- Tool output is treated as untrusted.
- Agents cannot grant themselves permissions.
- Plugin permissions are declared before installation.
- All important actions are auditable.

---

# 17. Suggested Front-End Architecture

```text
src/
├── app/
│   ├── shell/
│   ├── routing/
│   ├── providers/
│   └── startup/
├── features/
│   ├── home/
│   ├── ai/
│   ├── agents/
│   ├── workspaces/
│   ├── build/
│   ├── files/
│   ├── terminal/
│   ├── browser/
│   ├── workflows/
│   ├── models/
│   ├── learning/
│   ├── remote/
│   └── system/
├── controller/
│   ├── input/
│   ├── focus/
│   ├── haptics/
│   ├── mappings/
│   └── testing/
├── components/
│   ├── primitives/
│   ├── navigation/
│   ├── feedback/
│   ├── overlays/
│   └── data-display/
├── services/
│   ├── ipc/
│   ├── models/
│   ├── telemetry/
│   └── permissions/
└── styles/
    ├── tokens.css
    ├── typography.css
    └── motion.css
```

---

# 18. Typed IPC Domains

```text
workspace.*
agent.*
model.*
tool.*
permission.*
workflow.*
terminal.*
file.*
git.*
browser.*
remote.*
system.*
controller.*
recovery.*
notification.*
settings.*
```

Every IPC call should define:

- Request schema
- Response schema
- Error schema
- Permission requirement
- Cancellation support
- Timeout
- Audit behavior

---

# 19. Production QA Matrix

## Controller traversal

- Initial focus exists.
- Every control is reachable.
- No directional trap.
- Back behavior is correct.
- Modal focus is trapped.
- Focus restores correctly.
- Scroll follows focus.
- Disabled controls are skipped.
- Dynamic removal recovers focus.
- Virtualized lists retain focus.

## Resolution

Test at:

- 1280 × 800
- 1280 × 720
- 1920 × 1080
- 2560 × 1440
- 200% desktop scale
- 80% application scale where supported

## Input

- Steam Deck built-in controls
- Xbox controller
- DualSense
- Generic XInput
- Keyboard fallback
- Touchscreen fallback
- Controller disconnect/reconnect

## State

- Empty
- Loading
- Slow
- Offline
- Error
- Partial data
- Permission denied
- Model unavailable
- Core service restart
- Database recovery
- Low battery
- Thermal warning

## AI execution

- Plan preview
- Permission denial
- Tool failure
- Cancellation
- Timeout
- Partial success
- Rollback
- Model switch
- Network loss
- Secret redaction
- External-action confirmation

---

# 20. Definition of Controller-Complete

A feature is controller-complete only when:

- The full primary workflow is possible without mouse, touch, or keyboard.
- Every focus transition is deterministic.
- All actions have visible controller hints.
- Text entry has structured or predictive alternatives.
- Errors are recoverable by controller.
- Destructive actions cannot be triggered accidentally.
- The user can inspect what AI or automation will do.
- The user can pause or cancel active work.
- The user can return to Home and SteamOS.
- Automated tests cover navigation paths.
- Real hardware testing passes on Steam Deck.

---

# 21. Recommended Implementation Order

## Stage 1 — Foundation

- NDX shell
- Spatial focus engine
- Controller adapter
- Bottom hint rail
- Modal system
- Accessibility foundation
- Home
- Command palette
- Quick overlay prototype

## Stage 2 — Safe AI Runtime

- Model router
- AI Command Canvas
- Typed action plans
- Permission broker
- Approval queue
- Execution timeline
- Audit log
- Emergency stop

## Stage 3 — Workspaces and Tools

- Workspace Hub
- File Manager
- Terminal
- Git
- Recovery timeline
- Notifications
- System dashboard

## Stage 4 — Build Studio

- Code editor
- LSP
- Symbol navigation
- Diagnostics
- Predictive code input
- AI diff review
- Test runner

## Stage 5 — Workflows and Agents

- Agent Operations Center
- Workflow Library
- Workflow Forge
- Scheduling
- Checkpoints
- Reusable templates

## Stage 6 — Browser, Remote, and Learning

- Browser Hub
- Controller browser navigation
- Remote systems
- Guided labs
- AI coach
- Knowledge capture

## Stage 7 — Deep SteamOS Integration

- Game Mode behavior
- Quick Access integration
- Steam shortcut automation
- Power profiles
- Session resume
- Packaging
- Signed updates
- Crash recovery

---

# 22. Final Design Position

NeuroDeck OS should feel like:

- The clarity of a console dashboard
- The information power of an IDE
- The depth and focus behavior of tvOS
- The control transparency of a professional automation platform
- The safety of a permissioned operating harness

It must not feel like:

- A desktop window with giant buttons
- A generic chatbot sidebar
- A theme pasted over Linux utilities
- An AI agent with unrestricted shell access
- A mock dashboard with fake system readings
- A controller skin hiding mouse-first workflows

The product succeeds when a user can pick up the Steam Deck, navigate complex work, direct AI agents, inspect system impact, build software, operate remote machines, and recover from mistakes without ever reaching for a keyboard.
