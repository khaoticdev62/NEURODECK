# NEURODECK Design Tokens + Component Library v1.0

**Product:** NEURODECK  
**Framework Target:** Electron + React + TypeScript + Tailwind CSS  
**Primary Device:** Steam Deck LCD, 1280 × 800  
**Secondary Targets:** Windows desktop, Linux desktop, docked Steam Deck, external monitor  
**Document Status:** Production implementation baseline  
**Generated:** 2026-06-09T21:50:48Z

---

## 0. Executive Summary

This document defines the production-ready design token system and React component library for **NEURODECK**, an Electron-based handheld AI workstation optimized for Steam Deck Game Mode and desktop usage.

The purpose of this package is to prevent design drift. Every color, spacing unit, typography style, focus state, elevation, animation, accessibility state, and component contract must resolve back to a named token or component rule.

NEURODECK is not a generic chatbot UI. It is a tactical AI workstation interface built around:

- controller-first navigation
- Steam Deck readability
- Electron security boundaries
- AI workspace density
- local/remote model management
- agent orchestration
- Hermes Lua extension integration
- offline-first behavior
- production-grade accessibility

---

## 1. Design System Principles

### 1.1 Core Visual Direction

NEURODECK uses a **Tactical Glass** interface language:

```txt
70% modern tactical operating system
20% AAA console dashboard
10% terminal heritage
```

This means:

- dark surfaces by default
- clear content zones
- high-contrast text
- controlled glow, not neon soup
- GPU-safe depth
- no heavy fullscreen blur
- no excessive glassmorphism
- sharp focus rings for controller navigation
- strong panel hierarchy
- minimal but useful motion

### 1.2 Production Rules

Every UI implementation must follow these rules:

1. No hardcoded colors outside token files.
2. No arbitrary spacing values outside the spacing scale.
3. No custom focus style without token mapping.
4. No component-specific shadows unless mapped to elevation tokens.
5. No inaccessible text contrast.
6. No hover-only interaction for critical actions.
7. No hidden controller traps.
8. No motion that ignores reduced-motion settings.
9. No component variant without documented states.
10. No one-off layout unless approved in the screen catalog.

---

## 2. Token Architecture

### 2.1 Token Layers

NEURODECK tokens are organized into five layers:

| Layer | Purpose | Example |
|---|---|---|
| Primitive Tokens | Raw values | `color.cyan.400` |
| Semantic Tokens | Meaningful roles | `surface.primary` |
| Component Tokens | Component-specific aliases | `button.primary.bg` |
| State Tokens | Interaction states | `focus.ring.primary` |
| Platform Tokens | Steam Deck/Desktop overrides | `deck.text.minimum` |

### 2.2 Required Token Files

```txt
src/renderer/styles/tokens.css
src/renderer/styles/themes/blacksite.css
src/renderer/styles/themes/tactical-glass.css
src/renderer/styles/themes/high-contrast.css
src/renderer/styles/themes/reduced-motion.css
src/renderer/styles/themes/colorblind-safe.css
tailwind.config.ts
src/renderer/design-system/tokens.json
src/renderer/design-system/component-registry.json
```

### 2.3 Token Naming Convention

Use dot-path names in JSON and CSS custom properties in CSS.

JSON:

```json
{
  "surface.primary": "#0A0D10"
}
```

CSS:

```css
:root {
  --nd-surface-primary: #0A0D10;
}
```

Tailwind alias:

```ts
colors: {
  surface: {
    primary: "var(--nd-surface-primary)"
  }
}
```

---

## 3. Color System

### 3.1 Primitive Palette

The primitive palette defines raw values. These should not be used directly in components unless mapped through semantic tokens.

| Token | Value | Purpose |
|---|---:|---|
| `color.void.950` | `#05070A` | deepest background |
| `color.void.900` | `#0A0D10` | app shell background |
| `color.void.850` | `#0D1117` | panel base |
| `color.slate.800` | `#11161C` | secondary surface |
| `color.slate.700` | `#18212B` | raised surface |
| `color.slate.600` | `#22303D` | borders |
| `color.text.100` | `#E8F4FF` | primary text |
| `color.text.300` | `#B9CAD8` | secondary text |
| `color.text.500` | `#8DA1B3` | muted text |
| `color.cyan.400` | `#5EEBFF` | primary accent |
| `color.blue.500` | `#4F8CFF` | info accent |
| `color.green.400` | `#7CFFB2` | success |
| `color.yellow.400` | `#FFC857` | warning |
| `color.red.400` | `#FF5A6A` | error/destructive |
| `color.purple.400` | `#B28CFF` | agent/memory accent |

### 3.2 Semantic Color Tokens

| Token | Value | Use |
|---|---:|---|
| `surface.app` | `#05070A` | app root |
| `surface.primary` | `#0A0D10` | main shell |
| `surface.secondary` | `#11161C` | panels/cards |
| `surface.tertiary` | `#18212B` | active panels |
| `surface.overlay` | `rgba(5,7,10,0.88)` | modal/overlay |
| `surface.glass` | `rgba(17,22,28,0.82)` | tactical glass card |
| `border.subtle` | `rgba(141,161,179,0.16)` | inactive border |
| `border.default` | `rgba(141,161,179,0.28)` | standard border |
| `border.strong` | `rgba(232,244,255,0.42)` | important border |
| `text.primary` | `#E8F4FF` | body/headline |
| `text.secondary` | `#B9CAD8` | supporting text |
| `text.muted` | `#8DA1B3` | labels/metadata |
| `text.disabled` | `rgba(141,161,179,0.45)` | disabled text |
| `accent.primary` | `#5EEBFF` | focus/primary actions |
| `accent.info` | `#4F8CFF` | info/status |
| `accent.success` | `#7CFFB2` | success |
| `accent.warning` | `#FFC857` | warning |
| `accent.error` | `#FF5A6A` | error/destructive |
| `accent.agent` | `#B28CFF` | agents/memory |

### 3.3 Color Usage Rules

Primary accent is reserved for:

- active focus
- primary CTA
- selected tab
- current route
- active command palette item
- cursor/caret

Error accent is reserved for:

- destructive actions
- validation failures
- failed model/agent/plugin states
- security warnings

Warning accent is reserved for:

- degraded mode
- missing model
- high latency
- storage pressure
- offline sync warning

Success accent is reserved for:

- connected model
- healthy subsystem
- completed task
- passed release gate

---

## 4. Typography System

### 4.1 Font Stack

Primary implementation stack:

```css
font-family: "JetBrains Mono", "IBM Plex Mono", "Cascadia Mono", "SF Mono", Consolas, monospace;
```

### 4.2 Type Scale

| Token | Size | Line Height | Weight | Use |
|---|---:|---:|---:|---|
| `text.display` | 28px | 36px | 700 | startup/title moments |
| `text.h1` | 24px | 32px | 700 | screen title |
| `text.h2` | 20px | 28px | 650 | section title |
| `text.h3` | 17px | 24px | 650 | card title |
| `text.body` | 15px | 22px | 400 | standard body |
| `text.body-sm` | 14px | 20px | 400 | compact body |
| `text.caption` | 12px | 16px | 500 | metadata |
| `text.micro` | 11px | 14px | 500 | dense labels |
| `text.code` | 13px | 20px | 400 | code blocks |

### 4.3 Steam Deck Readability Rules

At 1280 × 800:

- Main body text should not go below 14px.
- Captions below 12px require high contrast and short labels.
- Interactive labels should be at least 13px.
- Dense diagnostic tables can use 11px only in non-critical metadata.
- Input console text should be 15px minimum.
- Focused elements must have visible state at couch/handheld distance.

---

## 5. Spacing and Layout

### 5.1 Base Spacing Scale

NEURODECK uses a 4px base grid.

| Token | Value | Use |
|---|---:|---|
| `space.0` | 0px | none |
| `space.1` | 4px | micro gap |
| `space.2` | 8px | small gap |
| `space.3` | 12px | compact padding |
| `space.4` | 16px | default padding |
| `space.5` | 20px | roomy padding |
| `space.6` | 24px | section gap |
| `space.8` | 32px | major section gap |
| `space.10` | 40px | layout gap |
| `space.12` | 48px | major layout gap |

### 5.2 Layout Shell

Default 1280 × 800 shell:

```txt
┌──────────────────────────────────────────────────────────────┐
│ Top Status Bar: 40px                                         │
├──────────────┬─────────────────────────────────┬─────────────┤
│ Nav Rail     │ Workspace                       │ Context     │
│ 72px         │ fluid                           │ 280px       │
├──────────────┴─────────────────────────────────┴─────────────┤
│ Input Console: 96–148px                                      │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Breakpoints

| Token | Width | Target |
|---|---:|---|
| `deck` | 1280px | Steam Deck native |
| `compact` | 1024px | smaller desktop/windowed |
| `desktop` | 1440px | standard desktop |
| `wide` | 1920px | docked/external |

### 5.4 Safe Area Rules

For Steam Deck:

- Avoid placing critical controls at extreme corners.
- Reserve lower edge for input/action zones.
- Keep critical status info in top 40px band.
- Ensure modals fit within 1180 × 700 at Deck resolution.
- Avoid scroll traps inside nested panels.

---

## 6. Elevation and Surface System

### 6.1 Elevation Tokens

| Token | CSS | Use |
|---|---|---|
| `elevation.none` | none | flat content |
| `elevation.panel` | `0 1px 0 rgba(255,255,255,0.04)` | structural panels |
| `elevation.card` | `0 8px 24px rgba(0,0,0,0.24)` | cards |
| `elevation.overlay` | `0 24px 80px rgba(0,0,0,0.55)` | overlays/modals |
| `elevation.focus` | `0 0 0 2px var(--nd-focus-ring), 0 0 24px rgba(94,235,255,0.18)` | controller focus |

### 6.2 Border Radius Tokens

| Token | Value | Use |
|---|---:|---|
| `radius.none` | 0px | terminal blocks |
| `radius.sm` | 6px | compact controls |
| `radius.md` | 10px | buttons/cards |
| `radius.lg` | 14px | large panels |
| `radius.xl` | 20px | modals |
| `radius.full` | 999px | pills/badges |

---

## 7. Motion System

### 7.1 Motion Principles

Motion must be:

- short
- readable
- reversible
- non-blocking
- reduced-motion aware
- GPU-light

### 7.2 Duration Tokens

| Token | Value | Use |
|---|---:|---|
| `motion.instant` | 0ms | reduced motion / critical |
| `motion.fast` | 90ms | focus / hover |
| `motion.normal` | 140ms | panel reveal |
| `motion.slow` | 220ms | modal / route |
| `motion.stream` | variable | token streaming |

### 7.3 Easing Tokens

| Token | Value | Use |
|---|---|---|
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | standard |
| `ease.out` | `cubic-bezier(0, 0, 0.2, 1)` | entrance |
| `ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | exit |

### 7.4 Forbidden Motion

Do not use:

- elastic overshoot
- bounce transitions
- particle storms
- heavy blur animations
- shader-style transitions
- full-screen scanlines
- motion that hides loading state

---

## 8. Controller and Focus System

### 8.1 Focus Token Rules

Every interactive element must expose:

- default state
- hover state
- active state
- keyboard focus state
- controller focus state
- disabled state
- loading state if async

Focus ring CSS:

```css
.nd-focus-visible {
  outline: none;
  box-shadow: var(--nd-elevation-focus);
  border-color: var(--nd-accent-primary);
}
```

### 8.2 Controller Navigation Rules

- D-pad moves between logical controls.
- Left stick may scroll content regions.
- A confirms.
- B cancels/back.
- X opens command palette or context action depending screen.
- Y toggles context panel or metadata.
- L1/R1 cycles major tabs.
- L2/R2 page scrolls or changes context depending screen.
- L4/R4/L5/R5 are optional Steam Input shortcuts.

### 8.3 Focus Graph Requirements

Each screen must define:

```ts
export type FocusNode = {
  id: string;
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  action?: string;
  escape?: string;
};
```

No screen can ship without a focus graph.

---

## 9. Accessibility Requirements

### 9.1 Required Modes

NEURODECK must support:

- high contrast
- reduced motion
- low vision density increase
- colorblind-safe status mapping
- keyboard-only navigation
- controller-only navigation
- screen-reader labels where native semantics apply

### 9.2 Accessible Component Requirements

Every component spec must include:

- ARIA role if needed
- keyboard behavior
- controller behavior
- focus handling
- disabled/loading semantics
- contrast requirements
- reduced-motion behavior

### 9.3 Status Must Not Rely on Color Alone

Every status indicator must include at least one non-color signal:

```txt
Icon + label + color
```

Example:

```txt
✓ Connected
! Degraded
× Failed
… Running
```

---

## 10. Component Library Overview

### 10.1 Component Tiers

| Tier | Examples | Purpose |
|---|---|---|
| Foundation | Button, Input, Badge, Tooltip | primitives |
| Layout | AppShell, Panel, SplitView, NavRail | structural |
| AI Workspace | ChatViewport, ResponseCard, InputConsole | core UX |
| Systems | ModelCard, AgentCard, MemoryPanel | product features |
| Ops | TelemetryWidget, DiagnosticsPanel, LogViewer | maintenance |
| Overlay | Modal, CommandPalette, Toast | transient UI |

### 10.2 Component Contract Template

Every component must define:

```md
## Component Name
Purpose
Anatomy
Props
Variants
States
Keyboard behavior
Controller behavior
Accessibility
Error states
Loading states
Token usage
Do / Don’t
Test cases
```

---

# 11. Foundation Components

## 11.1 Button

### Purpose

Triggers an immediate action or submits a command.

### Anatomy

```txt
[icon] label [shortcut]
```

### Variants

| Variant | Use |
|---|---|
| `primary` | main action |
| `secondary` | normal action |
| `ghost` | low emphasis |
| `danger` | destructive |
| `success` | confirm/complete |
| `warning` | risky action |

### Props

```ts
export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};
```

### States

- default
- hover
- pressed
- focused
- disabled
- loading

### Acceptance Criteria

- Button has visible focus state.
- Button can be triggered by keyboard Enter/Space.
- Button can be triggered by controller confirm action.
- Loading state prevents duplicate submission.
- Danger variant requires clear label.

---

## 11.2 IconButton

### Purpose

Compact button for common actions.

### Required Behavior

- Must include accessible label.
- Must expose tooltip on hover/focus.
- Must not be used for destructive actions without confirmation.

### Props

```ts
export type IconButtonProps = {
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
};
```

---

## 11.3 Badge

### Purpose

Displays compact status metadata.

### Variants

```ts
type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'agent';
```

### Rules

- Status badges must include text, not just color.
- Badges should not contain interactive controls.
- Use maximum 24 characters unless in diagnostics panel.

---

## 11.4 TextInput

### Purpose

Single-line text entry.

### Props

```ts
export type TextInputProps = {
  label?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};
```

### Acceptance Criteria

- Error text is associated with input.
- Focus ring is visible.
- Steam Deck virtual keyboard behavior is tested.
- Input state persists across focus loss.

---

## 11.5 Select

### Purpose

Choose from a constrained list.

### Rules

- Use native select behavior where possible.
- For custom select, keyboard/controller navigation must match listbox expectations.
- Do not use searchable combobox for fewer than six options.

---

# 12. Layout Components

## 12.1 AppShell

### Purpose

Root UI layout for NEURODECK.

### Regions

```txt
TopStatusBar
NavRail
WorkspaceRegion
ContextRegion
InputRegion
OverlayLayer
```

### Props

```ts
export type AppShellProps = {
  topBar: React.ReactNode;
  navRail: React.ReactNode;
  workspace: React.ReactNode;
  context?: React.ReactNode;
  input?: React.ReactNode;
  overlays?: React.ReactNode;
};
```

### Rules

- Must fit within 1280 × 800.
- Must support context panel collapse.
- Must not cause horizontal scroll at Deck resolution.
- Must preserve input region during model streaming.

---

## 12.2 Panel

### Purpose

Reusable tactical-glass content surface.

### Props

```ts
export type PanelProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  density?: 'compact' | 'normal' | 'spacious';
  emphasis?: 'default' | 'raised' | 'active' | 'critical';
  children: React.ReactNode;
};
```

### States

- default
- active
- focused
- disabled
- warning
- error

---

## 12.3 NavRail

### Purpose

Primary app navigation optimized for controller movement.

### Items

- Workspace
- Models
- Agents
- Memory
- Sessions
- Plugins
- Diagnostics
- Settings

### Rules

- Icon and label required on Deck.
- Current route must be visually and semantically selected.
- L1/R1 tab cycling must work where appropriate.

---

## 12.4 TopStatusBar

### Purpose

Persistent system status.

### Content

- app logo/name
- active session
- selected model
- network/offline status
- CPU/RAM/model status summary
- clock optional

### Rules

- Height target: 40px.
- Critical errors can elevate to alert strip.
- Must not become a dumping ground for random buttons.

---

# 13. AI Workspace Components

## 13.1 ChatViewport

### Purpose

Scrollable conversation/history viewport.

### Required Features

- virtualized message list for large sessions
- streaming response support
- scroll-to-latest behavior
- preserve scroll when viewing older messages
- error card rendering
- empty state
- offline state

### Props

```ts
export type ChatViewportProps = {
  messages: ChatMessage[];
  streamingMessageId?: string;
  selectedMessageId?: string;
  onSelectMessage?: (id: string) => void;
  onRetryMessage?: (id: string) => void;
};
```

### Acceptance Criteria

- 500-message session remains responsive.
- Controller can move between messages.
- User can copy response text.
- Streaming does not lock input region.
- Errors render inline with recovery actions.

---

## 13.2 ResponseCard

### Purpose

Displays user, assistant, agent, system, or tool output.

### Message Types

```ts
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'agent';
```

### Anatomy

```txt
Header: role/name, model/agent, timestamp, status
Body: markdown/text/code/tool output
Footer: actions, token count, latency, references
```

### States

- complete
- streaming
- failed
- cancelled
- redacted
- tool-running

### Required Actions

- copy
- regenerate
- branch
- save
- inspect metadata
- report issue/log

---

## 13.3 InputConsole

### Purpose

Primary prompt and command entry.

### Features

- multiline text input
- command mode
- slash commands
- selected model indicator
- selected persona indicator
- attachment indicator later
- submit/cancel/regenerate actions

### Props

```ts
export type InputConsoleProps = {
  value: string;
  mode: 'prompt' | 'command';
  disabled?: boolean;
  busy?: boolean;
  selectedModel?: string;
  selectedAgent?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onOpenCommandPalette?: () => void;
};
```

### Controller Rules

- A focuses or submits depending context.
- B cancels or exits focus.
- X opens command palette.
- Y toggles context panel.
- R4 regenerates when mapped.

### Acceptance Criteria

- Prompt text survives model failure.
- Input remains editable during failed state.
- Submit disabled when empty.
- Submit disabled while same request is pending unless cancel is available.
- Virtual keyboard works on Steam Deck.

---

## 13.4 CommandPalette

### Purpose

Fast universal command launcher.

### Features

- fuzzy search
- keyboard/controller navigation
- recent commands
- grouped commands
- disabled command explanation
- permission-aware plugin commands

### Props

```ts
export type CommandPaletteProps = {
  open: boolean;
  commands: CommandDefinition[];
  recentCommandIds: string[];
  onClose: () => void;
  onRunCommand: (id: string, args?: unknown) => void;
};
```

### Rules

- Opens with keyboard shortcut and controller shortcut.
- Escape/B closes.
- Enter/A runs selected command.
- Disabled commands must explain why.
- Plugin commands must show permission badge.

---

# 14. System Feature Components

## 14.1 ModelCard

### Purpose

Displays local or remote AI model configuration and health.

### Anatomy

```txt
Model name
Provider
Status
Capabilities
Context size
Memory/VRAM estimate
Actions
```

### States

- available
- selected
- missing
- downloading later
- unavailable
- auth-required
- degraded

### Acceptance Criteria

- Missing model has recovery action.
- Remote provider key status never reveals secret.
- Health check state is visible.

---

## 14.2 AgentCard

### Purpose

Displays an AI agent/persona/workflow unit.

### Fields

- name
- role
- permissions
- active tools
- model binding
- memory scope
- last run status

### Rules

- Agents with filesystem/tool permissions must show a badge.
- Unsafe or untrusted agents cannot run without confirmation.

---

## 14.3 MemoryPanel

### Purpose

Shows current context/memory attached to the session.

### Features

- session memory
- project memory
- pinned facts
- retrieved context
- redaction indicators

### Rules

- Memory entries must expose source and scope.
- Sensitive memory must be marked.
- Delete/forget actions require confirmation.

---

## 14.4 SessionCard

### Purpose

Represents a saved conversation/workspace.

### Fields

- title
- updated time
- model/agent used
- tags
- message count
- local/remote status

### Actions

- open
- rename
- duplicate
- export
- archive/delete

---

## 14.5 PluginCard

### Purpose

Displays installed Hermes/Electron plugin or extension.

### Fields

- plugin name
- version
- author/source
- trust status
- permissions
- enabled status
- last error

### Rules

- Permission badges required.
- Untrusted plugins cannot execute commands.
- Dangerous permission changes require confirmation.

---

## 14.6 TelemetryWidget

### Purpose

Displays local diagnostic metrics without becoming surveillance junk.

### Metrics

- token throughput
- latency
- memory usage
- model status
- queue depth
- extension errors
- offline/online status

### Rules

- User telemetry is local-first unless opt-in is explicitly designed.
- Widget must degrade gracefully when metric source is unavailable.

---

## 14.7 DiagnosticsPanel

### Purpose

Central health and troubleshooting view.

### Sections

- app health
- Electron process health
- model health
- Hermes extension health
- plugin health
- storage health
- network/offline health
- Steam Deck compatibility health

### Acceptance Criteria

- Each failed check includes a fix hint.
- Logs can be exported with secrets redacted.
- Doctor output maps to release gates where possible.

---

# 15. Overlay Components

## 15.1 Modal

### Purpose

Focus-trapping overlay for critical decisions.

### Rules

- Must trap focus.
- B/Escape closes if cancellable.
- Destructive actions require explicit label.
- Must fit within Deck safe area.
- Must use overlay surface token.

---

## 15.2 Toast

### Purpose

Temporary notification.

### Rules

- Max three visible toasts.
- Critical errors should not be toast-only.
- Toast must be readable at Deck distance.
- Toast must not steal focus unless action required.

---

## 15.3 ConfirmDialog

### Purpose

Explicit confirmation for destructive or security-sensitive actions.

### Required Copy Pattern

```txt
Title: specific action
Body: consequence in plain language
Primary: exact destructive verb
Secondary: Cancel
```

Bad:

```txt
Are you sure?
```

Good:

```txt
Delete session "Security Lab Notes"?
This removes the local copy from this device. This cannot be undone.
[Delete Session] [Cancel]
```

---

# 16. Implementation Standards

## 16.1 React Component Rules

- Use TypeScript for all public props.
- No implicit `any` in component APIs.
- Components should be controlled where state persistence matters.
- Components should expose `data-testid` where used in tests.
- Components must not directly call Electron IPC unless they are service boundary components.
- Prefer hooks/services for IPC calls.

## 16.2 Tailwind Rules

- Tailwind config must map to CSS variables.
- No arbitrary color classes like `text-[#5EEBFF]` in production components.
- Arbitrary sizing is allowed only when tied to documented layout constraints.
- Reusable variants should use component utilities or variant helpers.

## 16.3 CSS Rules

- Global CSS only for tokens, resets, typography, focus, and platform utilities.
- Component CSS should be minimal.
- Avoid heavy backdrop filters.
- Avoid expensive box-shadows on large scrolling lists.

## 16.4 Iconography Rules

Recommended icon approach:

- Lucide React or equivalent lightweight outline icon system.
- Icons must have consistent stroke width.
- Icons used alone must have accessible labels.
- Status icons must pair with text.

---

# 17. Component Registry

The implementation package includes `component-registry.json` and `NEURODECK_Component_Registry_v1.0.csv`.

Each registry entry defines:

- component name
- tier
- route/screen usage
- accessibility requirement
- controller requirement
- token dependencies
- test priority
- implementation status

---

# 18. Required Test Coverage

## 18.1 Unit Tests

Each component must test:

- renders without crash
- required labels exist
- variant classes apply
- disabled state works
- loading state works if supported
- keyboard action works

## 18.2 Accessibility Tests

Use automated and manual testing:

- axe checks where applicable
- focus order
- label association
- contrast review
- reduced motion
- keyboard-only navigation

## 18.3 Steam Deck Manual QA

Each component used in critical flows must be tested for:

- 1280 × 800 readability
- controller focus visibility
- virtual keyboard behavior if text entry
- no clipped text
- no tiny buttons
- no nested scroll trap

---

# 19. Definition of Done

A component is production-ready only when:

```txt
Props are typed
Variants are documented
States are implemented
Focus states are visible
Accessibility rules are satisfied
Controller behavior is tested
Story/demo exists
Unit tests pass
Visual regression baseline exists
No hardcoded token violations
No direct unsafe IPC access
```

---

# 20. Build Prompt for AI Agents

Use this prompt with Claude, Codex, Kimi, Gemini, Cursor, or another coding agent.

```md
You are a senior Electron, React, TypeScript, Tailwind, accessibility, and Steam Deck UX engineer.

Implement the NEURODECK Design Tokens + Component Library v1.0 exactly from the provided specification.

Requirements:

1. Create CSS variable token files:
   - src/renderer/styles/tokens.css
   - src/renderer/styles/themes/blacksite.css
   - src/renderer/styles/themes/tactical-glass.css
   - src/renderer/styles/themes/high-contrast.css
   - src/renderer/styles/themes/reduced-motion.css
   - src/renderer/styles/themes/colorblind-safe.css

2. Create Tailwind config mapping colors, spacing, typography, radius, elevation, motion, and breakpoints to token variables.

3. Create React/TypeScript components:
   - Button
   - IconButton
   - Badge
   - TextInput
   - Select
   - AppShell
   - Panel
   - NavRail
   - TopStatusBar
   - ChatViewport
   - ResponseCard
   - InputConsole
   - CommandPalette
   - ModelCard
   - AgentCard
   - MemoryPanel
   - SessionCard
   - PluginCard
   - TelemetryWidget
   - DiagnosticsPanel
   - Modal
   - Toast
   - ConfirmDialog

4. Every component must:
   - use TypeScript props
   - use tokenized Tailwind/CSS variables
   - implement focus-visible state
   - support keyboard operation
   - document controller behavior
   - include accessible labels
   - include disabled/loading/error states where relevant
   - avoid direct unsafe Electron IPC access

5. Create component tests for render, variants, keyboard behavior, accessibility basics, disabled/loading states, and critical controller-friendly focus behavior.

6. Create component stories or demo routes if Storybook is not installed.

7. Do not hardcode colors.
8. Do not invent undocumented spacing.
9. Do not add visual effects that violate Steam Deck performance requirements.
10. Keep everything production-grade and aligned with Electron renderer constraints.

Deliver code, tests, and documentation. No placeholders. No mock architecture. No fake acceptance criteria.
```

---

# 21. Release Gate for This Design Package

This design package is accepted when:

- token files exist
- Tailwind config maps to tokens
- component registry exists
- all core components are implemented or explicitly queued
- accessibility rules are documented
- controller focus behavior is documented
- Steam Deck constraints are documented
- AI implementation prompt exists
- package checksum is generated

---

## Appendix A — Minimum Component Export Shape

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

Every component folder should contain:

```txt
ComponentName.tsx
ComponentName.test.tsx
ComponentName.stories.tsx or ComponentName.demo.tsx
ComponentName.md
index.ts
```

---

## Appendix B — Recommended Component Folder Structure

```txt
src/renderer/components/
  foundation/
    Button/
    IconButton/
    Badge/
    TextInput/
    Select/
  layout/
    AppShell/
    Panel/
    NavRail/
    TopStatusBar/
  workspace/
    ChatViewport/
    ResponseCard/
    InputConsole/
    CommandPalette/
  systems/
    ModelCard/
    AgentCard/
    MemoryPanel/
    SessionCard/
    PluginCard/
  ops/
    TelemetryWidget/
    DiagnosticsPanel/
  overlays/
    Modal/
    Toast/
    ConfirmDialog/
```

---

## Appendix C — Token Violation Examples

Bad:

```tsx
<div className="bg-[#11161C] text-[#E8F4FF] p-[19px]">
```

Good:

```tsx
<div className="bg-surface-secondary text-text-primary p-4">
```

Bad:

```tsx
<button className="outline-none">
```

Good:

```tsx
<button className="focus-visible:nd-focus-ring">
```
