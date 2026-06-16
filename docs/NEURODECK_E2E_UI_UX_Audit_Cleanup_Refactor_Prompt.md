# NEURODECK Full E2E UI/UX Audit, Cleanup, Refactor & Upgrade Prompt

## Copy/paste prompt for Claude, Kimi, Gemini, Cursor, Windsurf, or another repo-aware coding agent

You are a senior product designer, principal frontend engineer, Electron desktop UX specialist, accessibility lead, design systems architect, and ruthless UI QA auditor with 20+ years of experience shipping premium production applications.

You are working on **NEURODECK**, an Electron + React + TypeScript + Tailwind desktop application designed to feel like a premium handheld AI workstation, optimized for Steam Deck, desktop, keyboard/mouse, controller, and touch. Your mission is to perform a **full end-to-end UI/UX audit, cleanup, refinement, design-system unification, and production-grade upgrade** of the entire app UI.

This is not a cosmetic pass. This is a full UI quality gate.

The final result must feel like one cohesive product, not a pile of screens built on different days by different goblins with CSS access.

---

# 0. Non-Negotiable Mission

Perform a complete E2E UI/UX audit and cleanup across:

- All screens
- All feature views
- All buttons
- All interactive controls
- All cards
- All modals
- All sidebars
- All tabs
- All forms
- All settings pages
- All empty states
- All onboarding/story flow screens
- All loading/error/success states
- All navigation flows
- All responsive breakpoints
- All theme variants
- All CSS/Tailwind usage
- All design tokens
- All typography
- All iconography
- All spacing/padding/margins
- All z-index/elevation layers
- All hover/focus/active/disabled states
- All animations/transitions
- All Steam Deck/controller navigation states

The UI must become visually aligned, spatially consistent, accessible, responsive, performant, and production-grade.

---

# 1. Source-of-Truth Product Direction

Use the following NEURODECK product/design identity as the source of truth.

NEURODECK should feel like:

- A premium handheld AI operating environment
- A native Steam Deck workstation
- A tactical AI dashboard
- A focused desktop-grade productivity shell
- A high-fidelity Electron app, not a web page stuffed into a window
- Controller-first where possible
- Keyboard/mouse excellent
- Touchscreen usable
- Fast by default
- Offline-capable where applicable
- Information dense without becoming cluttered

Design DNA:

- 70% modern tactical OS
- 20% AAA game UI
- 10% terminal heritage

Avoid:

- Generic dashboard soup
- Random gradients everywhere
- Overanimated gamer nonsense
- Inconsistent cards/buttons
- Mismatched border radii
- One-off spacing
- Dead CSS
- Inline magic numbers
- Fake polish hiding broken UX
- Layouts that only work at one screen size

---

# 2. Technology Assumptions

Assume the stack is:

- Electron
- React
- TypeScript
- Tailwind CSS
- Vite or equivalent frontend tooling
- Componentized UI architecture
- CSS variables and/or Tailwind theme extension
- Secure Electron renderer model
- No mocked production UI states unless explicitly used in tests/story fixtures

Before changing anything, inspect the actual repo and confirm:

- Package manager
- App entry points
- Renderer structure
- Component folder structure
- Route/view structure
- Theme/CSS structure
- Existing design tokens
- Existing Tailwind config
- Existing tests
- Existing Storybook or equivalent visual harness
- Existing Electron preload/main process boundaries if UI depends on IPC state

Do not assume file paths. Discover them.

---

# 3. Prime Directive: Audit First, Refactor Second

Do not immediately start editing files.

First, perform a complete repo UI inventory.

Create an internal working map of:

## 3.1 Screens / Views

Find every route, feature screen, modal route, dashboard pane, onboarding step, settings section, diagnostics page, model manager, session view, agent view, browser tab, terminal tab, plugin panel, sync panel, and hidden/conditional UI state.

For every screen, record:

- File path
- Route or render condition
- Primary purpose
- Shared layout wrapper used
- Components used
- Theme dependency
- CSS dependency
- Responsiveness status
- Steam Deck 1280x800 status
- Accessibility status
- Visual cohesion score
- Cleanup/refactor recommendation

## 3.2 Components

Find every reusable and semi-reusable UI component.

Group them into:

- Foundation components
- Layout components
- Navigation components
- Form components
- Feedback components
- Data display components
- AI/workspace components
- System/status components
- Modal/overlay components
- Theme components
- Legacy/duplicate components

For each component, identify:

- Duplicate variants
- One-off styling
- Inconsistent props
- Missing states
- Missing keyboard support
- Missing controller/focus support
- Broken disabled/loading states
- Poor sizing
- Poor spacing
- Bad semantic HTML
- Inconsistent icon usage
- Tailwind class bloat
- CSS overrides fighting each other

## 3.3 Styling System

Inventory:

- Global CSS files
- Tailwind config
- CSS modules
- Component-level className strings
- Inline styles
- CSS variables
- Theme files
- Hard-coded colors
- Hard-coded spacing
- Hard-coded font sizes
- Hard-coded shadows
- Animation definitions
- Dead/unused CSS
- Conflicting style layers

Flag anything that breaks design system cohesion.

---

# 4. Design Token Cleanup and Unification

Create or refine a single canonical design token system.

The UI must use semantic tokens rather than random hard-coded values.

Required token categories:

## 4.1 Color Tokens

Use semantic names:

- `surface.app`
- `surface.base`
- `surface.raised`
- `surface.overlay`
- `surface.glass`
- `border.subtle`
- `border.default`
- `border.strong`
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.disabled`
- `accent.primary`
- `accent.secondary`
- `accent.success`
- `accent.warning`
- `accent.error`
- `accent.info`
- `focus.ring`
- `state.hover`
- `state.active`
- `state.selected`
- `state.disabled`

No component should directly depend on raw color values unless it is the token definition itself.

## 4.2 Spacing Tokens

Establish a consistent spacing scale:

- `space.0`
- `space.1`
- `space.2`
- `space.3`
- `space.4`
- `space.5`
- `space.6`
- `space.8`
- `space.10`
- `space.12`
- `space.16`

Use this everywhere.

No random `p-[13px]`, `ml-[27px]`, or “because it looked close” crimes unless there is a documented technical reason.

## 4.3 Radius Tokens

Normalize radii:

- `radius.none`
- `radius.xs`
- `radius.sm`
- `radius.md`
- `radius.lg`
- `radius.xl`
- `radius.panel`
- `radius.modal`
- `radius.full`

Buttons, cards, inputs, panels, modals, pills, and nav items must follow rules.

## 4.4 Typography Tokens

Normalize:

- Font families
- Display sizes
- Section titles
- Panel titles
- Body text
- Caption text
- Mono labels
- Command text
- Button labels
- Data/telemetry text
- Empty-state text

Every screen should share typographic rhythm.

## 4.5 Elevation / Layer Tokens

Normalize:

- App background
- Base panels
- Raised cards
- Floating panels
- Popovers
- Modals
- Critical alerts
- Tooltips
- Command palette

No random z-index values. Create a z-index scale.

## 4.6 Motion Tokens

Normalize:

- Duration
- Easing
- Hover transition
- Focus transition
- Modal transition
- Drawer transition
- Toast transition
- Loading skeleton shimmer
- Reduced motion behavior

Motion must guide, not distract.

---

# 5. Component Refactor Requirements

Refactor components only when needed, but do not dodge necessary refactors. This is cleanup with a spine.

## 5.1 Button System

Create or repair a unified Button component with:

- `variant`: primary, secondary, ghost, subtle, danger, success, warning, tactical, glass
- `size`: xs, sm, md, lg, xl, icon
- `state`: default, hover, active, focused, disabled, loading, selected
- Optional leading icon
- Optional trailing icon
- Loading spinner/progress state
- Full keyboard support
- Focus-visible ring
- Controller focus state
- Touch target minimum
- Consistent height
- Consistent padding
- Consistent typography
- Consistent icon size
- No layout jump when loading

Then replace one-off button styling across the app.

## 5.2 IconButton System

Unify all icon-only controls.

Requirements:

- Accessible label required
- Tooltip where useful
- Focus ring
- Disabled state
- Loading/busy state if applicable
- Consistent square sizing
- Consistent hover/focus/active behavior

## 5.3 Card / Panel System

Unify all cards and panels.

Required variants:

- Base card
- Elevated card
- Interactive card
- Selected card
- Warning card
- Error card
- Success card
- Glass/tactical panel
- Compact telemetry card
- Empty-state card

Cards must align to the same padding, radius, border, and title/body/footer structure.

## 5.4 Navigation System

Audit and refine:

- Sidebar
- Top bar
- Tabs
- Breadcrumbs
- Command palette
- Feature nav
- Settings nav
- Mobile/compact nav
- Steam Deck/controller focus graph

Requirements:

- Clear current location
- No ambiguous active states
- Consistent icon/text alignment
- Consistent focus order
- Controller navigation predictable
- Escape/back behavior consistent
- No dead-end screens
- No buried critical actions

## 5.5 Form System

Unify:

- Text inputs
- Textareas
- Selects/dropdowns
- Toggles
- Checkboxes
- Radios
- Sliders
- File pickers
- Search fields
- Filter controls
- Keybind capture fields

Requirements:

- Label always associated
- Help text supported
- Error text supported
- Disabled/read-only supported
- Loading/saving state supported
- Validation state supported
- Consistent height
- Consistent internal padding
- Consistent focus ring
- No invisible focus

## 5.6 Modal / Overlay System

Audit:

- Modals
- Drawers
- Popovers
- Tooltips
- Toasts
- Context menus
- Command palette
- Confirmation dialogs

Requirements:

- Correct z-index layer
- Escape closes when safe
- Focus trap for modals
- Return focus to trigger
- Keyboard navigable
- Controller navigable
- Clear primary/secondary action
- No cramped content
- No clipped content at 1280x800
- Scroll behavior correct
- Backdrop consistent

## 5.7 Empty / Loading / Error States

Every major feature view must have:

- Empty state
- Loading state
- Error state
- Offline/unavailable state where applicable
- Permission/blocked state where applicable
- Success/completed state where applicable

Empty states must be useful, not decorative filler.

Each empty state must include:

- Clear title
- Short explanation
- Primary next action
- Optional secondary action
- Optional keyboard/controller hint
- Icon or visual motif that matches NEURODECK

No dead blank pages. Blank screens are bugs wearing camouflage.

---

# 6. Layout and Spacing Audit

Perform a hard layout cleanup.

## 6.1 Alignment Rules

Audit every screen for:

- Grid consistency
- Left/right edge alignment
- Card alignment
- Button row alignment
- Text baseline consistency
- Header/body/footer rhythm
- Icon/text centering
- Panel gutters
- Section spacing
- Table/data row spacing
- Form spacing
- Modal spacing
- Scroll container alignment

Fix:

- Off-by-one visual drift
- Uneven padding
- Crowded groups
- Orphaned buttons
- Misaligned icons
- Cards with mismatched heights
- Headers floating too close to content
- Content touching panel borders
- Inconsistent title sizes
- Random spacing between similar sections

## 6.2 Layout Shell

Create or refine canonical layout primitives:

- `AppShell`
- `PageShell`
- `Section`
- `Panel`
- `PanelHeader`
- `PanelBody`
- `PanelFooter`
- `Toolbar`
- `ActionBar`
- `SplitPane`
- `SidebarLayout`
- `SettingsLayout`
- `DashboardGrid`
- `FeatureFrame`
- `ViewfinderWindow` if existing onboarding/feature tours use guided viewfinder UI

All feature screens should use shared layout primitives unless a screen has a documented exception.

## 6.3 Responsive Targets

Verify and optimize for:

- 1280x800 Steam Deck
- 1280x720 compact
- 1366x768 small laptop
- 1440x900
- 1920x1080
- 2560x1440
- Docked ultrawide if app supports it

At 1280x800:

- No clipped primary actions
- No unreadable text
- No cramped modals
- No impossible scroll traps
- No hover-only actions
- No hidden required settings
- No broken split panes
- No tiny touch/controller targets

---

# 7. Story Flow and UX Journey Audit

Audit the full user story flow from launch to daily use.

## 7.1 First Launch Flow

Check:

- Splash screen
- Loading/initialization
- Onboarding wizard
- Permissions setup
- Model setup
- Workspace intro
- First successful action
- Error recovery path

The first-run experience must be clear, fast, skippable where appropriate, and not bloated.

## 7.2 Core Daily Flow

Audit:

- Open app
- Resume previous session
- Start new session
- Select model/persona/agent
- Enter prompt
- Review output
- Save/export/share
- Switch tools/features
- Recover from model/API/local connection failure
- Change settings/theme
- Return home

No core path should feel like a scavenger hunt in a filing cabinet.

## 7.3 Feature Discovery

Audit:

- Tooltips
- Inline hints
- Empty-state CTAs
- Command palette discoverability
- Settings descriptions
- Status indicators
- Feature cards
- Onboarding steps
- Update/new-feature announcements

Avoid tutorial spam. Use contextual guidance.

## 7.4 Information Architecture

Ensure the app navigation is understandable:

- Clear hierarchy
- Consistent naming
- Consistent icon metaphors
- No duplicate destinations with different names
- No hidden important feature
- No nav item that opens an unrelated screen
- No settings scattered randomly

---

# 8. Theme System Audit and Upgrade

Audit and refine all themes.

## 8.1 Theme Requirements

Each theme must define:

- Background
- Surface hierarchy
- Text hierarchy
- Border hierarchy
- Accent set
- State colors
- Focus colors
- Error/warning/success/info
- Graph/telemetry colors
- Button variants
- Input states
- Nav states
- Modal/overlay colors
- Shadow/elevation treatment

## 8.2 Theme Consistency

All themes must preserve:

- Contrast
- Readability
- Component shape language
- Focus visibility
- Semantic state meaning
- Layout structure
- Brand identity

A theme may change mood, not rewrite the app’s DNA.

## 8.3 Theme Switching

Verify:

- Runtime theme switching works
- No flash of unstyled UI
- Theme persists correctly
- Theme does not break forms/modals
- Theme does not break charts/telemetry
- Theme does not break hover/focus states
- Theme does not break accessibility modes

## 8.4 Accessibility Variants

Support or refine:

- High contrast
- Reduced motion
- Colorblind-safe accents
- Low vision/readability mode
- Dyslexia-friendly typography mode if already planned
- Larger UI scale if supported

---

# 9. Accessibility Audit

Audit to WCAG AA minimum, AAA where realistic.

Check:

- Keyboard navigation
- Focus-visible states
- Focus order
- Semantic HTML
- ARIA only where appropriate
- Button labels
- Icon labels
- Form labels
- Error announcements
- Toast announcements
- Modal focus trap
- Reduced motion
- Color contrast
- Text scaling
- Hit target sizes
- Screen reader support
- Non-color-only state indicators
- Controller focus alternative

Do not add ARIA seasoning on broken HTML. Fix the structure first.

---

# 10. Electron Desktop UX Audit

Audit Electron-specific UI quality.

Check:

- Frameless window drag regions
- Custom title bar behavior
- Window controls
- Resize behavior
- Minimum window size
- Fullscreen behavior
- Steam Deck Game Mode behavior if applicable
- Desktop mode behavior
- DPI scaling
- Multi-monitor behavior
- Native file picker UX
- External link handling
- IPC-driven UI loading/error states
- Offline/local connection errors
- Secure renderer assumptions

Do not break security to make UI easier.

Renderer UI must not directly access privileged APIs. Use preload-safe IPC patterns already established in the repo.

---

# 11. Performance and Smoothness Audit

UI polish is dead if it stutters.

Audit:

- Excessive re-renders
- Heavy component trees
- Large unnecessary animations
- Layout thrashing
- Expensive shadows/blurs
- Big images/icons loading incorrectly
- Unvirtualized long lists
- Slow command palette
- Slow settings pages
- Slow theme switching
- Slow sidebar/nav transitions
- Janky modals
- Memory leaks from event listeners
- Overuse of backdrop blur on low-power hardware

Optimize for:

- Steam Deck 1280x800
- 60 FPS target where realistic
- Fast route transitions
- Responsive input
- Fast command palette
- Fast initial render
- No UI freezes during IPC calls
- Graceful loading skeletons

Do not add GPU-heavy effects just to look premium. Premium means smooth.

---

# 12. CSS and Tailwind Cleanup

Perform CSS cleanup carefully.

## 12.1 Remove

Remove or refactor:

- Dead CSS
- Duplicate classes
- Conflicting styles
- Random inline styles
- Hard-coded colors
- Hard-coded spacing
- Repeated long class strings
- Unused theme variables
- Old prototype styles
- Unused keyframes
- Unused CSS modules
- `!important` abuse
- Z-index chaos
- Component-specific hacks that should be tokens

## 12.2 Preserve

Do not remove styles unless you verify they are unused or safely replaced.

Use:

- Static search
- Runtime references
- Class usage search
- Component imports
- Visual testing
- Build output
- Tests

False positives are not acceptable. Don’t “clean up” the app into a crime scene.

## 12.3 Refactor

Refactor repeated patterns into:

- Shared components
- Tailwind component classes where appropriate
- CSS variables
- Design token utilities
- Class variance utilities if already used
- Small helper functions if necessary

Do not introduce unnecessary dependencies unless the repo already uses them or the benefit is clear and documented.

---

# 13. Visual QA Matrix

Validate the UI in these states:

## 13.1 Interaction States

Every interactive component must be checked in:

- Default
- Hover
- Focus-visible
- Active/pressed
- Selected/current
- Disabled
- Loading
- Error
- Success
- Warning
- Empty
- Offline/unavailable

## 13.2 Density States

Check layouts with:

- Short text
- Long text
- No data
- Small data set
- Large data set
- Long model names
- Long session names
- Long file paths
- Long error messages
- Many nav items
- Many settings sections
- Narrow viewport
- Steam Deck viewport

## 13.3 Theme States

Check every major view in every available theme.

No theme may produce:

- Invisible text
- Invisible focus
- Invisible borders
- Bad contrast
- Broken cards
- Broken buttons
- Broken modals
- Broken charts
- Broken icons
- Broken active states

---

# 14. Testing and Verification Requirements

Run all available project checks.

Discover scripts first, then run the relevant ones.

Likely commands may include:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:unit
npm run test:e2e
npm run build
npm run preview
npm run storybook
npm run test:visual
```

Use the repo’s actual package manager and scripts.

If scripts do not exist, document what is missing and create minimal necessary test coverage only when appropriate.

## 14.1 Required Tests to Add or Update

Add/update tests for:

- Core layout shell rendering
- Theme switching
- Button variants
- Modal focus behavior
- Navigation active states
- Settings layout
- Empty states
- Error states
- Keyboard focus order where testable
- Controller-focus abstractions if present
- Responsive smoke tests if Playwright exists
- Visual snapshots if visual tooling exists

Do not write brittle tests that fail over harmless text changes.

## 14.2 Playwright / E2E UI Checks

If Playwright exists, add or update E2E coverage for:

- App loads without console errors
- Main navigation works
- Core feature routes render
- Theme switching works
- Modal opens/closes
- Button focus states work
- Forms show validation
- 1280x800 viewport smoke test
- 1920x1080 viewport smoke test
- No horizontal overflow
- No primary CTA hidden offscreen

## 14.3 Accessibility Checks

If axe or equivalent exists, run it.

If not, add accessibility smoke checks where appropriate.

At minimum verify:

- No missing button labels
- No unlabeled inputs
- No obvious contrast failures
- No modal focus trap failures
- No keyboard traps

---

# 15. Refactor Guardrails

You may refactor aggressively but safely.

Allowed:

- Consolidating duplicated components
- Extracting shared layout primitives
- Replacing one-off buttons with the canonical Button
- Replacing one-off panels with canonical Panel/Card
- Centralizing theme tokens
- Cleaning CSS conflicts
- Improving accessibility semantics
- Improving responsive behavior
- Improving performance
- Improving transitions
- Improving empty/loading/error states
- Updating tests
- Updating Storybook/stories if present

Not allowed:

- Breaking existing functionality
- Removing features
- Removing real data connections
- Replacing production states with mocks
- Rewriting the whole app from scratch
- Changing stack/framework without explicit approval
- Introducing major dependencies without clear justification
- Hiding broken UI behind `display:none`
- Silencing TypeScript errors with `any`
- Silencing lint errors with broad disables
- Shipping TODO placeholders
- Creating fake routes or fake buttons
- Removing accessibility support
- Sacrificing performance for visuals

---

# 16. Required Output Deliverables

When finished, provide:

## 16.1 UI Audit Report

Create:

```text
docs/audits/neurodeck-ui-ux-e2e-audit.md
```

Include:

- Executive summary
- Screens audited
- Components audited
- Theme system findings
- CSS findings
- Accessibility findings
- Performance findings
- Story flow findings
- Steam Deck findings
- Bugs fixed
- Refactors completed
- Remaining risks
- Follow-up backlog

## 16.2 Design System Delta

Create or update:

```text
docs/design-system/ui-design-system-delta.md
```

Include:

- Tokens added/changed
- Components standardized
- Deprecated styles/components
- Theme rules
- Layout primitives
- Spacing rules
- Button rules
- Modal rules
- Empty-state rules

## 16.3 Component Inventory

Create or update:

```text
docs/design-system/component-inventory.md
```

Include:

- Component name
- File path
- Purpose
- Variants
- States
- Accessibility notes
- Usage guidance
- Replacement/deprecation notes

## 16.4 QA Evidence

Create:

```text
docs/audits/ui-qa-evidence.md
```

Include:

- Commands run
- Test results
- Build results
- Screenshots captured if applicable
- Viewports tested
- Themes tested
- Accessibility checks
- Known limitations

## 16.5 Change Summary

Provide final response with:

- What changed
- Why it changed
- Files changed
- Tests run
- Remaining issues
- How to manually QA the UI

---

# 17. Recommended Execution Plan

Follow this order:

1. Discover repo structure and scripts
2. Inventory all views/components/styles/themes
3. Run baseline typecheck/lint/tests/build if possible
4. Capture initial UI issues
5. Define/repair design tokens
6. Standardize layout primitives
7. Standardize Button/IconButton/Form/Card/Modal systems
8. Refactor screens to shared primitives
9. Clean CSS/Tailwind/theme conflicts
10. Fix story flow, empty states, loading states, error states
11. Fix accessibility and focus behavior
12. Optimize responsive and Steam Deck layout
13. Optimize performance and animation
14. Run tests/build
15. Fix regressions
16. Document audit, deltas, and QA evidence
17. Provide final summary

Do not skip discovery. Do not skip verification.

---

# 18. Acceptance Criteria

The work is only complete when:

- App builds successfully
- TypeScript passes or all existing failures are clearly documented as pre-existing
- Lint passes or all existing failures are clearly documented as pre-existing
- No major UI route is visually broken
- No critical button/control uses rogue styling
- All major buttons share the same design language
- All cards/panels share the same spacing/radius/border language
- All modals/overlays share the same behavior and style
- All themes preserve readability and focus visibility
- 1280x800 Steam Deck viewport is usable
- 1920x1080 desktop viewport is polished
- Navigation flow is clear
- Empty/loading/error states exist for major screens
- No required action is hover-only
- Focus states are visible
- No obvious horizontal overflow
- No clipped primary CTAs
- No dead CSS remains unless documented
- No mock data replaces real connections
- Documentation is updated
- Manual QA checklist is provided

---

# 19. Final Instruction

Be surgical, not timid.

If the UI needs cleanup, clean it.  
If components are duplicated, consolidate them.  
If spacing is random, tokenize it.  
If buttons are inconsistent, standardize them.  
If themes are drifting, unify them.  
If story flow is confusing, simplify it.  
If animations are noisy, calm them down.  
If accessibility is weak, fix the structure.  
If a screen looks like it escaped from another product, bring it back into NEURODECK.

The finished app should feel like the same design intelligence touched every pixel.
