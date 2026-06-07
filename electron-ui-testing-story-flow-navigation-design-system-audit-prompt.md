# Electron UI Testing, Story Flow, Navigation Flow, Iconography, Typography & Design System Audit Prompt

## Purpose

Use this prompt with Kimi Code, Claude Code, Gemini CLI, or another advanced coding agent when you need a full UI/UX testing and design-system quality pass for an Electron application.

This prompt is specifically designed for Electron applications, including:

- Electron renderer UI testing
- Main/preload/renderer awareness
- Desktop window resizing behavior
- Navigation flow testing
- Story/user journey testing
- Iconography audit
- Typography audit
- Design system audit
- Layout consistency
- Visual regression readiness
- Accessibility-aware UI validation
- Responsive and handheld/Steam Deck checks
- Component story coverage
- State coverage
- QA reporting

The goal is to make the app look, feel, navigate, and behave like a polished production desktop application instead of a prototype wearing a nice jacket.

---

# ROLE

You are a senior UX designer, senior UI engineer, senior QA automation engineer, senior Electron application engineer, design systems architect, accessibility specialist, and visual QA analyst.

Your task is to perform a full UI testing, story flow, navigation flow, iconography, typography, and design system audit across this Electron application.

You must identify, document, test, and fix issues directly in the codebase.

Do not only report problems. Implement safe, production-quality improvements.

---

# PRIMARY OBJECTIVE

Audit and improve the complete UI layer of this Electron application so that:

- Every major user journey works
- Every story flow is validated
- Every navigation path is tested
- Every route/view renders correctly
- Every major component state is covered
- Every icon is consistent, meaningful, accessible, and correctly sized
- Every typography pattern is consistent and readable
- Every design token is used correctly
- Every layout respects spacing, sizing, rhythm, and hierarchy
- Every UI state is polished
- Every desktop window size behaves properly
- Every modal, drawer, menu, tab, tooltip, and overlay works
- Every important UI interaction is keyboard accessible
- Every visual pattern feels intentional and product-ready
- The app is ready for automated UI regression testing

This is not a redesign request. Preserve the existing product identity unless something is broken, inconsistent, inaccessible, or low quality.

---

# HARD RULES

1. Do not break existing functionality.
2. Do not rewrite the entire UI unnecessarily.
3. Do not introduce a new design system unless the current one is missing or unusable.
4. Do not replace working components with unrelated components for style preference.
5. Do not make random cosmetic changes without clear reason.
6. Do not add fake tests that do not verify behavior.
7. Do not add snapshot spam as a substitute for meaningful tests.
8. Do not skip failing tests.
9. Do not weaken assertions to force tests to pass.
10. Do not add heavy dependencies unless clearly justified.
11. Do not remove accessibility behavior.
12. Do not rely only on hover interactions.
13. Do not use icon-only controls without accessible labels.
14. Do not allow typography, spacing, colors, shadows, or radii to drift between screens.
15. Do not expose unsafe Electron APIs to the renderer while fixing UI behavior.
16. Do not modify main/preload security boundaries unless required for safe UI testing.
17. Every change must improve UI fidelity, navigation quality, story flow, accessibility, design consistency, testing coverage, or maintainability.

---

# ELECTRON CONTEXT REQUIREMENTS

This is an Electron application. Audit with Electron-specific realities in mind.

Identify:

- Electron version
- Main process entry
- Preload script entry
- Renderer entry
- Window creation logic
- BrowserWindow size constraints
- Custom title bar usage
- Native menu usage
- Tray/menu usage
- IPC APIs exposed to renderer
- Routing method inside renderer
- Packaging/build system
- Existing UI test tooling
- Existing component/story tooling
- Existing visual regression tooling
- Existing accessibility tooling

Respect the main/preload/renderer separation:

- Main process handles privileged desktop operations.
- Preload exposes only narrow, safe APIs.
- Renderer owns UI and interaction.
- UI tests should not require unsafe Node access in renderer.
- Do not expose generic IPC just to make tests easier.
- Test helpers must not weaken production security.

---

# DISCOVERY PHASE

Begin by scanning the full repository.

Identify:

- Project name
- App purpose
- Electron framework/build setup
- Package manager
- Frontend framework
- Styling system
- Component library
- Icon library
- Font system
- Design token system
- Animation library
- Router/navigation system
- State management
- Existing routes/views
- Existing navigation menus
- Existing settings screens
- Existing forms
- Existing modals/dialogs
- Existing tables/lists/cards
- Existing empty/loading/error states
- Existing tests
- Existing Storybook or component docs
- Existing Playwright/Cypress/E2E setup
- Existing accessibility tests
- Existing visual regression tests
- Existing CI workflow
- Existing docs

Then create an internal UI coverage map before changing code.

---

# REQUIRED DOCUMENTS TO CREATE OR UPDATE

Create or update these files when appropriate:

```txt
docs/ui-audit-map.md
docs/navigation-flow-map.md
docs/story-flow-map.md
docs/design-system-audit.md
docs/iconography-audit.md
docs/typography-audit.md
docs/ui-testing-strategy.md
```

Only create docs that make sense for this repo. Keep them useful and project-specific.

---

# UI AUDIT MAP REQUIREMENT

Create or update:

```txt
docs/ui-audit-map.md
```

Use this structure:

```md
# UI Audit Map

## App Overview

## UI Stack

- Electron:
- Renderer framework:
- Styling system:
- Component library:
- Icon library:
- Font system:
- Animation system:
- Test tools:

## Main UI Surfaces

| Surface | Route/View | Components | State Coverage | Test Coverage | Risk |
|---|---|---|---|---|---|

## Layout Shells

| Shell | Used By | Responsive Behavior | Issues | Status |
|---|---|---|---|---|

## Shared Components

| Component | Variants | States | Accessibility | Test Coverage | Status |
|---|---|---|---|---|---|

## Navigation Systems

| Nav System | Location | Desktop | Compact | Keyboard | Status |
|---|---|---|---|---|---|

## Modal / Overlay Systems

| Component | Trigger | Focus Behavior | Escape Behavior | Test Coverage | Status |
|---|---|---|---|---|---|

## Visual Risk Areas

## Accessibility Risk Areas

## Testing Gaps
```

---

# STORY FLOW MAP REQUIREMENT

Create or update:

```txt
docs/story-flow-map.md
```

A story flow is a complete user journey with a beginning, decision points, success states, error states, and recovery states.

Use this structure:

```md
# Story Flow Map

## Story: Example User Journey

### User Goal

Describe what the user is trying to accomplish.

### Entry Points

- Route:
- Navigation source:
- Deep link:
- Menu action:

### Preconditions

- Auth state:
- Required data:
- Required permissions:
- Required settings:

### Happy Path

1. User opens...
2. User clicks...
3. User enters...
4. User confirms...
5. User sees success...

### Alternate Paths

- Empty data:
- Existing data:
- Invalid input:
- Permission denied:
- Cancel/back:
- Retry:

### Failure Paths

- Network failure:
- IPC failure:
- Missing data:
- Validation error:
- Unexpected error:

### UI States Required

- Loading:
- Empty:
- Error:
- Success:
- Disabled:
- Focused:
- Hover:
- Active:
- Selected:

### Tests Required

- Unit:
- Component:
- Integration:
- E2E:
- Accessibility:
- Visual:

### Coverage Status

- Covered / Partial / Missing
```

Map every important user journey.

Examples:

- First app launch
- Login/logout
- Onboarding
- Dashboard arrival
- Main feature flow
- Create/edit/delete flow
- Search/filter/sort flow
- Settings update flow
- Profile update flow
- Import/export flow
- File picker flow
- Save/open flow
- Update available flow
- Error recovery flow
- Empty state recovery flow
- Admin flow, if present
- Help/support flow, if present

---

# NAVIGATION FLOW MAP REQUIREMENT

Create or update:

```txt
docs/navigation-flow-map.md
```

Use this structure:

```md
# Navigation Flow Map

## Navigation Inventory

| Source | Nav Item | Target | Auth Required | Expected Page | Active State | Test Status |
|---|---|---|---:|---|---|---|

## Desktop Navigation

Document sidebar, header, menu bar, tabs, breadcrumbs, footer links, and command palette if present.

## Compact / Handheld Navigation

Document collapsed sidebar, drawer nav, bottom nav, hamburger menu, tab overflow, and Steam Deck behavior if present.

## Native Electron Navigation

Document native app menu items, tray menu items, global shortcuts, deep links, file-open events, and window controls.

## Navigation Test Requirements

- All primary nav items tested
- All secondary nav items tested
- All settings nav items tested
- All menu items tested where practical
- Active state tested
- Auth redirects tested
- 404 tested
- Dynamic routes tested
- Browser back/forward tested
- Keyboard navigation tested
- Focus after navigation tested
- Compact nav tested
- Electron native menu actions tested where practical
```

---

# DESIGN SYSTEM AUDIT REQUIREMENT

Create or update:

```txt
docs/design-system-audit.md
```

Audit the complete design system.

Include:

```md
# Design System Audit

## Design System Overview

- Token source:
- Component source:
- Theme system:
- Supported themes:
- Styling approach:
- Icon system:
- Typography system:
- Animation system:

## Design Tokens

| Token Category | Source | Usage Quality | Issues | Status |
|---|---|---|---|---|
| Color |  |  |  |  |
| Spacing |  |  |  |  |
| Typography |  |  |  |  |
| Radius |  |  |  |  |
| Shadow |  |  |  |  |
| Z-index |  |  |  |  |
| Motion |  |  |  |  |
| Breakpoints |  |  |  |  |

## Component Inventory

| Component | Variants | States | Token Usage | Accessibility | Test Coverage | Status |
|---|---|---|---|---|---|---|

## Design Drift Issues

List inconsistent UI patterns.

## Required Fixes

List and implement fixes.
```

---

# ICONOGRAPHY AUDIT REQUIREMENT

Create or update:

```txt
docs/iconography-audit.md
```

Audit all icon usage.

Check:

- Icon library consistency
- Mixed icon sets
- Inconsistent stroke widths
- Inconsistent sizes
- Misaligned icons
- Incorrect icon meanings
- Decorative icons exposed to screen readers
- Action icons missing accessible names
- Icons used without text where text is needed
- Icons that do not match user expectations
- Icons with poor contrast
- Icons clipped by containers
- Icons not aligned with text baseline
- Icons changing size between states
- Icons in buttons, nav, tabs, badges, empty states, alerts, menus, and dialogs

Use this structure:

```md
# Iconography Audit

## Icon System

- Icon library:
- Default size:
- Default stroke:
- Filled/outlined style:
- Color behavior:
- Accessibility approach:

## Icon Inventory

| Location | Icon | Purpose | Size | Accessible Name | Decorative | Issue | Status |
|---|---|---|---:|---|---:|---|---|

## Icon Rules

- Standard icon sizes:
- Standard nav icon size:
- Standard button icon size:
- Standard empty state icon size:
- Standard status icon size:
- Stroke/fill rules:
- Color/token rules:
- Labeling rules:

## Issues Found

## Fixes Applied
```

Implementation requirements:

- Use one primary icon system unless there is a clear reason.
- Normalize icon sizes.
- Normalize icon alignment.
- Use design tokens for icon colors.
- Add `aria-hidden="true"` for decorative icons.
- Add accessible labels for icon-only buttons.
- Avoid using icon-only controls for unclear actions.
- Ensure active/disabled/error/success icon states are clear.
- Ensure icons scale correctly at high zoom.

---

# TYPOGRAPHY AUDIT REQUIREMENT

Create or update:

```txt
docs/typography-audit.md
```

Audit all typography.

Check:

- Font loading
- Font fallback
- Font weights
- Heading scale
- Body text scale
- Caption text scale
- Button text
- Form label text
- Table text
- Navigation text
- Modal text
- Empty state text
- Error text
- Toast text
- Line height
- Letter spacing
- Text wrapping
- Truncation
- Long strings
- Internationalization readiness
- High zoom behavior
- Contrast
- Readability on Steam Deck / handheld
- Typography consistency across pages

Use this structure:

```md
# Typography Audit

## Typography System

- Primary font:
- Fallback stack:
- Scale source:
- Heading scale:
- Body scale:
- Line-height system:
- Letter-spacing system:
- Font loading strategy:

## Type Scale

| Role | Size | Line Height | Weight | Token/Class | Usage |
|---|---:|---:|---:|---|---|
| Display |  |  |  |  |  |
| H1 |  |  |  |  |  |
| H2 |  |  |  |  |  |
| H3 |  |  |  |  |  |
| Body |  |  |  |  |  |
| Small |  |  |  |  |  |
| Caption |  |  |  |  |  |
| Button |  |  |  |  |  |
| Label |  |  |  |  |  |

## Typography Inventory

| Location | Current Style | Intended Role | Issue | Fix | Status |
|---|---|---|---|---|---|

## Issues Found

## Fixes Applied
```

Implementation requirements:

- Use semantic heading hierarchy.
- Avoid random one-off font sizes.
- Use tokens/classes for type roles.
- Ensure readable line heights.
- Ensure long text wraps safely.
- Ensure truncation only happens where product-safe.
- Ensure full content remains accessible if truncated.
- Ensure button/input text does not clip.
- Ensure text remains readable at 200% zoom.
- Ensure typography works at 1280 × 800 Steam Deck resolution.

---

# UI TESTING STRATEGY REQUIREMENT

Create or update:

```txt
docs/ui-testing-strategy.md
```

Use this structure:

```md
# UI Testing Strategy

## Testing Stack

- Unit:
- Component:
- Integration:
- E2E:
- Visual:
- Accessibility:
- Electron-specific:

## Test Layers

## What Must Be Tested

## What Should Not Be Over-Tested

## Selectors Strategy

## Test Data Strategy

## Electron Testing Strategy

## Viewport / Window Size Strategy

## Story Flow Coverage

## Navigation Coverage

## Design System Coverage

## Accessibility Coverage

## CI Strategy

## Known Gaps
```

---

# FULL UI TESTING REQUIREMENTS

Build or improve automated UI tests.

Use existing tools where possible:

- Playwright
- Playwright Electron
- Cypress
- Vitest
- Jest
- Testing Library
- Storybook
- Storybook test runner
- Chromatic or visual regression tooling
- Axe / jest-axe / cypress-axe / Playwright accessibility checks
- WebdriverIO, if already used

Do not add heavy tooling unless clearly justified.

## Test These UI Layers

- App shell
- Window chrome / custom title bar
- Sidebar
- Header
- Footer
- Native menu actions where practical
- Tray menu actions where practical
- Primary navigation
- Secondary navigation
- Tabs
- Breadcrumbs
- Command palette, if present
- Dashboard
- Settings
- Forms
- Tables
- Cards
- Modals
- Drawers
- Dropdowns
- Tooltips
- Toasts
- Alerts
- Empty states
- Loading states
- Error states
- Search
- Filters
- Sorting
- Pagination
- Profile/account screens
- Admin screens, if present
- Help/support screens, if present
- Update prompts, if present
- File open/save dialogs where practical

---

# STORY FLOW TESTING REQUIREMENTS

For every major story flow, add or improve tests for:

- Entry point
- Happy path
- Cancel path
- Back path
- Empty state
- Loading state
- Error state
- Retry path
- Invalid input
- Missing data
- Permission denied
- Keyboard-only operation
- Screen reader-relevant labels
- Compact window behavior
- Reload/relaunch behavior where practical
- IPC failure behavior where practical
- Native Electron behavior where practical

Story flows to identify and test may include:

- First launch
- Login
- Logout
- Onboarding
- Dashboard navigation
- Main workflow
- Create/edit/delete
- Search/filter/sort
- Settings update
- Profile update
- File import
- File export
- Save/open
- Update available
- Error recovery
- Empty state recovery
- Admin/permission flow
- Help/support flow

---

# NAVIGATION FLOW TESTING REQUIREMENTS

Map and test every navigation path.

Test:

- Sidebar nav
- Top nav
- Footer nav
- Breadcrumbs
- Tabs
- Dropdown nav
- Settings nav
- Mobile/compact nav
- Steam Deck/handheld nav
- Native app menu actions
- Tray menu actions
- Keyboard shortcuts
- Deep links
- Dynamic route links
- Back/forward behavior
- Redirects
- Auth redirects
- Not-found page
- External links

For each nav item:

- It must be reachable.
- It must navigate to the correct route/view.
- It must show correct active state.
- It must preserve layout.
- It must preserve focus behavior.
- It must work with keyboard where applicable.
- It must not open unsafe external links inside the app shell.
- It must work at compact window sizes.

---

# DESIGN SYSTEM TESTING REQUIREMENTS

Add or improve tests for shared UI components.

Prioritize:

- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Slider
- Card
- Badge
- Alert
- Toast
- Modal/Dialog
- Drawer
- Dropdown/Menu
- Tooltip
- Popover
- Tabs
- Accordion
- Table
- Pagination
- EmptyState
- Loading/Skeleton
- ErrorState
- Navbar
- Sidebar
- Layout shell
- Theme provider

For each component, test:

- Renders correctly
- Supports variants
- Supports sizes
- Supports disabled state
- Supports loading state
- Supports error state
- Supports long content
- Supports keyboard interaction
- Has accessible name/role when interactive
- Uses tokens/classes consistently
- Does not crash with missing optional props
- Does not create layout overflow
- Works in light/dark/theme variants if supported

Do not test implementation details when user-visible behavior is better.

---

# COMPONENT STORY COVERAGE REQUIREMENTS

If Storybook or a story system exists, audit and improve it.

Each shared component should have stories for:

- Default
- All variants
- All sizes
- Disabled
- Loading
- Error
- Empty
- Long content
- Icon-leading
- Icon-trailing
- Keyboard/focus state where practical
- Dark/light theme if supported
- Compact window/container
- Accessibility notes

If Storybook does not exist, do not add it unless it clearly fits the project. Instead, create component test coverage and document the gap.

Story quality rules:

- Stories must use realistic data.
- Stories must not depend on production services.
- Stories must not expose secrets.
- Stories must demonstrate actual UI states.
- Stories should support visual regression later.

---

# ICONOGRAPHY TESTING REQUIREMENTS

Test or validate:

- Icon-only buttons have accessible names.
- Decorative icons are hidden from assistive tech.
- Icons in nav align correctly.
- Icons in buttons align correctly.
- Icons do not resize unexpectedly.
- Icons use design token colors.
- Icons remain visible in light/dark themes.
- Icons remain visible in disabled/error/success states.
- Icons do not cause layout shift.
- Icons do not clip at high zoom.
- Icons have consistent size within the same component family.

Automated tests should use accessibility queries where possible.

Example expectation:

```ts
expect(screen.getByRole("button", { name: /settings/i })).toBeVisible();
```

For decorative icons, verify the parent control has the accessible name, not the icon itself.

---

# TYPOGRAPHY TESTING REQUIREMENTS

Test or validate:

- Pages have one logical H1 where appropriate.
- Heading hierarchy is not chaotic.
- Labels are readable and associated with inputs.
- Long text does not overflow.
- Button text does not clip.
- Table text wraps/truncates safely.
- Empty/error/loading state text is visible.
- Typography remains readable in compact windows.
- Typography remains readable at 200% zoom where practical.
- Font fallback does not break layout.
- Theme changes do not reduce readability.

Use visual tests if available. Use component tests for semantic structure.

---

# LAYOUT AND WINDOW SIZE TESTING REQUIREMENTS

Electron apps must handle resizing properly.

Test important flows at:

## Minimum Window

- Configured minimum width/height
- 800 × 600
- 1024 × 768

## Common Desktop

- 1280 × 720
- 1280 × 800
- 1366 × 768
- 1440 × 900
- 1536 × 864
- 1600 × 900
- 1920 × 1080

## Large Desktop

- 2560 × 1440
- 3440 × 1440, if supported

## Steam Deck / Handheld

- 1280 × 800
- 1280 × 720
- 1366 × 768
- 1920 × 1080 docked

Check:

- No unintended horizontal scroll
- Main nav remains usable
- Sidebar behaves correctly
- Modals fit
- Tables scroll inside containers
- Cards reflow correctly
- Forms remain usable
- Buttons remain reachable
- Text wraps or truncates safely
- Custom title bar does not overlap content
- Window controls remain reachable
- Layout does not collapse at minimum size

Also audit BrowserWindow config:

- `width`
- `height`
- `minWidth`
- `minHeight`
- `resizable`
- `fullscreenable`
- `maximizable`
- `useContentSize`

Window constraints should match the UI’s real minimum usable size.

---

# ACCESSIBILITY UI TESTING REQUIREMENTS

Add or improve accessibility testing.

Test:

- Keyboard navigation
- Focus states
- Focus order
- Focus trap in dialogs
- Escape closes dismissible overlays
- Focus returns after modal close
- Forms have labels
- Inputs expose errors
- Buttons have names
- Icon buttons have names
- Tables have headers
- Alerts/toasts are announced where appropriate
- Menus/tabs/dropdowns are keyboard usable
- Color is not the only state indicator
- Reduced motion is respected
- High zoom does not break critical flows
- Custom title bar remains keyboard accessible if present

Use accessibility tooling if already present:

- axe
- jest-axe
- cypress-axe
- Playwright accessibility helpers
- Testing Library role/name queries
- Storybook a11y addon

Do not add heavy tooling unless project setup supports it cleanly.

---

# VISUAL REGRESSION REQUIREMENTS

If visual regression tooling exists, use it.

Capture important states:

- App shell
- Dashboard
- Settings
- Primary feature view
- Form default state
- Form validation state
- Empty state
- Loading state
- Error state
- Modal open
- Drawer open
- Dropdown open
- Table with data
- Table empty
- Sidebar expanded
- Sidebar collapsed
- Compact window layout
- Steam Deck 1280 × 800 layout
- Dark/light theme if supported

Do not create fragile screenshots with random data, timestamps, animations, or nondeterministic content.

Stabilize visual tests by:

- Using deterministic data
- Disabling nonessential animation in test mode
- Waiting for stable UI states
- Hiding cursor if needed
- Avoiding live external content

---

# ANIMATION AND MICROINTERACTION AUDIT

Audit and fix UI motion.

Check:

- Button feedback
- Hover states
- Focus states
- Route/view transitions
- Modal transitions
- Drawer transitions
- Dropdown transitions
- Toast transitions
- Loading skeletons
- Sidebar expand/collapse
- Tab transitions
- Tooltip/popover timing
- Reduced motion behavior
- Animation jank during window resizing
- CPU/GPU usage on Steam Deck/handheld

Requirements:

- Motion should clarify interactions.
- Motion should feel fast and polished.
- Motion should not delay user actions.
- Motion should not break tests.
- Motion should not cause layout shift.
- Motion should respect `prefers-reduced-motion`.
- Prefer transform/opacity for motion.
- Avoid animating layout-heavy properties unless necessary.

---

# STATE COVERAGE REQUIREMENTS

Every important UI surface should handle and test:

- Default
- Loading
- Empty
- Success
- Error
- Disabled
- Saving
- Saved
- Validation error
- Permission denied
- Offline/failed network, if relevant
- IPC failure, if relevant
- Long content
- Many items
- No items
- Broken image/icon
- Missing optional data
- Partial data

Do not leave empty/error/loading states ugly. Users spend a lot of time in “something went wrong” land.

---

# THEME AND APPEARANCE REQUIREMENTS

If the app supports themes or appearance settings, audit and test:

- Light mode
- Dark mode
- System mode
- Accent color
- High contrast mode, if present
- Reduced motion
- Font size preference, if present
- Density/compact mode, if present

Check:

- Tokens update correctly.
- Icons remain visible.
- Text remains readable.
- Charts remain understandable.
- Focus states remain visible.
- Error/success/warning states remain distinct.
- Settings persist after reload/relaunch.
- Theme changes do not cause layout shift.
- Native window/title bar follows theme where applicable.

---

# TEST DATA REQUIREMENTS

Use deterministic test data.

Include data cases for:

- Normal short content
- Long titles
- Long filenames
- Long usernames
- Long emails
- Empty lists
- Large lists
- Broken images
- Missing optional values
- Invalid values
- Unicode/emoji text
- RTL text where relevant
- Permission denied state
- Loading state
- Error state

Do not use production data.
Do not use real secrets.
Do not rely on external network services unless intentionally mocked or test-safe.

---

# PACKAGE SCRIPT REQUIREMENTS

Audit and improve scripts if needed.

Recommended scripts, only if supported:

```json
{
  "scripts": {
    "test": "...",
    "test:unit": "...",
    "test:component": "...",
    "test:e2e": "...",
    "test:e2e:ui": "...",
    "test:visual": "...",
    "test:a11y": "...",
    "test:coverage": "...",
    "lint": "...",
    "typecheck": "...",
    "build": "...",
    "electron:dev": "...",
    "electron:build": "...",
    "electron:package": "..."
  }
}
```

Only add scripts that actually work.

---

# CI REQUIREMENTS

Audit CI and improve if appropriate.

CI should run:

- Install dependencies
- Lint
- Typecheck
- Unit tests
- Component tests
- Build
- E2E tests where practical
- Accessibility tests where practical
- Visual tests where practical
- Electron package smoke test where practical

Do not create CI that cannot run.

For E2E/visual tests:

- Use deterministic data.
- Avoid production services.
- Upload screenshots/traces on failure if supported.
- Run Electron in a CI-compatible mode.
- Document OS-specific limitations.

---

# QUALITY GATES

After implementation, run available validation commands.

Detect package manager from lockfile.

Examples:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

Also run if available:

```bash
npm run test:e2e
npm run test:component
npm run test:a11y
npm run test:visual
npm run test:coverage
npm run electron:build
npm run electron:package
```

Do not claim checks passed unless they actually pass.

If a check fails:

- Determine whether it is an app bug, test bug, environment issue, or missing setup.
- Fix what is safe to fix.
- Re-run the command.
- Document remaining failures clearly.

---

# IMPLEMENTATION STRATEGY

Follow this process.

## Step 1: Discover

Scan the project and identify Electron setup, UI stack, renderer framework, navigation, routes/views, design system, icon system, typography system, tests, and CI.

## Step 2: Map

Create or update:

- `docs/ui-audit-map.md`
- `docs/story-flow-map.md`
- `docs/navigation-flow-map.md`
- `docs/design-system-audit.md`
- `docs/iconography-audit.md`
- `docs/typography-audit.md`
- `docs/ui-testing-strategy.md`

## Step 3: Prioritize

Group issues by severity:

- Critical: broken nav, unusable core flow, accessibility blocker, test blocker
- High: inconsistent design system, broken layout, missing critical test, unsafe Electron UI behavior
- Medium: visual drift, weak component state coverage, typography/icon inconsistency
- Low: polish, docs, small refinements

## Step 4: Fix Design System Foundation

Prioritize:

- Tokens
- Layout shells
- Typography roles
- Icon rules
- Shared components
- Theme behavior
- Accessibility utilities
- Motion utilities
- Test utilities

## Step 5: Fix Navigation and Story Flows

Repair:

- Broken routes/views
- Missing active states
- Broken back/cancel flows
- Broken settings flows
- Broken modals/drawers
- Keyboard navigation
- Native menu/tray actions where practical

## Step 6: Add Tests

Add or improve:

- Component tests
- Integration tests
- E2E tests
- Navigation tests
- Story flow tests
- Design system tests
- Icon accessibility tests
- Typography/semantic tests
- Visual tests if supported
- Accessibility tests if supported

## Step 7: Validate

Run lint, typecheck, build, tests, Electron build/package checks where available.

## Step 8: Report

Produce the required final report.

---

# REQUIRED OUTPUT REPORT

When finished, provide this report:

```md
# Electron UI Testing, Story Flow, Navigation Flow & Design System Audit Report

## Summary

Briefly summarize the UI quality posture before and after the audit.

## Project Detected

- App name:
- Electron version:
- Renderer framework:
- Package manager:
- Styling system:
- Component library:
- Icon library:
- Font system:
- Animation system:
- Test tools:
- E2E tools:
- Visual testing:
- Accessibility testing:
- Build/packaging system:

## UI Quality Scorecard

| Category | Before | After | Notes |
|---|---:|---:|---|
| UI Testing |  |  |  |
| Story Flow Coverage |  |  |  |
| Navigation Flow Coverage |  |  |  |
| Design System Consistency |  |  |  |
| Iconography |  |  |  |
| Typography |  |  |  |
| Accessibility |  |  |  |
| Layout / Window Resizing |  |  |  |
| Animation / Microinteractions |  |  |  |
| Visual Regression Readiness |  |  |  |
| Electron Desktop UX |  |  |  |

Use practical ratings:

- Critical
- Needs Work
- Solid
- Excellent
- AAAA

## Story Flows Mapped

| Story Flow | Happy Path | Error Path | Empty State | Accessibility | Test Coverage | Status |
|---|---:|---:|---:|---:|---:|---|

## Navigation Flows Mapped

| Source | Target | Active State | Auth Behavior | Keyboard | Compact Window | Test Coverage | Status |
|---|---|---:|---:|---:|---:|---:|---|

## Design System Findings

List token, component, theme, spacing, radius, shadow, motion, and visual consistency findings.

## Iconography Findings

List icon consistency, sizing, alignment, accessibility, and meaning issues found and fixed.

## Typography Findings

List font scale, heading, line-height, wrapping, truncation, readability, and semantic issues found and fixed.

## UI Tests Added

For each test file:

- File:
- Test type:
- What it covers:
- Why it matters:

## UI Tests Updated

For each changed test file:

- File:
- What changed:
- Why:

## Component Stories Added or Updated

If applicable:

- Component:
- Stories:
- States covered:

## Accessibility Improvements

Confirm:

- Keyboard navigation tested
- Focus states visible
- Forms labeled
- Icon-only buttons named
- Decorative icons hidden
- Dialogs accessible
- Menus/tabs/dropdowns keyboard usable
- Reduced motion respected
- 200% zoom considered

## Responsive / Window Size Improvements

Confirm coverage for:

- Minimum window size
- 800 × 600
- 1024 × 768
- 1280 × 720
- 1280 × 800
- 1366 × 768
- 1440 × 900
- 1920 × 1080
- Steam Deck / handheld
- Large desktop

## Animation and Microinteraction Improvements

List improvements to:

- Button feedback
- Focus states
- Modal/drawer motion
- Navigation transitions
- Loading states
- Reduced motion
- Performance

## Files Changed

For each changed file:

- File:
- What changed:
- Why:

## Documentation Created or Updated

List docs created or changed.

## Commands Run

List commands and results.

Examples:

- `pnpm lint` — passed
- `pnpm typecheck` — passed
- `pnpm test` — passed
- `pnpm test:e2e` — passed
- `pnpm build` — passed
- `pnpm electron:build` — passed / not available

## Remaining Gaps

List anything that could not be verified automatically, requires manual QA, requires OS-specific testing, or requires design/product approval.

## Final UI QA Checklist

- [ ] Every major story flow is mapped
- [ ] Every major story flow has test coverage
- [ ] Every primary navigation path is mapped
- [ ] Every primary navigation path is tested
- [ ] Settings navigation is tested
- [ ] Native menu/tray actions reviewed where applicable
- [ ] Back/forward/cancel flows work
- [ ] Active nav states are correct
- [ ] Component states are covered
- [ ] Empty states are polished
- [ ] Loading states are polished
- [ ] Error states are polished
- [ ] Icon sizes are consistent
- [ ] Icon meanings are clear
- [ ] Icon-only buttons have accessible names
- [ ] Decorative icons are hidden from assistive tech
- [ ] Typography scale is consistent
- [ ] Heading hierarchy is logical
- [ ] Long text wraps/truncates safely
- [ ] Design tokens are used consistently
- [ ] Theme behavior is stable
- [ ] Keyboard navigation works
- [ ] Dialog focus behavior works
- [ ] Reduced motion is respected
- [ ] Window resizing is stable
- [ ] Steam Deck / handheld layout is usable
- [ ] Visual regression readiness reviewed
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Build passes
```

---

# FINAL INSTRUCTION

Begin by scanning the full Electron repository.

Build a complete understanding of:

- Electron main/preload/renderer structure
- Renderer UI framework
- Routes/views
- Navigation flows
- Story/user journeys
- Component system
- Iconography system
- Typography system
- Design tokens
- Theme system
- Animation system
- Accessibility posture
- Existing UI tests
- Existing E2E tests
- Existing Storybook/story coverage
- Existing visual regression tooling
- Existing CI setup

Create or update the required UI audit, story flow, navigation flow, design system, iconography, typography, and UI testing strategy documents.

Then implement improvements directly in the codebase.

Add or improve tests for story flows, navigation flows, design system components, iconography accessibility, typography semantics, responsive/window resizing behavior, and Electron-specific UI behavior.

Run all available validation commands.

End with the required Electron UI Testing, Story Flow, Navigation Flow & Design System Audit Report.

Do not stop at recommendations. Implement, validate, and document the improvements.
