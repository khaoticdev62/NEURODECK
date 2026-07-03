# NEURODECK OS

## Supreme UI Enhancement, Refinement, and Visual Systems Mega-Prompt

### Controller-First AAAA-Grade Interface Upgrade for the Full NeuroDeckOS Platform

> Use this prompt with Claude Code, Gemini CLI, Kimi Code, Codex, Cursor, or another repository-aware coding agent.
>
> This prompt assumes the repository already includes or is being built from:
>
> - `NeuroDeck_OS_Controller_Wireframe_Spec.md`
> - `NeuroDeck_OS_Production_Implementation_Mega_Prompt.md`
> - `NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md`
>
> The goal is to elevate the existing NeuroDeckOS interface into a visually unified, high-fidelity, controller-native operating platform without breaking architecture, workflows, routes, IPC, focus behavior, performance, security, or production integrations.

---

# MASTER DIRECTIVE

You are the principal UI systems architect, senior product designer, senior Electron front-end engineer, Steam Deck UX specialist, design systems lead, motion designer, accessibility engineer, performance engineer, and visual QA lead responsible for executing a complete NeuroDeckOS interface enhancement pass.

Your mission is to:

- Audit every existing screen, overlay, modal, panel, rail, card, list, input, editor surface, workflow canvas, terminal surface, browser surface, settings surface, and system utility.
- Repair visual drift, layout inconsistency, weak hierarchy, controller focus problems, clutter, dead space, poor spacing, weak empty states, unreadable text, duplicate patterns, and unfinished components.
- Upgrade the full interface into a cohesive, premium operating-system experience.
- Preserve all existing production behavior and real data connections.
- Preserve controller navigation, focus restoration, routes, IPC contracts, permissions, audit, recovery, and accessibility behavior.
- Avoid unnecessary rewrites when a shared design-system refactor is safer.
- Avoid decoration that harms performance, legibility, controller clarity, or battery life.
- Validate every change at Steam Deck resolution and docked resolutions.
- Produce evidence through screenshots, controller traversal, visual regression, accessibility tests, and performance measurements.

Do not stop after proposing concepts or creating static mockups.

Inspect, refactor, implement, test, compare, repair, and validate.

---

# 1. DESIGN TARGET

NeuroDeckOS should feel like a premium fusion of:

- Apple tvOS spatial depth and focus behavior
- SteamOS controller-native clarity
- VS Code information architecture
- High-end automotive interfaces
- Modern operating-system utility panels
- Professional creative-tool density
- AI-native contextual assistance
- Console-grade interaction predictability

The interface must not feel like:

- A web dashboard stretched onto a Steam Deck
- A mobile UI enlarged for desktop
- A generic admin panel
- A chatbot with sidebars
- A glowing cyberpunk theme pack
- A glassmorphism template
- A collection of unrelated feature pages
- A desktop application that secretly requires a mouse
- A prototype with oversized empty cards
- A design showcase that sacrifices readability or speed

---

# 2. VISUAL IDENTITY

## 2.1 Core direction

Use a dark, cinematic, modern, restrained visual system built around:

- Deep black and midnight surfaces
- Rich neutral layers
- Ultraviolet accents
- Controlled light bloom
- Solid panel construction
- Strong focus contrast
- Calm spacing
- Crisp typography
- Layered depth
- Limited translucency
- Smooth but efficient motion
- Clear state visibility
- Strong controller affordances

## 2.2 Personality

The interface should feel:

- Intelligent
- Precise
- Confident
- Fast
- Technical
- Calm
- Powerful
- Personal
- Secure
- Controller-native

It should never feel:

- Chaotic
- Noisy
- Fragile
- Toy-like
- Over-gamified
- Over-animated
- Over-glassed
- Inconsistent
- Crowded without structure
- Minimal to the point of hiding necessary information

---

# 3. ABSOLUTE NON-NEGOTIABLES

## 3.1 No functional regression

Do not:

- Remove routes.
- Break IPC.
- Replace real data with demo data.
- Remove loading, error, offline, partial, or restricted states.
- Break controller navigation.
- Break focus restoration.
- Break keyboard fallback.
- Remove permission prompts.
- Hide required system state.
- Break SteamOS packaging.
- Break accessibility labels.
- Break automation, agent, transfer, or recovery timelines.
- Break terminal, editor, browser, workflow, package, model, or device interactions.

## 3.2 No visual-only fake behavior

Do not add:

- Fake metrics
- Fake model state
- Fake downloads
- Fake tasks
- Fake notifications
- Fake devices
- Fake focus
- Fake success states
- Fake package status
- Fake permissions
- Placeholder charts presented as live data
- Decorative buttons without real actions

## 3.3 No design drift

Every screen must use the same:

- Token system
- Elevation logic
- Focus logic
- Spacing grammar
- Typography hierarchy
- Status language
- Controller hint grammar
- Panel framing
- Motion timing
- State components
- Modal behavior
- Icon system

## 3.4 No mouse-first shortcuts

No enhanced workflow may depend on:

- Hover-only discovery
- Tooltips as the sole label
- Right-click without a controller equivalent
- Drag-and-drop without a controller alternative
- Tiny hit targets
- Invisible focus
- Pointer-only resizing
- Mouse-only canvas controls
- Scrollbars as the only scroll affordance
- Hidden actions revealed only by cursor movement

---

# 4. REPOSITORY AUDIT BEFORE VISUAL CHANGES

Before modifying UI code, inspect:

- Screen registry
- Route registry
- Feature registry
- Design tokens
- Tailwind theme
- Global CSS
- Component library
- Primitive components
- Focus engine
- Controller input runtime
- Action rail
- System rail
- Navigation rail
- Context panel
- Modal system
- Toast system
- Error boundaries
- Loading skeletons
- Empty states
- Accessibility utilities
- Responsive utilities
- Motion library
- Theme provider
- Existing screenshots
- Playwright tests
- Visual regression tests
- Component preview environment

Search for:

```text
hardcoded colors
inline styles
magic numbers
duplicate components
temporary layouts
absolute positioning
overflow hidden
z-index
min-width
max-width
height: 100vh
hover:
focus:
focus-visible:
outline: none
transition-all
backdrop-blur
opacity
scale
TODO
FIXME
placeholder
mock
demo
sample
```

Classify each finding as:

- Correct
- Inconsistent
- Unsafe
- Redundant
- Dead
- Accessibility issue
- Controller issue
- Performance issue
- Responsive issue
- Visual polish issue

Create:

```text
docs/ui/NEURODECK_UI_ENHANCEMENT_LEDGER.md
```

Track:

- Screen ID
- Existing problems
- Planned changes
- Shared component impact
- Controller impact
- Accessibility impact
- Performance impact
- Before screenshot
- After screenshot
- Test evidence
- Remaining risk

---

# 5. FULL SCREEN COVERAGE

Apply this enhancement pass to:

- ND-001 through ND-056
- ND-X001 through ND-X070
- Every route added later through the Feature Registry
- Every overlay
- Every modal
- Every drawer
- Every context panel
- Every radial menu
- Every command palette
- Every settings surface
- Every onboarding surface
- Every empty state
- Every loading state
- Every error state
- Every offline state
- Every restricted state
- Every safe-mode view
- Every developer-mode view
- Every docked layout
- Every split-pane layout
- Every fullscreen state

Do not polish only Home, AI, Terminal, and Settings while leaving utility screens unfinished.

---

# 6. DESIGN SYSTEM RECONSTRUCTION

Refactor the design system into explicit semantic layers.

## 6.1 Token categories

Implement:

```text
color.background
color.surface
color.surfaceElevated
color.surfaceInteractive
color.surfaceSelected
color.surfaceCritical
color.border
color.borderStrong
color.focus
color.focusGlow
color.textPrimary
color.textSecondary
color.textMuted
color.textInverse
color.accent
color.accentSoft
color.success
color.warning
color.danger
color.info

space.0-12
radius.xs-sm-md-lg-xl
shadow.low-medium-high-focus
blur.low-medium
motion.fast-normal-slow
motion.focus-modal-route-overlay
opacity.disabled-muted-overlay
size.controllerTarget
size.navigationRail
size.systemRail
size.actionRail
size.contextPanel
size.modal
```

## 6.2 Semantic use

Feature code must not use raw palette values directly.

Use semantic variables such as:

```css
--ndx-bg-canvas
--ndx-bg-surface
--ndx-bg-surface-hover
--ndx-bg-surface-focus
--ndx-border-default
--ndx-border-strong
--ndx-text-primary
--ndx-text-secondary
--ndx-text-disabled
--ndx-focus-ring
--ndx-focus-glow
--ndx-status-success
--ndx-status-warning
--ndx-status-danger
--ndx-accent-primary
```

## 6.3 Theme modes

Support:

- Default dark
- High-contrast dark
- OLED black
- Docked high-density
- Reduced transparency
- Reduced motion
- Accessibility large text

Do not prioritize novelty themes over core consistency.

---

# 7. COLOR SYSTEM

Recommended foundation:

```text
Canvas Black        #08090D
Canvas Navy         #0B0D14
Surface 1           #11141D
Surface 2           #171B26
Surface 3           #1E2432
Surface 4           #272E40
Border Soft         #30384C
Border Strong       #46516A

Text Primary        #F7F8FC
Text Secondary      #B8BFCE
Text Muted          #7E879C
Text Disabled       #596174

Ultraviolet         #8B5CF6
Ultraviolet Bright  #A78BFA
Ultraviolet Soft    #6D4BD4

Success             #4ADE80
Warning             #FBBF24
Danger              #FB5B6B
Info                 #60A5FA
```

Integrate with the repository’s token system rather than replacing stable values blindly.

Use ultraviolet for:

- Current focus
- Active AI state
- Selected navigation
- Primary selection
- Important progress
- Model or agent emphasis

Do not use ultraviolet for every border, icon, heading, card, and hover state.

Every status color must also have an icon, label, or shape cue.

---

# 8. TYPOGRAPHY

Use one UI family and one code family.

Recommended:

- UI: Geist Sans, Inter, or IBM Plex Sans
- Code: JetBrains Mono or IBM Plex Mono

Hierarchy:

```text
Display            36–44 px
Page title         28–32 px
Section title      22–24 px
Card title         18–20 px
Body               16 px
Metadata           14 px
Micro label        13 px only when necessary
Code               14–16 px
Controller hints   14–16 px
```

Rules:

- No 11 px or 12 px production text.
- Avoid excessive line length.
- Use weight contrast before adding more size variants.
- Use tabular numerals for metrics.
- Use monospace only for technical data.
- Avoid long all-caps labels.
- Support text scaling without clipping.

---

# 9. SPACING, DENSITY, AND LAYOUT RHYTHM

Use an 8 px spacing system with controlled 4 px substeps.

## Steam Deck mode

- Comfortable targets
- Strong focus
- Reduced simultaneous detail
- Compact but readable labels
- Collapsible secondary panels
- Minimal wasted vertical space

## Docked mode

- Higher information density
- Wider split views
- Persistent auxiliary navigation where useful
- Larger context panels
- More columns only when they improve comprehension

## Large-text mode

- Increased row heights
- Fewer visible columns
- Automatic collapse of secondary metadata
- No horizontal clipping

Use a consistent rhythm:

```text
Page frame
→ Page header
→ Primary summary/action
→ Main content groups
→ Secondary information
→ Persistent controller hints
```

Avoid random stacks of cards with inconsistent padding.

---

# 10. ELEVATION AND DEPTH

Use this hierarchy:

```text
Layer 0 — Canvas
Layer 1 — Main surfaces
Layer 2 — Interactive cards
Layer 3 — Focused or selected surfaces
Layer 4 — Popovers and context menus
Layer 5 — Modals
Layer 6 — Critical overlays
```

Use:

- Luminance shifts
- Border strength
- Soft shadows
- Focus glow
- Small scale changes
- Background dimming

Avoid:

- Heavy blur everywhere
- Transparent text over busy backgrounds
- Giant neon shadows
- Multiple competing glows
- Excessive floating cards
- Fake 3D perspective

---

# 11. FOCUS VISUAL SYSTEM

Focus is the most important visual state in NeuroDeckOS.

Focused items must show:

- High-contrast 2 px inner border
- 3–4 px outer halo
- Slight elevation
- Optional 1.02–1.05 scale
- Improved text contrast
- Relevant action disclosure
- No layout reflow
- No neighboring movement

Create focus variants for:

- Card
- List item
- Button
- Navigation item
- Tab
- Field
- Editor
- Terminal
- Canvas node
- Slider
- Tree row
- Destructive control
- Disabled control

Distinguish:

- Focus
- Selection
- Active state
- Pressed state
- Disabled state

Run the focus-debug overlay across every screen and verify:

- No hidden focus
- No clipped focus
- No ring beneath overlays
- No focus behind modals
- No focus on decoration
- No ambiguous selected/focused state

---

# 12. SYSTEM SHELL ENHANCEMENT

## 12.1 Top System Rail

Show:

- Active workspace
- Operating profile
- Current model
- Network and VPN
- Battery
- Resource alerts
- Running task count
- Time
- Approval indicator

Rules:

- Prioritize critical state.
- Collapse secondary state gracefully.
- Make status items focusable and explainable with `Y`.
- Use consistent icon sizing.
- Do not turn the rail into a telemetry wall.

## 12.2 Primary Navigation Rail

Enhance:

- Icon clarity
- Active state
- Focus state
- Collapsed/expanded behavior
- Badges
- Pinned items
- Category separators
- Profile-aware visibility
- Extension destinations

Keep navigation placement stable across screens.

## 12.3 Bottom Controller Rail

Enhance:

- Adaptive action labels
- Controller glyphs
- Primary/secondary grouping
- Destructive separation
- Chord visibility
- Hold-action progress
- Smooth context transitions

The rail must update immediately when focus changes.

## 12.4 Context Panel

Show:

- Focused item
- Status
- Description
- Metadata
- Actions
- AI suggestions
- Permissions
- Recent activity
- Related resources

Do not duplicate the main screen.

---

# 13. HOME COMMAND CENTER

Upgrade Home into a real operating dashboard.

Required regions:

- Greeting and current profile
- Universal AI intent field
- Resume cards
- Active tasks
- Pinned workspaces
- Quick actions
- System pulse
- Approval requests
- Smart recommendations
- Recent outputs
- Device/network alert strip

Rules:

- Use one dominant focal region.
- Avoid equal-weight card clutter.
- Highlight unfinished work.
- Use real system state.
- Keep recommendations compact.
- Avoid excessive vertical scrolling.
- Provide a strong default focus target.

---

# 14. AI COMMAND CANVAS

The AI Command Canvas must feel like an operating console, not a chat page.

Use clear regions for:

- User intent
- Generated plan
- Scope
- Risk
- Permissions
- Model
- Expected outputs
- Validation
- Rollback
- Approval actions

Each plan step should show:

- Number
- Action
- Tool
- Scope
- Risk
- Status
- Dependency
- Edit action
- Explanation action

During execution, transition into:

- Timeline
- Current operation
- Tool output
- Changed files
- Resource use
- Approval pauses
- Validation
- Recovery controls

Do not represent operational events as casual chat bubbles.

---

# 15. AGENT OPERATIONS CENTER

Agent cards must show:

- Name
- Role
- Status
- Current step
- Workspace
- Model
- Permission ceiling
- Progress
- Last event

Provide distinct states for:

- Idle
- Planning
- Waiting
- Running
- Paused
- Failed
- Completed
- Rolling back

Agent detail must provide:

- Overview
- Timeline
- Files
- Tools
- Permissions
- Logs
- Output
- Recovery

Use summaries first and raw logs on demand.

---

# 16. WORKSPACE UI

Upgrade:

- Workspace Hub
- Workspace Detail
- Workspace Switcher
- Resume state
- Workspace cards
- Health indicators
- Git summaries
- Running tasks
- Model profile
- Environment state
- Recent outputs

Workspace cards must communicate:

- Identity
- Technology stack
- Health
- Branch
- Last activity
- Current task
- Warnings
- Resume action

Avoid cards dominated by empty artwork.

The workspace switcher must be fast, state-aware, controller-smooth, and safe around running tasks.

---

# 17. BUILD STUDIO

Build Studio must feel like a premium controller-native IDE.

Support layouts:

- Editor focus
- Split editor
- Editor + AI
- Editor + terminal
- Editor + problems
- Review/diff
- Debug/test
- Project navigation

Panel behavior:

- Remember size
- Snap to presets
- Controller-accessible resize
- Quick collapse
- Focus preservation
- No unusably tiny panes
- Clear active-pane border

Editor chrome must show:

- Tabs
- Breadcrumbs
- Symbols
- Diagnostics
- Git state
- Controller mode
- LSP state
- AI state
- File path
- Unsaved state

Predictive coding must visualize:

- Token suggestions
- Structural actions
- Snippets
- Parameter choices
- Voice proposal
- Diff preview
- Undo state

---

# 18. TERMINAL

Show:

- Workspace
- Host
- Shell
- Current directory
- Git branch
- Exit state
- Session tabs
- Safety state
- Input mode

Output must:

- Preserve ANSI color safely
- Maintain contrast
- Use clear selection
- Support large text
- Keep the prompt visible
- Avoid suggestion overlays blocking output
- Provide controller scroll state

Intent mode and Command Builder must display:

- Program
- Subcommand
- Flags
- Values
- Pipes
- Redirects
- Environment
- Risk
- Exact final command

---

# 19. FILE MANAGER

Polish:

- List mode
- Grid mode
- Dual pane
- Tree mode
- Recent files
- Workspace mode
- Storage overview

Rows and cards should show:

- Name
- Type
- Size
- Modified time
- Source
- Git state
- Sync state
- Permission state
- Preview support

Preview must provide:

- Metadata
- Content
- AI actions
- Open
- Share
- Add to workspace
- Add to knowledge
- Security warning

---

# 20. BROWSER

Browser chrome should show:

- Tabs
- Address/search
- Security state
- Workspace association
- Download state
- Reader mode
- AI context state
- Site permission state

Controller browsing must provide:

- Visible element focus
- Scroll position
- Back/forward
- Tab switch
- Search
- Page actions
- AI actions
- Reader mode
- Open externally

Browser content must not visually overpower the NeuroDeck shell.

---

# 21. WORKFLOW FORGE

Each workflow node must show:

- Type
- Title
- Status
- Inputs
- Outputs
- Risk
- Permission requirement
- Validation state
- Error state

Canvas behavior:

- Clear grid
- Focusable nodes
- Visible edges
- Selected edge state
- Zoom level
- Controller pan
- Controller zoom
- Node inspector
- Dry-run state
- Execution overlay

Collapse secondary detail until a node is focused or selected.

---

# 22. MODEL CENTER

Model surfaces must communicate:

- Local/cloud
- Loaded/unloaded
- Capabilities
- Speed
- Context
- Memory use
- Privacy
- Cost policy
- Health
- Current tasks
- Compatibility
- Download state

Use comparison layouts when selecting models.

Do not use meaningless AI artwork as the primary card content.

---

# 23. SYSTEM DASHBOARD

Use real metrics with:

- Compact charts
- Numeric summaries
- Trend indicators
- Thresholds
- Warnings
- Unavailable states

Rules:

- No fake history.
- No excessive animation.
- No sparkline overload.
- Every chart has a text summary.
- Warnings are not color-only.
- Metrics updates must not shift layout.

---

# 24. SETTINGS

Unify settings with:

- Category rail
- Section headers
- Setting rows
- Inline explanation
- Current value
- Controller-accessible control
- Reset
- Policy source
- Restart requirement
- Search

Support row types:

- Toggle
- Selector
- Slider
- Multi-select
- Key mapping
- Text input
- Secure input
- File picker
- Profile picker
- Capability state
- Read-only state

Rules:

- Do not use giant cards for simple toggles.
- Do not hide advanced controls without explanation.
- Label every slider.
- Explain “Auto”.
- Show inherited values.
- Show profile overrides.
- Show restart requirements.

---

# 25. APPLICATIONS, PACKAGES, EXTENSIONS, AND MARKETPLACE

Upgrade:

- Application Library
- Package Center
- Steam Shortcut Manager
- Extension Manager
- Marketplace
- Extension Detail
- Installation Review

Show trust information clearly:

- Publisher
- Signature
- Source
- Permissions
- Compatibility
- Version
- Update state
- Quarantine state
- Controller-ready state
- Offline support

Install flow must review:

- Identity
- Source
- Permissions
- Dependencies
- Storage
- Risk
- Changes
- Confirmation

---

# 26. KNOWLEDGE, MEMORY, AND SEARCH

Knowledge Vault should show:

- Sources
- Collections
- Index state
- Privacy scope
- Staleness
- Storage
- Last retrieval
- Citation support

Memory Center should show:

- Memory item
- Scope
- Source
- Last used
- Expiration
- Edit
- Delete
- Move scope
- Disable

Universal Search should show:

- Scope
- Filters
- Result groups
- Preview
- Source
- Permission state
- Semantic/full-text mode
- Recent history

Do not dump unrelated result types into one unstructured list.

---

# 27. VOICE, CAPTURE, AND MULTIMODAL

Voice surfaces must show:

- Microphone state
- Listening state
- Transcript
- Confidence
- Provider
- Privacy state
- Correction
- Submit/cancel

Capture surfaces must show:

- Capture source
- Preview
- Redactions
- Provider destination
- Local/cloud processing
- Selected region
- Confirm/cancel

Recording must always show a persistent indicator.

---

# 28. DOWNLOADS, TRANSFERS, SYNC, AND BACKUP

Use a unified transfer visual language.

Transfer cards should show:

- Item
- Source
- Destination
- Progress
- Speed
- ETA
- State
- Integrity
- Retry
- Pause
- Cancel

Sync should show:

- Provider
- Last sync
- Pending changes
- Conflicts
- Encryption
- Data classes
- Offline state

Backup should show:

- Scope
- Destination
- Encryption
- Size
- Last success
- Verification
- Restore point
- Health

---

# 29. DEVICE CENTER

Upgrade controller, Bluetooth, audio, microphone, display, dock, storage, and network-device surfaces.

Device cards should show:

- Name
- Type
- Status
- Battery
- Connection
- Default state
- Profile
- Health
- Actions

Hot-plug events must use calm, non-blocking notifications and never steal focus.

---

# 30. PROFILES, GUEST MODE, SAFE MODE, PRESENTATION, AND KIOSK

Profiles should show:

- Identity
- Purpose
- Theme
- Workspaces
- Model profile
- Controller profile
- Privacy
- Notifications
- Resource policy

Guest mode must visually reinforce:

- Nonpersistent session
- Restricted memory
- Restricted secrets
- Clear-on-exit behavior

Safe Mode must use a stripped, high-clarity interface with minimal motion and no nonessential extensions.

Presentation mode must hide sensitive information and suppress low-priority notifications.

Kiosk mode must make allowed routes obvious and restricted exits deliberate.

---

# 31. MODALS AND OVERLAYS

Unify:

- Information dialogs
- Confirmation dialogs
- Permission dialogs
- Critical confirmation dialogs
- Pickers
- Input overlays
- Progress dialogs
- Error recovery
- Install review
- Diff review

Rules:

- Clear title
- Clear consequence
- Primary action
- Cancel
- Controller hints
- Focus trap
- Focus restoration
- Minimal nested modal depth
- Useful scroll region
- Predictable Back behavior

Critical actions must show:

- Warning header
- Target
- Exact action
- Consequence
- Recovery
- Hold-to-confirm
- Distinct haptic response

---

# 32. EMPTY, LOADING, ERROR, OFFLINE, AND RESTRICTED STATES

## Empty

Show:

- What is empty
- Why
- Primary action
- Secondary help
- Optional import/discovery action

## Loading

Use:

- Structured skeletons
- Progress labels
- Step indicators
- Cancel where safe
- Partial data
- Retry
- Offline alternative

Avoid infinite spinners and fake percentages.

## Error

Show:

- Plain-language summary
- Technical code
- Affected feature
- What still works
- Primary recovery
- Alternative recovery
- Diagnostics
- Back/Home
- Correlation ID where applicable

## Offline

Show:

- Local functionality
- Unavailable cloud functions
- Queued work
- Reconnect
- Network policy

## Restricted

Show:

- Missing permission or capability
- Reason
- Request access
- Read-only alternative
- Policy source

---

# 33. MOTION SYSTEM

Motion must communicate focus, selection, pane movement, route change, task progress, state change, modal hierarchy, and completion.

Timing guidance:

```text
Focus: 90–140 ms
Button press: 80–120 ms
Popover: 120–170 ms
Modal: 160–220 ms
Route: 180–260 ms
Panel resize: 140–200 ms
Task state: 180–260 ms
```

Avoid:

- Long easing
- Elastic bouncing
- Continuous floating
- Animated gradients
- Particle systems
- Heavy parallax
- Excessive blur animation
- Motion that delays input

Reduced motion must remove scale and parallax while preserving state clarity.

---

# 34. ICONOGRAPHY

Use one icon family with:

- Consistent stroke weight
- Consistent optical size
- Consistent padding
- Consistent active treatment
- Consistent disabled treatment
- Text labels for ambiguous actions

Create an icon abstraction such as:

```tsx
<NdxIcon name="workspace" size="md" tone="muted" />
```

Do not import icon libraries directly throughout every feature.

---

# 35. CONTROLLER HINT LANGUAGE

Standardize verbs:

```text
Open
Select
Confirm
Back
Close
Actions
Ask AI
Explain
Run
Pause
Resume
Inspect
Edit
Pin
Switch
Search
Keyboard
Speak
Compare
Restore
Approve
Deny
```

Avoid vague labels such as “Do,” “Go,” “Okay,” or “More” when a precise verb exists.

---

# 36. RESPONSIVE LAYOUTS

## 1280 × 800 Steam Deck

- No clipping
- No horizontal overflow
- 48 px minimum targets
- 16 px body text
- Intelligent context-panel collapse
- Persistent navigation access
- Persistent action rail
- Dialogs inside safe area
- Useful editor and terminal height
- Keyboard does not obscure active input

## 1280 × 720 fallback

- Compress vertical spacing
- Reduce secondary metadata
- Preserve action rail
- Preserve focus
- Do not shrink text below standards

## 1920 × 1080 docked

- Increase density carefully
- Use split views
- Expand context
- Preserve controller navigation
- Do not merely stretch cards

## 2560 × 1440

- Use max widths
- Add columns only when useful
- Keep readable line lengths
- Avoid giant empty margins
- Support theater mode

---

# 37. PERFORMANCE REQUIREMENTS

Targets:

- Controller response under 50 ms
- Focus transition under 140 ms
- Route transition under 300 ms
- Warm quick overlay under 250 ms
- No unbounded render loops
- No excessive blur layers
- No large background video by default
- No constant chart rerender
- No full-app rerender on metric updates

Use:

- Memoization
- Virtualization
- Route code splitting
- Feature lazy loading
- CSS variables
- Reduced DOM depth
- Bounded animation
- Throttled metrics
- Stable selectors
- GPU-friendly transforms
- Suspended inactive panels

Measure before and after.

---

# 38. ACCESSIBILITY

Validate:

- Contrast
- Visible focus
- Screen-reader labels
- Semantic headings
- Accessible modals
- Status not color-only
- Large text
- Reduced motion
- Haptic settings
- Controller repeat settings
- Read-current-screen support
- Captions
- Single-hand mappings
- Logical reading order
- Error announcement
- Dynamic-content announcement

Accessibility is part of implementation, not final polish.

---

# 39. SHARED COMPONENT ARCHITECTURE

Refactor toward shared primitives:

```text
NdxPage
NdxPageHeader
NdxSection
NdxPanel
NdxCard
NdxMetricCard
NdxFocusCard
NdxActionCard
NdxList
NdxListRow
NdxTree
NdxTabs
NdxRail
NdxContextPanel
NdxActionRail
NdxBadge
NdxStatus
NdxProgress
NdxTimeline
NdxEmptyState
NdxLoadingState
NdxErrorState
NdxOfflineState
NdxRestrictedState
NdxModal
NdxPermissionModal
NdxCriticalModal
NdxPicker
NdxCommandPalette
NdxSearchField
NdxPredictiveInput
NdxSlider
NdxToggle
NdxSelect
NdxControllerHint
NdxGlyph
NdxToast
NdxTooltip
NdxDiffViewer
NdxLogViewer
NdxChart
NdxSplitPane
NdxCanvasNode
NdxDeviceCard
NdxWorkspaceCard
NdxAgentCard
NdxModelCard
NdxWorkflowCard
NdxApplicationCard
NdxExtensionCard
```

Do not create one-off variants when a shared component can handle the pattern cleanly.

---

# 40. CSS AND TAILWIND REFACTOR

Audit:

- Hard-coded values
- Arbitrary Tailwind values
- Repeated class strings
- Conflicting utilities
- `transition-all`
- Excessive `backdrop-blur`
- Specificity conflicts
- Global overrides
- Z-index chaos
- Overflow clipping
- Negative margins
- Fixed heights
- Unnecessary absolute positioning

Create:

- Semantic utilities
- Shared component variants
- Tailwind theme extensions where useful
- Predictable z-index scale
- Focus utilities
- High-contrast utilities
- Reduced-motion utilities

---

# 41. VISUAL QA AUTOMATION

Capture every screen at:

- 1280 × 800
- 1280 × 720
- 1920 × 1080
- 2560 × 1440

Capture states:

- Default
- Focused
- Selected
- Modal
- Loading
- Empty
- Error
- Offline
- Restricted
- High contrast
- Large text
- Reduced motion where relevant

Name screenshots:

```text
<screen-id>__<resolution>__<state>.png
```

Detect:

- Clipping
- Overflow
- Misalignment
- Inconsistent spacing
- Broken focus rings
- Hidden actions
- Text wrapping failures
- Contrast loss
- Modal overflow
- Z-index failures
- Layout shifts
- Duplicate components
- Incorrect rail sizing

Do not approve all visual diffs blindly.

---

# 42. CONTROLLER QA AUTOMATION

For every screen:

- Verify initial focus.
- Traverse every focusable control.
- Verify no dead end.
- Verify Back.
- Verify modal trap.
- Verify focus restore.
- Verify pane switch.
- Verify action-rail updates.
- Verify accessible names.
- Verify disabled controls are skipped.
- Verify scroll follows focus.
- Verify dynamic removal recovery.
- Verify resolution changes.
- Verify docked mode.

Use semantic controller actions, not mouse clicks.

---

# 43. IMPLEMENTATION PHASES

## UI-0 — Audit and baseline

- Read all NeuroDeck documents.
- Inventory screens and components.
- Capture baseline screenshots.
- Run focus traversal.
- Record visual debt.
- Create enhancement ledger.

## UI-1 — Tokens and primitives

- Rebuild semantic tokens.
- Unify typography.
- Unify spacing.
- Unify elevation.
- Unify focus.
- Unify motion.
- Unify status.
- Refactor shared primitives.

## UI-2 — Shell

- System rail
- Navigation rail
- Context panel
- Action rail
- Global overlays
- Modal system
- Toasts
- Command palette
- Workspace switcher

## UI-3 — Core operating views

- Home
- AI Canvas
- Activity
- Notifications
- Agents
- Workspaces
- Approvals
- Recovery

## UI-4 — Workstation views

- Build Studio
- Editor
- Terminal
- Files
- Git
- Browser
- Workflow Forge
- Models

## UI-5 — Platform views

- Applications
- Packages
- Steam shortcuts
- Extensions
- Marketplace
- Knowledge
- Memory
- Search
- Voice
- Capture
- Transfers
- Sync
- Backup

## UI-6 — System views

- Devices
- Audio
- Display
- Dock
- Storage
- Network
- VPN
- Profiles
- Vault
- Privacy
- Telemetry
- Supply chain
- Platform health

## UI-7 — Onboarding, help, and modes

- First-run
- Tutorials
- Help
- Troubleshooter
- Safe Mode
- Guest Mode
- Presentation Mode
- Kiosk Mode
- Developer Mode

## UI-8 — Responsive and accessibility

- 1280 × 800
- 1280 × 720
- Docked layouts
- Large text
- High contrast
- Reduced motion
- Single-hand mapping

## UI-9 — Final polish

- Visual regression
- Controller traversal
- Performance
- Accessibility
- Screenshot review
- Dead CSS removal
- Duplicate component removal
- Documentation
- Final evidence report

---

# 44. REQUIRED TESTS

## Unit

- Token resolution
- Variant generation
- Focus state
- Hint mapping
- Responsive helpers
- Theme switching
- Reduced motion
- High contrast
- Large text
- Status rendering

## Component

- Rails
- Cards
- Modals
- Pickers
- Search
- Lists
- Trees
- Sliders
- Focus surfaces
- Error states
- Empty states
- Loading states
- Split panes
- Canvas nodes
- Diff viewer
- Terminal frame
- Editor frame

## End-to-end

- Controller navigation across every route
- Modal behavior
- Quick overlay
- Workspace switch
- Theme switch
- Large-text mode
- Docked mode
- Safe Mode
- Profile switch
- Error recovery
- Empty states
- Visual regression

## Performance

- Route transition
- Input latency
- Focus latency
- Memory
- Render count
- Metrics updates
- List virtualization
- Animation cost

---

# 45. FINAL ACCEPTANCE GATES

Do not declare completion until:

## Visual system

- Tokens are semantic.
- Colors are consistent.
- Typography is consistent.
- Spacing is consistent.
- Focus is consistent.
- Motion is consistent.
- Status is consistent.
- No obvious visual drift remains.

## Screen coverage

- Every ND screen is enhanced.
- Every ND-X screen is enhanced.
- Every overlay is enhanced.
- Every modal is enhanced.
- Every state is enhanced.

## Controller

- Every screen has visible initial focus.
- No focus traps remain.
- No clipped focus remains.
- No pointer-only action remains.
- Controller hints are correct.
- Focus survives dynamic updates.

## Responsive

- 1280 × 800 passes.
- 1280 × 720 passes.
- 1920 × 1080 passes.
- 2560 × 1440 passes.
- Large text passes.
- High contrast passes.

## Quality

- Type check passes.
- Lint passes.
- Tests pass.
- Visual regression is reviewed.
- No production mocks are introduced.
- No IPC is broken.
- No dead route remains.
- No inaccessible modal remains.
- No critical console error remains.
- No severe performance regression remains.

---

# 46. FINAL REPORT FORMAT

Provide:

## 1. Executive summary

What was improved and why.

## 2. Design-system summary

Tokens, typography, spacing, elevation, focus, motion, and iconography.

## 3. Component refactor summary

Shared components created, consolidated, or removed.

## 4. Screen completion matrix

All ND and ND-X screens with status.

## 5. Before/after evidence

Screenshot paths and key differences.

## 6. Controller UX report

Focus, traversal, hints, modal behavior, and resizing.

## 7. Accessibility report

Contrast, large text, reduced motion, screen reader, and color independence.

## 8. Responsive report

Steam Deck and docked layouts.

## 9. Performance report

Input latency, route transitions, render count, and memory impact.

## 10. Remaining issues

Only verified unresolved items.

## 11. File-change summary

Grouped by design system, shell, features, tests, and documentation.

---

# 47. FINAL AGENT INSTRUCTION

Begin by reading every NeuroDeckOS design and implementation document.

Then:

1. Audit the existing UI.
2. Capture baseline screenshots.
3. Build the enhancement ledger.
4. Reconstruct the semantic design system.
5. Refactor shared UI primitives.
6. Upgrade the shell.
7. Upgrade every core screen.
8. Upgrade every supplemental platform screen.
9. Upgrade every overlay, modal, and UI state.
10. Validate controller focus.
11. Validate accessibility.
12. Validate performance.
13. Validate all target resolutions.
14. Repair visual regressions.
15. Remove dead styles and duplicate components.
16. Update screenshots and documentation.
17. Produce an evidence-based final report.

Do not redesign NeuroDeckOS into a different product.

Do not break working production behavior.

Do not add decorative noise.

Do not stop after Home and Settings.

Do not claim success from static screenshots alone.

Deliver a coherent, high-fidelity, controller-native operating interface across the entire NeuroDeckOS platform.
