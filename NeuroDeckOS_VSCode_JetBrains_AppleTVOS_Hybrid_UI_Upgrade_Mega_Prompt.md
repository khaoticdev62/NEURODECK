# NEURODECK OS

## 1:1 VS Code × JetBrains IDE × Apple tvOS Hybrid UI Upgrade Mega-Prompt

### Full Workbench Reconstruction, Controller-Native Spatial Interface, and Production Design System

> Use this prompt with Claude Code, Gemini CLI, Kimi Code, Codex, Cursor, or another repository-aware implementation agent.
>
> This prompt targets the existing NeuroDeckOS Electron + React + TypeScript + Tailwind codebase. Preserve all production integrations, controller behavior, IPC contracts, security controls, routes, persistence, and real data connections.

---

# MASTER DIRECTIVE

Act as the principal product designer, design systems architect, senior Electron engineer, senior IDE UX architect, controller-interface specialist, accessibility engineer, motion designer, performance engineer, and visual QA lead.

Execute a complete NeuroDeckOS UI reconstruction into a coherent **VS Code × JetBrains IDE × Apple tvOS hybrid operating environment**.

The result must combine:

- **VS Code:** workbench geometry, Activity Bar, Primary Side Bar, Secondary Side Bar, editor groups, tab model, integrated panel, command palette, breadcrumbs, minimap, sticky scroll, file explorer, search, source control, run/debug, extensions, terminal, and workspace restoration
- **JetBrains IDE:** project/VCS/run widgets, tool-window stripes, tool-window behavior, inspection visibility, professional settings organization, navigation intelligence, context actions, run configurations, refactor surfaces, status widgets, structured dialogs, and dense developer tooling
- **Apple tvOS:** spatial focus, depth, expansion, parallax restraint, lockup behavior, polished transitions, cinematic surfaces, controller feedback, safe spacing around focused items, layered presentation, clear selection, and content-first navigation
- **NeuroDeckOS:** AI actions, agents, permissions, workflows, model routing, Steam Deck controls, system services, platform identity, safety, recovery, and offline operation

This is not a cosmetic reskin. Reconstruct the shell architecture, workbench layout, navigation, tool windows, editor chrome, controller focus language, information hierarchy, design tokens, typography, motion, components, states, responsive behavior, accessibility, visual testing, performance, and documentation.

Do not stop at concepts or static mockups. Inspect the repository, implement the system, migrate screens, run tests, capture comparisons, repair regressions, and provide evidence.

---

# 1. HYBRID OWNERSHIP MODEL

The three inspiration systems must not be mixed randomly.

| System      | Owns                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code     | Workbench geometry, Activity Bar, sidebars, editor groups, tabs, panels, command palette, explorer/search/source-control structure, workspace state     |
| JetBrains   | Main toolbar intelligence, project/VCS/run widgets, tool-window stripes, inspections, refactor affordances, settings organization, professional density |
| Apple tvOS  | Focus visuals, selected-item expansion, elevation, depth, motion, controller press feedback, cinematic overlays, card lockups, spatial transitions      |
| NeuroDeckOS | AI actions, agents, permissions, workflows, model routing, Steam Deck controls, system services, safety, recovery                                       |

## 1.1 Fidelity rule

“1:1 hybrid” means:

- Preserve the recognizable structural logic of each source system in the subsystem it owns.
- Do not copy proprietary logos, icons, artwork, sounds, brand names, or protected assets.
- Do not reproduce one complete product shell and merely recolor it.
- Use NeuroDeckOS names, icons, colors, controller glyphs, and product identity.
- Resolve conflicts through the ownership table.

## 1.2 Conflict rules

- VS Code compact workbench + tvOS expanded focus: keep compact resting geometry; apply temporary focus elevation without layout reflow.
- JetBrains dense toolbar + limited Steam Deck space: use a compact toolbar with controller-expandable widgets.
- tvOS cards + IDE density: reserve large lockups for Home, apps, devices, workspaces, models, marketplace, learning, and media—not code rows or terminal output.
- Desktop hover: every hover affordance gets focus, controller, keyboard, and context-menu equivalents.
- Desktop drag-and-drop: retain optional drag but add controller move, split, pin, reorder, and resize commands.

---

# 2. NON-NEGOTIABLE PRODUCTION RULES

Do not:

- Replace real data with mocks
- Break IPC, routes, persistence, permissions, recovery, or controller navigation
- Remove loading, empty, error, offline, partial, or restricted states
- Add mouse-only, hover-only, right-click-only, or drag-only workflows
- Add decorative animations that reduce responsiveness
- Add heavy glass blur across the entire UI
- Copy brand assets
- Introduce multiple competing component libraries
- Hard-code layout values in feature screens
- Let feature code bypass design-system components
- Claim completion without screenshots and controller-traversal evidence

No screen is complete until it uses the new design system, has an initial focus target, is controller reachable, supports Back correctly, preserves real state, handles all required states, passes responsive/accessibility checks, and has screenshot/test evidence.

---

# 3. REPOSITORY AUDIT

Inspect:

- App shell, title bar, route registry, feature registry
- Tokens, Tailwind config, global CSS, themes
- Component primitives and variants
- Controller runtime and spatial focus engine
- Command palette and shortcut system
- Sidebars, panels, tool windows, editor groups
- Monaco, xterm, XYFlow, charts, tables, trees
- Explorer, search, Git, debug, extensions
- AI, agents, workflows, models, settings, system screens
- Modals, menus, notifications, action/status rails
- Storybook, Playwright, visual regression, accessibility tests
- Every ND, ND-X, ND-LAN, and later feature-specific screen

Search for:

```text
inline style
hardcoded color
magic number
transition-all
backdrop-blur
absolute
fixed
z-index
overflow-hidden
outline-none
hover-only
onMouseEnter
drag
TODO
FIXME
placeholder
mock
sample
demo
temporary
legacy
duplicate
```

Create:

```text
docs/ui/HYBRID_IDE_UI_UPGRADE_LEDGER.md
```

Track per screen: current layout, VS Code mapping, JetBrains mapping, tvOS mapping, issues, components, controller/accessibility/performance risk, before/after screenshots, tests, and remaining work.

---

# 4. TARGET EXPERIENCE

NeuroDeckOS must feel like:

- A real professional IDE
- A controller-native operating system
- A spatial AI workstation
- A Steam Deck-first development environment
- A polished appliance rather than a web dashboard
- One coherent platform rather than unrelated pages

Visual priority:

1. Active task
2. Current focus
3. Current workspace/project
4. Tool state
5. Contextual actions
6. System state
7. Decorative atmosphere

---

# 5. CANONICAL WORKBENCH

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ NDX TITLE / COMMAND BAR / PROJECT / VCS / RUN / AI / SYSTEM                 │
├──────┬───────────────────┬─────────────────────────────────┬─────────────────┤
│      │                   │                                 │                 │
│ ACT. │ PRIMARY TOOL      │ EDITOR / ACTIVE CONTENT         │ SECONDARY TOOL  │
│ BAR  │ WINDOW            │                                 │ WINDOW          │
│      │                   │                                 │                 │
├──────┴───────────────────┴─────────────────────────────────┴─────────────────┤
│ BOTTOM TOOL WINDOW: TERMINAL · PROBLEMS · OUTPUT · DEBUG · TASKS            │
├──────────────────────────────────────────────────────────────────────────────┤
│ STATUS BAR / CONTROLLER ACTION BAR                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Region ownership:

- Title/command bar: JetBrains project/VCS/run intelligence + VS Code command-center efficiency
- Activity Bar: VS Code structure with NeuroDeck destinations
- Primary Tool Window: VS Code sidebar + JetBrains Project behavior
- Editor Area: VS Code editor groups + JetBrains code intelligence
- Secondary Tool Window: VS Code secondary sidebar for AI/context/docs/inspectors
- Bottom Tool Window: VS Code Panel + JetBrains bottom tools
- Status/Action Bar: VS Code status density + NeuroDeck controller/safety
- Focus: Apple tvOS depth, elevation, expansion, and press feedback

---

# 6. STEAM DECK GEOMETRY

Primary target: `1280 × 800`.

```text
Title/Command Bar        44 px
Activity Bar             52 px
Primary Tool Window      240–288 px
Secondary Tool Window    280–336 px
Bottom Tool Window       180–300 px adjustable
Editor Tab Bar           36 px
Breadcrumb Bar           28 px
Status/Action Bar        40 px
Safe outer inset         8 px
Focus overflow reserve   4–8 px
```

Use semantic tokens, not scattered literals.

## 6.1 Compact mode

- Collapse Secondary Tool Window by default
- Keep Activity Bar visible
- Allow Primary Tool Window quick toggle
- Bottom panel opens at 35–42% height or as overlay
- Preserve at least 420 px editor width and 360 px height
- Use one-row tabs and compact breadcrumbs
- Show essential toolbar widgets only

## 6.2 Focus mode

Auto-collapse nonessential rails/panels while keeping active file, breadcrumbs, run/debug status, AI state, controller action bar, emergency stop, and critical alerts.

## 6.3 Docked mode

At 1920×1080 and 2560×1440 allow persistent dual sidebars, two or three editor groups, simultaneous bottom panel and side inspector, higher information density, and pointer/keyboard support without weakening controller traversal.

---

# 7. TITLE BAR AND COMMAND CENTER

Create a frameless Electron title/command bar:

```text
[Menu] [Project] [VCS] [Run/Debug] [Universal Search/Commands]
[AI Model/Profile] [Tasks] [Network] [Battery] [Window Controls]
```

## 7.1 Project widget

Show active workspace, repositories, environment, remote/local, switch, recent, create, and workspace health.

## 7.2 VCS widget

Show branch, dirty state, incoming/outgoing, sync, conflicts, fetch/pull/push, repository switch, protected-branch warning.

## 7.3 Run widget

Show configuration, target, Run, Debug, Stop, Restart, Test, process count, and failure state.

## 7.4 Universal command center

Search commands, files, symbols, workspaces, settings, agents, workflows, models, applications, devices, and documentation.

Prefixes:

```text
> commands
@ symbols in file
# workspace symbols
: line/column
? help
! tasks and alerts
/ settings and features
```

Controller: Menu opens; LB/RB changes category; A opens/runs; X actions; Y explains; R3 previews; B closes/restores focus.

---

# 8. ACTIVITY BAR

Destinations:

- Explorer
- Search
- Source Control
- Run and Debug
- Extensions
- AI
- Agents
- Workflows
- Models
- Applications
- Devices
- Remote
- System
- Settings

Rules:

- 52 px compact width
- 24 px icons
- 4 px active indicator
- Count badges
- Stable ordering with pin/reorder
- Extensions grouped below core tools
- Profile-aware visibility
- Focus label appears in adjacent overlay, not by changing rail width

On focus: 1.06 icon-container scale, luminance increase, restrained violet halo, 2–3 px optical lift, light haptic tick, no bounce.

Selection remains visible after focus leaves.

---

# 9. TOOL-WINDOW STRIPES

Implement JetBrains-inspired left/right tool-window stripes where useful:

- Compact buttons
- Pin/auto-hide
- Move left/right/bottom
- Restore size
- Badge state
- Active title
- Controller cycling

Avoid redundant Activity Bar and stripe entries unless roles differ.

---

# 10. PRIMARY TOOL WINDOW

Views: Explorer, Search, Source Control, Run/Debug, Extensions, Project, Favorites, Remote.

Every header includes title, scope, collapse, pin, More, filter/search, status, and controller hints.

Sizing:

- Minimum 208 px
- Preferred 256 px
- Maximum 38% window
- Snap presets
- Controller resize mode
- Workspace persistence
- Auto-collapse if editor minimum is threatened

Use solid surfaces, 1 px separators, compact sections, and focus lift without tree reflow.

---

# 11. EXPLORER / PROJECT TOOL WINDOW

Fuse VS Code Explorer and JetBrains Project view.

Sections:

- Open Editors
- Project Files
- Outline
- Timeline/Local History
- Dependencies
- Favorites
- Workspace Roots

Rows show file/folder icon, name, Git state, diagnostics, modified marker, sync, lock/read-only, running task, and context actions.

Controller:

- D-pad tree movement
- A open/expand
- X context
- Y explain
- L3 favorite
- R3 preview
- R4 AI actions
- R5 run target
- LB/RB sections
- LT/RT tree/editor

Provide controller alternatives for create, rename, copy, move, duplicate, delete, reveal, terminal here, compare, share, and AI context.

---

# 12. SEARCH TOOL WINDOW

Support search/replace, regex, case, whole word, include/exclude, project/module/open-files/Git-changed scopes, grouped results, preview, review-before-replace, history, and saved searches.

Virtualize results and preserve focus IDs. R3 previews; A opens; X actions; Y explains; R5 replaces only after review.

---

# 13. SOURCE CONTROL TOOL WINDOW

Sections:

- Changes
- Staged
- Conflicts
- Repositories
- Commits
- Branches
- Stashes/Shelves
- Pull requests when integrated

Support diff summary, stage/unstage, discard with recovery, commit checks, branch protection, sync, multi-repo, change lists, local history, AI commit assistance, and controller-selectable hunks.

Commit and Push require separate review.

---

# 14. RUN AND DEBUG

Sections: Configurations, Variables, Watch, Call Stack, Breakpoints, Debug Console, Tests, Coverage, Processes.

Toolbar: Run, Debug, Stop, Restart, Step Over/Into/Out, Continue, Breakpoint.

Use dense professional rows rather than large dashboard cards.

---

# 15. EXTENSIONS

Views: Installed, Enabled, Disabled, Updates, Recommended, Marketplace, Quarantined, Incompatible.

Cards show name, publisher, signature, version, permissions, compatibility, controller-ready badge, offline capability, update, and health.

Installation uses a structured review dialog with strong tvOS focus and no one-click permission bypass.

---

# 16. EDITOR AREA

Support single editor, split right/down, 2×2 docked grid, side-by-side diff, three-way merge, editor+preview, editor+AI, and editor+terminal.

Use a restrained active-group border, active tab emphasis, focus indicator, pane title, and controller pane index. Do not glow the whole editor heavily.

Controller group actions: focus, split, close, move/copy tab, maximize, restore, save layout preset.

---

# 17. EDITOR TABS

Tab anatomy: icon, name, dirty/read-only, diagnostics, Git, pin, close, preview.

Rules:

- 34–36 px height
- One row at 1280×800
- Horizontal controller scroll
- Optional compact pinned tabs
- Overflow menu
- MRU switcher
- Focus and active distinct
- Unsaved state not color-only
- Close never default controller action

Focus uses 1–2 px lift and compact halo without reflow.

---

# 18. BREADCRUMBS

Show:

```text
Workspace > Folder > File > Class > Method
```

Support file/symbol path, branch/remote context, controller navigation, overflow compression, documentation, usages, implementations, and tests. Height: 28 px.

---

# 19. MONACO VISUAL SYSTEM

Generate NeuroDeck Monaco themes for background, selection, cursor, line highlight, gutter, line numbers, indent guides, brackets, whitespace, find, diagnostics, diffs, inlay hints, code lens, sticky scroll, minimap, suggest/hover/parameter widgets.

Use restrained semantic syntax colors for keywords, types, functions, variables, strings, numbers, comments, constants, properties, tags, attributes, and operators.

Enable and style sticky scroll, minimap, breadcrumbs, code lens, inlay hints, folding, bracket guides, peek, docs, completion, refactors, diff/merge, inline AI, and inline problems.

Every popup must be controller navigable and dismissible with B.

---

# 20. JETBRAINS-STYLE CODE INTELLIGENCE

Surface intention actions, quick fixes, refactors, inspection severity, usages, implementations, tests, type/call hierarchy, Structure, documentation, and run-gutter actions.

Top-right inspection widget shows errors, warnings, analysis progress, code health, and current-file state. A opens scoped Problems; Y explains; X controls inspections.

---

# 21. SECONDARY TOOL WINDOW

Uses: AI, agent context, documentation, outline, inspector, preview, model/tool details, permissions, metadata.

The AI panel uses Intent, Context Sources, Plan, Active Tool, Changes, Approvals, Output, and Next Actions—not endless chat bubbles.

It must show what context is shared, model/provider, privacy scope, context budget, and source-removal controls.

---

# 22. BOTTOM TOOL WINDOW

Tabs:

- Problems
- Terminal
- Output
- Debug Console
- Tests
- Coverage
- Tasks
- Logs
- Downloads
- Transfers
- Agents
- Workflow Runs

Support controller open/close, snap heights, maximize, move to side, optional docked detach, last-tab persistence, counts, and no focus stealing from background output.

---

# 23. TERMINAL

Terminal chrome shows sessions, shell, host, workspace, path, branch, exit code, safety, new/split/kill, search, and input mode.

Rules:

- 14–16 px monospace
- Strong cursor
- Safe ANSI palette
- Opaque by default
- Active-pane edge, not card glow
- Scroll indicator
- Suggestions never cover prompt
- Direct, Command Builder, Intent, History, Remote, Split modes

---

# 24. COMMAND BUILDER

Blocks: Program, Subcommand, Flag, Value, Path, Pipe, Redirect, Environment, Conditional.

Always show exact command, risk, directory, host, environment, permission, explanation, Save as Task, and Run. R5 cannot execute before the command is visible.

---

# 25. AI COMMAND CANVAS

Layout:

```text
Intent | Plan Steps | Scope/Impact
       | Tool Calls | Permissions
       | Validation | Recovery
```

Each step: number, name, tool, scope, risk, dependency, status, edit, explain.

Execution morphs into a timeline without route change. Use tvOS depth only for approvals and current-step emphasis.

---

# 26. AGENTS

Cards show name, role, workspace, model, current step, status, permission ceiling, resource use, and last event.

Details use tabs: Overview, Timeline, Files, Tools, Permissions, Logs, Output, Recovery. Avoid giant avatar cards.

---

# 27. WORKFLOW FORGE

Node system: header by type, title, status, inputs, outputs, risk, permission, validation, error, controller-port focus.

Canvas: subtle grid, optional minimap, zoom, selection, Secondary Tool Window inspector, execution overlay, dry run, controller pan/zoom, non-drag movement.

Focused node may lift without visually breaking edge geometry.

---

# 28. HOME / DASHBOARD

Use tvOS-heavy hierarchy.

Top shelf:

- Resume workspace
- Continue task
- Approval required
- System warning

Rows:

- Recent workspaces
- Running agents
- Quick tools
- Workflows
- Recent outputs
- Devices/apps
- System health

Rules: one dominant hero, horizontal focus rows, clear titles, focus expansion, scroll centering, no autoplay, no oversized decorative art, real data only.

---

# 29. APPLICATION / DEVICE / MODEL GRIDS

Use tvOS lockups for applications, extensions, models, devices, learning, workspaces, marketplace, and media.

Anatomy: artwork/icon, title, subtitle, status, badge, focused actions.

Focus: 1.04–1.08 scale, controlled shadow, violet edge, optional subtle tilt, caption brightening, no overlap, focused-card centering. Disable tilt in reduced motion.

---

# 30. SETTINGS

JetBrains structure:

```text
Category Tree | Settings Editor | Context/Help
```

Support search, categories, global/profile/workspace scope, modified indicators, Reset, Apply, restart requirement, policy source, inherited value, preview, export/import.

Rows: label, description, control, current/inherited marker, validation, help, reset.

Do not wrap every toggle in a giant card. Group dependent controls and explain disabled states.

---

# 31. DIALOGS AND MODALS

Types: Information, Confirmation, Critical, Permission, Input, Picker, Install Review, Diff Review, Error Recovery, Progress.

Rules:

- 560–760 px preferred width at 1280×800
- Clear title and consequence
- Grouped controls
- Primary + Cancel
- Focus trap and restoration
- Avoid deep modal stacks
- Background dim + subtle recession
- No excessive blur

Critical actions require target, consequence, recovery, hold-to-confirm, heavy haptic, and no preselected destructive action.

---

# 32. CONTEXT MENUS

Use concise JetBrains-style menus with relevant actions first, grouped separators, controller glyphs, disabled reasons, minimal submenus, destructive last, searchable More Actions, safe-area positioning, and focus restoration.

X opens context actions universally.

---

# 33. NOTIFICATIONS

Use nonmodal professional notifications:

- Do not steal focus
- Group repeats
- Persist approvals in Activity
- Respect game/presentation/quiet modes
- Link to source
- Keep compact
- Use information/success/warning/error/approval/security/task categories

---

# 34. STATUS + CONTROLLER ACTION BAR

Left: remote/local, branch, sync, errors/warnings, task.

Center: mode, controller layer, AI/model, run state.

Right: language, encoding, line ending, position, network, battery, time.

At 1280×800 show essentials and place overflow in Status Details.

Adaptive action hints:

```text
[A] Open  [B] Back  [X] Actions  [Y] Explain  [R4] AI  [R5] Run
```

---

# 35. tvOS FOCUS SYSTEM

States:

```text
resting
pointer-hover
controller-focus
selected
active
pressed
move
disabled
attention
critical
```

## Spatial cards

- Scale 1.04–1.08
- Optical Z via shadow
- 2 px inner edge
- 4–8 px halo
- Caption reveal
- Optional 1–2° tilt
- Haptic tick

## Dense IDE rows

- Scale 1.00–1.015 max
- Strong surface shift
- 2 px edge
- Left indicator
- No height change

## Toolbar buttons

- Scale 1.05
- Bright icon
- Label when ambiguous
- Press 0.96–0.98

## Editor pane

- Active border
- Subtle ambient glow
- No content scaling

Reserve focus overflow. Never cover adjacent text, controls, tabs, scrollbars, critical status, or edges.

Focus is temporary; selection is persistent. Use focus halo, selected tint/check, active marker, and pressed compression distinctly.

---

# 36. DEPTH AND PARALLAX

Depth classes:

```text
flat     editor rows, terminal, tables
raised   panels, settings, tool cards
spatial  dashboard lockups, app/model/device cards
```

Parallax only on spatial cards, subtle, stick-driven, spring-controlled, disabled in reduced motion and rapid navigation. Never use on editor, terminal, logs, tables, or dialogs.

---

# 37. MOTION

```text
Focus enter/exit      90–140 ms
Press                 70–110 ms
Popover               120–170 ms
Tool window           140–210 ms
Panel resize          120–180 ms
Modal                 170–230 ms
Route                 180–260 ms
Workspace switch      220–320 ms
Dashboard row scroll  180–280 ms
```

No bounce-heavy springs, input blocking, continuous floating, animated gradients, particles, huge blur transitions, or large-tree layout animation.

Reduced motion removes tilt/scale as needed and uses border/opacity.

---

# 38. DESIGN TOKENS

Create `packages/ui/src/tokens`.

```css
:root {
  --ndx-canvas-0: #07080c;
  --ndx-canvas-1: #0b0d13;
  --ndx-surface-0: #0f1219;
  --ndx-surface-1: #141821;
  --ndx-surface-2: #1a1f2b;
  --ndx-surface-3: #222938;
  --ndx-surface-4: #2b3447;
  --ndx-border-subtle: #262d3d;
  --ndx-border-default: #343d52;
  --ndx-border-strong: #4b5872;
  --ndx-text-primary: #f4f6fb;
  --ndx-text-secondary: #b7bfce;
  --ndx-text-muted: #7d8799;
  --ndx-text-disabled: #555d6d;
  --ndx-accent: #8b5cf6;
  --ndx-accent-bright: #a78bfa;
  --ndx-accent-soft: #6f4bd4;
  --ndx-focus: #b99cff;
  --ndx-success: #46d987;
  --ndx-warning: #f2bd4b;
  --ndx-danger: #f06474;
  --ndx-info: #5fa8f5;
}
```

Create semantic aliases for workbench, editor, sidebar, panel, toolbar, tabs, focused row/card, pane borders, active pane, focus ring/glow, code text, and statuses. Feature code must not use raw palette values.

Spacing: `0 2 4 6 8 12 16 20 24 32 40 48`.

Radius:

```text
2 px editor details
4 px dense rows
6 px buttons/inputs
8 px panels
12 px cards
16 px spatial lockups
20 px hero/modal
```

Define semantic shadows and z-index scale. No random z-index.

---

# 39. TYPOGRAPHY

UI: Inter Variable, Geist, or approved UI font.
Code: JetBrains Mono Variable or IBM Plex Mono.

```text
12 px only nonessential docked metadata
13 px compact metadata
14 px default IDE UI
15 px comfortable IDE UI
16 px body/dashboard
18 px card title
20 px section title
24 px page title
32 px hero
```

Steam Deck UI and code default: 14–16 px. Use tabular numerals for metrics and monospace for code, paths, commands, logs, hashes, IDs. Support scaling without clipping.

---

# 40. ICONS

Use one `NdxIcon` registry. No mixed families or copied proprietary icons.

```text
16 px dense actions
18–20 px tool controls
22–24 px Activity Bar
28–32 px dashboard cards
```

Provide active, disabled, status, and text-labeled ambiguous variants.

---

# 41. COMPONENT SYSTEM

Implement/refactor:

```text
NdxWorkbench
NdxTitleBar
NdxCommandCenter
NdxProjectWidget
NdxVcsWidget
NdxRunWidget
NdxActivityBar
NdxToolWindowStripe
NdxToolWindow
NdxEditorGroup
NdxEditorTabs
NdxEditorTab
NdxBreadcrumbs
NdxBottomPanel
NdxStatusBar
NdxControllerActionBar
NdxFocusSurface
NdxSpatialLockup
NdxDenseRow
NdxToolbarButton
NdxIconButton
NdxSplitPane
NdxTree
NdxVirtualList
NdxTable
NdxSearchBox
NdxCommandPalette
NdxContextMenu
NdxPopover
NdxDialog
NdxCriticalDialog
NdxPermissionDialog
NdxNotification
NdxStatusBadge
NdxInspectionBadge
NdxProgress
NdxTimeline
NdxEmptyState
NdxLoadingState
NdxErrorState
NdxOfflineState
NdxRestrictedState
NdxDiffViewer
NdxLogViewer
NdxTerminalFrame
NdxMonacoFrame
NdxWorkflowNode
NdxDashboardRow
NdxCardLockup
NdxSettingsTree
NdxSettingRow
NdxControllerHint
NdxGlyph
```

Feature code must not recreate these locally.

---

# 42. VARIANTS

```ts
type FocusDensity = 'dense' | 'comfortable' | 'spatial'
type SurfaceTone = 'canvas' | 'tool' | 'editor' | 'raised' | 'critical'
type InteractionState = 'rest' | 'focused' | 'selected' | 'active' | 'pressed' | 'disabled'
```

Use class-variance-authority or equivalent. Remove duplicated class strings.

---

# 43. THEMES

Required:

- NeuroDeck Hybrid Dark
- OLED Black
- High Contrast Dark
- Reduced Transparency
- Docked Dense
- Large Text

Theme controls: workbench/editor/syntax colors, focus intensity, motion, radius, transparency, density, icons, fonts.

Do not create novelty themes before the core passes QA.

---

# 44. SCREEN FUSION RATIOS

## IDE-heavy

70% VS Code / 25% JetBrains / 5% tvOS:
Build Studio, Editor, Terminal, Git, Diagnostics, Run/Debug, Files, Search, Logs.

## Tool-heavy

45% VS Code / 40% JetBrains / 15% tvOS:
Agents, Workflows, Models, Extensions, Settings, System, Permissions, Devices, Recovery.

## Dashboard-heavy

25% VS Code / 20% JetBrains / 55% tvOS:
Home, Workspaces, Applications, Learning, Model Library, Device Center, Marketplace, Media, Quick Access.

## Critical flows

35% JetBrains structure / 35% NeuroDeck safety / 30% tvOS focus:
Approvals, permissions, install review, destructive confirmation, incoming transfers, restore, updates, security.

---

# 45. UI STATES

Implement:

```text
default focused selected active pressed disabled loading empty partial offline
restricted warning error critical success stale syncing paused queued running
completed cancelled
```

No state relies on color alone.

---

# 46. LOADING, EMPTY, ERROR

Loading: workbench-shaped skeletons, stable geometry, partial data, real progress, cancel, timeout/retry, offline alternative. No generic full-page infinite spinner.

IDE empty states: compact, task-oriented, command + controller shortcut, no huge illustration.

Dashboard empty states: restrained icon/art, explanation, primary action, import/discover, Help.

Errors: plain summary, technical code, scope, what works, recovery, alternative, logs, correlation ID, Back/Home. Use banners/tool messages before modal interruption.

---

# 47. RESPONSIVE TEST MATRIX

```text
1280×800
1280×720
1920×1080
2560×1440
large text
high contrast
reduced motion
touch fallback
keyboard/mouse
controller
```

At small height: compress breadcrumbs/labels, keep status/actions, overlay bottom panel, preserve editor minimum.

At docked widths: add tool windows/editor groups, expand context, increase density rather than simply scaling everything.

---

# 48. ACCESSIBILITY

Require WCAG contrast, visible focus, semantic roles, screen-reader labels, reading order, status/progress announcements, large text, reduced motion, high contrast, color-independent states, remappable/single-hand controller, haptic controls, modal trapping, no timed-only decisions, keyboard support, and text alternatives.

Focus effects must remain clear when scale and motion are disabled.

---

# 49. PERFORMANCE

```text
Controller response  < 50 ms
Focus transition     < 140 ms
Route transition     < 300 ms
Command palette      < 150 ms warm
Tool window          < 180 ms warm
Quick overlay        < 250 ms warm
Idle shell CPU       near 2% or lower where practical
```

Use lazy routes and lazy Monaco/xterm/XYFlow/ECharts, virtualized trees, stable selectors, bounded metrics, CSS variables, throttled observers, and proper disposal. No full-app rerender on focus or metrics.

---

# 50. CSS / TAILWIND

Remove raw colors, repeated arbitrary values, `transition-all`, excessive blur, inconsistent radii, z-index chaos, viewport hacks, negative-margin repairs, global overrides, focus removal, and duplicate variants.

Create semantic utilities:

```text
ndx-surface-editor
ndx-surface-tool
ndx-focus-dense
ndx-focus-spatial
ndx-pane-active
ndx-row-selected
ndx-status-warning
ndx-scrollbar
ndx-titlebar-drag
ndx-titlebar-no-drag
```

---

# 51. ELECTRON CHROME

Implement frameless title bar, drag/no-drag regions, window controls, double-click maximize where appropriate, fullscreen/Game Mode, docked mode, safe focus after restore, and no drag area over controls.

---

# 52. CONTROLLER INPUT LAYERS

```text
global
workbench
editor-navigation
editor-edit
terminal
tree
table
dialog
command-palette
workflow-canvas
dashboard
settings
```

Show the active layer in the status bar and provide a controller cheat sheet everywhere. Never switch contexts invisibly.

---

# 53. HAPTICS AND AUDIO

Haptics: focus tick, boundary tick, select pulse, warning, critical hold, success, invalid pattern.

Audio: original, subtle, optional, user-adjustable, quiet/game/presentation aware. Do not copy source-product sounds.

---

# 54. VISUAL QA

Capture every screen and core component at all target resolutions and states.

Naming:

```text
<screen-id>__<resolution>__<theme>__<state>.png
```

Review clipping, focus overflow, tool overlap, tab overflow, text wrapping, contrast, layout shift, z-index, pane minimums, controller hints, modal sizing, dashboard spacing, focus overlap, and IDE density.

---

# 55. CONTROLLER QA

For every route verify initial focus, complete reachability, no dead ends, Back, modal trap, focus restore, pane/tool/editor switching, action-bar updates, disabled skip, dynamic removal, virtualized focus, resize, command palette, context menus, large text, and docked mode.

Use semantic controller events, never mouse clicks, for controller-completeness tests.

---

# 56. STORYBOOK / COMPONENT WORKSHOP

Create stories for tokens, focus densities, all states, workbench, tool windows, tabs, trees, panels, bars, dialogs, notifications, lockups, Monaco widgets, terminal, workflow nodes, settings, high contrast, large text, and reduced motion.

No secrets or unrestricted IPC.

---

# 57. IMPLEMENTATION PHASES

```text
HYBRID-0 Audit and baseline
HYBRID-1 Tokens and themes
HYBRID-2 Shared primitives
HYBRID-3 Workbench shell
HYBRID-4 IDE views and Monaco/xterm
HYBRID-5 AI, agents, workflows, models, system tools
HYBRID-6 tvOS dashboards, apps, devices, workspaces, marketplace
HYBRID-7 Settings and critical flows
HYBRID-8 Responsive and accessibility
HYBRID-9 Visual, controller, performance validation
```

---

# 58. ACCEPTANCE GATES

## Workbench

- VS Code region logic complete
- JetBrains widgets/tool windows complete
- tvOS focus applied by density class
- Editor dominant
- Tool-window state persists
- Controller resize works
- Unified command center works

## Design system

- No raw feature colors
- Typography, spacing, focus, radius, motion, and icons consistent
- Themes pass
- Components centralized

## Controller

- Every route controller complete
- No hover-only or drag-only action
- No focus trap or clipping
- Back restores
- Monaco/xterm/popups reachable

## Visual

- Every screen category migrated
- Dashboard and IDE densities differ but remain coherent
- No excessive glow/glass
- No copied brand assets
- Steam Deck, 720p, docked, large text, high contrast pass

## Quality

- Typecheck, lint, unit/component, Playwright, accessibility, and visual tests pass
- Performance budgets pass or are documented
- No production mocks, broken IPC, dead routes, or critical runtime errors

---

# 59. FINAL REPORT

Provide:

1. Executive summary
2. Fidelity matrix: VS Code / JetBrains / tvOS / NeuroDeckOS
3. Workbench architecture
4. Design-token inventory
5. Component inventory
6. Screen migration matrix
7. Controller matrix
8. Before/after screenshot index
9. Accessibility report
10. Responsive report
11. Performance report
12. Test results
13. Remaining issues
14. File-change summary

---

# FINAL AGENT DIRECTIVE

Read the repository and all NeuroDeckOS specifications first.

Audit before editing. Assign every pattern to the correct source system. Build the semantic design system. Reconstruct the workbench. Implement VS Code geometry, JetBrains professional tooling, Apple tvOS spatial focus, and NeuroDeckOS platform behavior without producing a confused mashup.

Migrate every screen, state, overlay, editor, terminal, tool window, and dashboard. Preserve real integrations. Test controller behavior and visual fidelity at actual Steam Deck dimensions.

Do not stop at Home, Settings, or showcase screens. Do not claim “1:1” from screenshots alone.

Deliver a production-grade hybrid IDE operating interface.
