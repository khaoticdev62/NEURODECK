# NEURODECK Deep Cosmetic UI Enhancement AAAA Pass Prompt

## Copy/paste prompt for Claude, Kimi, Gemini, Cursor, Windsurf, or another repo-aware coding agent

You are a principal product designer, AAA game UI art director, senior frontend engineer, Electron desktop UX specialist, Tailwind design-system architect, accessibility reviewer, and visual QA lead with 20+ years of experience shipping premium software interfaces.

You are working on **NEURODECK**, an Electron + React + TypeScript + Tailwind desktop application designed to feel like a premium handheld AI workstation for Steam Deck, desktop, keyboard/mouse, controller, and touch.

Your mission is to perform a **deep cosmetic UI enhancement AAAA pass** across the entire app. This is not a broad architectural rewrite unless a small refactor is required to safely apply a visual upgrade. This pass assumes the product already has functional screens and that the previous E2E audit/refactor pass either has been completed or is being used as a baseline.

The goal is to make the entire UI feel expensive, cohesive, intentional, responsive, accessible, tactile, polished, and production-shippable.

The final product should feel like a premium handheld AI operating environment that could realistically ship as a polished Steam Deck-native workstation shell. It should not feel like a random Electron dashboard wearing a Halloween costume.

---

# 0. Core Mission

Perform a full-app cosmetic enhancement pass that upgrades:

- Visual hierarchy
- Layout polish
- Surface treatment
- Button feel
- Card design
- Panel depth
- Theme cohesion
- Typography refinement
- Icon consistency
- Micro-interactions
- Motion quality
- Empty-state presentation
- Loading-state presentation
- Error/success/warning states
- Navigation chrome
- Header/footer polish
- Modal visual design
- Form control fidelity
- Steam Deck 1280x800 visual density
- Desktop scaling
- Touch/controller affordances
- Dark theme readability
- Tactical glass / premium command-center aesthetic

This is a **cosmetic enhancement and visual refinement pass**, not a feature expansion pass.

Do not add new product features unless they are purely presentational and required to complete an existing UI state, such as improved badges, better section headers, refined icons, state labels, helper text, skeleton states, or empty-state artwork made from existing UI primitives.

---

# 1. Non-Negotiable Design Direction

NEURODECK should feel like:

- A premium handheld AI workstation
- A tactical glass command OS
- A Deck-native productivity launcher
- A desktop-grade AI shell
- A focused technical console
- A polished AAA game UI adapted for productivity
- A system interface, not a website
- Fast, sharp, readable, and intentional

Design DNA:

- 70% modern tactical OS
- 20% AAA game HUD/menu polish
- 10% terminal heritage

Use the terminal heritage sparingly. The app may nod to terminal aesthetics, but it must not become muddy ASCII soup, fake CRT gimmicks, or unreadable hacker cosplay.

The UI should feel:

- Dense but not cramped
- Futuristic but not cheesy
- Animated but not noisy
- Premium but not bloated
- Controller-friendly but not console-dumbed-down
- Technical but not hostile
- Consistent but not boring

---

# 2. Absolute Constraints

Do not break working behavior.

Do not remove working routes, IPC calls, app state, real data connections, model integrations, transfer flows, browser flows, terminal flows, plugin flows, or settings persistence.

Do not replace real data with mocked data.

Do not hide broken states behind pretty placeholders.

Do not introduce heavy animation, GPU-expensive blur stacks, excessive shadows, massive gradients, particle systems, canvas effects, WebGL, or shader-like rendering unless the repo already uses them safely and performance is proven.

Do not introduce random one-off class names, inline styles, magic numbers, or hard-coded colors.

Do not create multiple competing button/card/panel systems.

Do not ship polish that only looks good at one resolution.

Do not sacrifice accessibility for style.

Do not turn every screen into neon soup. Neon is seasoning, not the meal.

---

# 3. Required Baseline Discovery

Before editing files, inspect the repo and identify:

- App framework and renderer entry points
- Routing structure
- Screen/view components
- Shared layout wrappers
- Existing design system files
- Tailwind config
- Global CSS files
- Existing theme provider or theme engine
- Existing component library
- Existing button/card/modal/input components
- Existing icon library
- Existing animation utilities
- Existing accessibility helpers
- Existing tests or visual test harness
- Any Storybook, Playwright, Vitest, Testing Library, or screenshot tools

Create an internal cosmetic upgrade map before implementation.

Do not assume file paths. Discover the actual codebase.

---

# 4. Cosmetic Enhancement Strategy

Run the enhancement pass in this order:

1. Visual source-of-truth alignment
2. Token and theme polish
3. Layout chrome enhancement
4. Component cosmetic standardization
5. Screen-by-screen visual refinement
6. Motion and interaction polish
7. State polish
8. Responsive and Steam Deck tuning
9. Accessibility preservation
10. Visual regression testing
11. Documentation and handoff

This order matters. Do not start hand-polishing one screen while the design system is still a dumpster fire with RGB lights.

---

# 5. Visual Source-of-Truth Alignment

Define or refine the canonical NEURODECK visual language inside the actual repo.

The visual system must include:

- Semantic color tokens
- Surface hierarchy
- Border tokens
- Radius tokens
- Elevation/shadow tokens
- Typography tokens
- Spacing tokens
- Motion tokens
- Focus ring tokens
- State tokens
- Component variants
- Theme presets

The app must visually align to one design system across every screen.

## 5.1 Surface Hierarchy

Use a clear layer stack:

- `L0 app background`
- `L1 base layout shell`
- `L2 structural panels`
- `L3 raised interactive cards`
- `L4 focused/selected elements`
- `L5 overlays/popovers`
- `L6 modals`
- `L7 critical alerts`

Every card, panel, modal, nav surface, and input must sit on the correct layer.

Avoid surfaces that all look equally loud.

## 5.2 Premium Tactical Glass Treatment

Use glass-like UI carefully:

- Subtle translucent surfaces only where supported by performance
- Fallback solid surfaces where blur would be costly
- Controlled borders
- Thin highlight lines
- Subtle inner glow only on active/focused states
- No giant blurry panes stacked on top of each other
- No unreadable transparency over complex backgrounds

The surface effect should feel tactical and premium, not like someone discovered `backdrop-blur-xl` and lost custody of the keyboard.

---

# 6. Theme and Token Enhancement

Upgrade the theme system cosmetically without breaking runtime switching.

## 6.1 Required Token Categories

Create or refine tokens for:

```ts
surface.app
surface.base
surface.raised
surface.sunken
surface.glass
surface.overlay
surface.modal
surface.hover
surface.active
surface.selected

border.subtle
border.default
border.strong
border.focus
border.danger
border.success

text.primary
text.secondary
text.muted
text.disabled
text.inverse
text.accent
text.danger
text.success
text.warning

accent.primary
accent.secondary
accent.soft
accent.strong
accent.glow
accent.focus

state.hover
state.pressed
state.selected
state.disabled
state.loading
state.success
state.warning
state.error
state.info

shadow.low
shadow.medium
shadow.high
shadow.focus
shadow.glow

radius.xs
radius.sm
radius.md
radius.lg
radius.xl
radius.2xl
radius.full

space.1
space.2
space.3
space.4
space.5
space.6
space.8
space.10
space.12

motion.fast
motion.normal
motion.slow
motion.ease.standard
motion.ease.emphasized
motion.ease.exit
```

Token names may be adapted to the existing codebase, but the semantic coverage must exist.

## 6.2 Theme Quality Standards

Every theme must be:

- Readable
- Accessible
- Cohesive
- Visually distinct enough to matter
- Consistent in state colors
- Consistent in contrast
- Free of hard-coded visual drift

Theme variants should not simply swap accent colors while leaving the rest broken.

## 6.3 Suggested Theme Personality Targets

Preserve or create theme families similar to:

- `Blacksite` — deepest tactical black, maximum command-center feel
- `Tactical Glass` — premium translucent dark shell
- `Ghost Terminal` — cleaner terminal-inspired neutral
- `Hologrid` — cooler sci-fi blue/cyan system glow
- `Night Watch` — low-glare late-night mode
- `Minimal Ops` — reduced visual noise, productivity-first
- `Broadcast` — slightly warmer creator/streaming presentation mode

Do not create fifteen themes if the app only needs seven strong ones. More bad themes is not more value.

---

# 7. Typography AAAA Pass

Audit and refine typography across the full app.

## 7.1 Typography Goals

Typography must be:

- Sharp on Steam Deck LCD
- Comfortable at 1280x800
- Readable on desktop
- Consistent across headings, labels, captions, buttons, tabs, cards, and panels
- Dense enough for a workstation
- Spacious enough for controller/touch use

## 7.2 Typography Fixes

Identify and fix:

- Random font sizes
- Competing font weights
- Heading hierarchy drift
- Overuse of uppercase
- Low-contrast captions
- Buttons with mismatched text sizing
- Labels that look like body text
- Body text that is too small for Deck
- Long line lengths
- Poor truncation
- Poor wrapping
- Inconsistent numeric/monospace usage
- Text that clips in cards, nav items, tabs, buttons, modals, and settings rows

## 7.3 Required Type Scale

Define a clean type scale, adapted to the existing project:

```ts
text.display
text.h1
text.h2
text.h3
text.section
text.body
text.bodySmall
text.caption
text.micro
text.button
text.tab
text.code
text.metric
```

Use typography intentionally:

- Display text: rare hero/splash/onboarding moments
- H1/H2: major page identity
- Section: panel headers and grouped settings
- Body: readable content
- Caption: metadata and helper text
- Micro: badges, metrics, keyboard/controller hints
- Code/metric: terminal, model IDs, diagnostics, technical values

---

# 8. Layout and Spatial Polish

Perform a full spacing and alignment pass.

The app must feel snapped to an invisible grid.

## 8.1 Grid Rules

Use a consistent spacing rhythm:

- 4px micro alignment
- 8px component spacing
- 12px compact panel spacing
- 16px default panel spacing
- 20px/24px major content spacing
- 32px major section separation

Prefer consistent spacing tokens over arbitrary Tailwind values.

## 8.2 Layout Polish Tasks

Fix:

- Misaligned headers
- Uneven card spacing
- Inconsistent sidebar padding
- Random gaps between nav items
- Crowded settings rows
- Inconsistent modal padding
- Cards that use different internal spacing
- Button rows with inconsistent gap
- Header actions floating off-grid
- Footer/status bar alignment issues
- Text baselines that do not align
- Icon/text misalignment
- Uneven border thickness
- Inconsistent page gutters
- Unbalanced left/right padding
- Clipped content at 1280x800
- Oversized desktop layouts that waste space
- Tiny hit targets on touch/controller paths

## 8.3 Steam Deck Density Rules

At 1280x800:

- No primary action should be clipped
- No modal should overflow vertically without a deliberate scroll region
- Navigation should be reachable and readable
- Footer/status information should not crowd the main action area
- Hit targets should be controller/touch reasonable
- Text should remain readable from handheld distance
- The main workspace should not feel like it was designed only for 1440p monitors

---

# 9. Component Cosmetic Upgrade Pass

Upgrade all reusable components to AAAA visual quality.

Every component must share:

- Tokenized color
- Tokenized spacing
- Tokenized radius
- Tokenized typography
- Consistent icon sizing
- Consistent state styling
- Consistent focus treatment
- Consistent motion treatment
- Accessible contrast
- Clean disabled/loading behavior

## 9.1 Buttons

Buttons must feel tactile, readable, and consistent.

Standardize variants:

- Primary
- Secondary
- Ghost
- Soft
- Danger
- Success
- Warning
- Icon-only
- Toolbar
- Controller action hint

Standardize sizes:

- XS / compact utility
- SM / toolbar
- MD / default
- LG / primary action
- XL / splash/onboarding hero action if needed

Every button state must be visually complete:

- Default
- Hover
- Focus-visible
- Active/pressed
- Selected/toggled
- Loading
- Disabled
- Danger confirmation

Button polish requirements:

- Icons align optically with text
- Label truncation is controlled
- Loading spinner/progress does not shift layout
- Focus ring is visible but not ugly
- Primary buttons are obvious but not nuclear
- Danger buttons do not look like regular buttons with random red slapped on
- Icon-only buttons have tooltips or accessible labels
- Controller focus state is stronger than mouse hover state

## 9.2 Cards

Cards must have consistent anatomy:

- Header area
- Optional icon/avatar/status
- Body/content
- Metadata row
- Action row
- Footer/status region if needed

Card polish requirements:

- Consistent padding
- Consistent radius
- Consistent border treatment
- Subtle elevation hierarchy
- Clear hover/focus states when interactive
- No accidental card nesting chaos
- No mismatched title sizes
- No icon soup
- No clipped content
- No unreadable metadata

## 9.3 Panels

Panels must feel like part of the same shell.

Standardize:

- Panel header height
- Header typography
- Header action alignment
- Internal padding
- Border treatment
- Scroll region behavior
- Empty panel treatment
- Panel dividers
- Resize/collapse affordances if present

## 9.4 Inputs and Forms

Upgrade:

- Text inputs
- Search bars
- Textareas
- Selects/dropdowns
- Toggles
- Checkboxes
- Radios
- Sliders
- Segmented controls
- File pickers
- Command input areas

Required states:

- Default
- Hover
- Focus-visible
- Filled
- Error
- Success
- Warning
- Disabled
- Loading/validating

Form polish requirements:

- Labels are clear
- Helper text is readable
- Error messages are close to the field
- Focus states are strong
- Inputs align with buttons
- Heights are standardized
- Text does not clip
- Placeholder text is not too low contrast
- Destructive settings require clear affordance

## 9.5 Modals and Overlays

Modals should feel premium and calm.

Upgrade:

- Backdrop treatment
- Modal surface
- Header hierarchy
- Close button
- Footer actions
- Scroll regions
- Danger confirmations
- Command palette overlay
- Toast/notification overlays
- Popovers
- Tooltips

Rules:

- Modals must not feel like browser alerts
- Backdrops must not crush contrast
- Escape/cancel paths must be clear
- Focus trapping must remain intact
- Controller navigation must be obvious
- Destructive actions must have strong visual distinction

## 9.6 Navigation Chrome

Upgrade:

- Sidebar
- Topbar
- Status bar
- Tab bar
- Breadcrumbs
- Command palette launcher
- Feature rail
- Footer controls
- Active route states
- Controller hint strip

Navigation polish requirements:

- Current location is unmistakable
- Hover, focus, active, and selected states are distinct
- Icons are consistent and aligned
- Labels truncate gracefully
- Badge/count placement is consistent
- Rail/sidebar width is deliberate
- Collapsed states remain understandable
- Deck controller navigation feels natural

---

# 10. Screen-Level Cosmetic Pass

Audit and upgrade every screen individually after component-level improvements.

For each screen, perform:

- Header polish
- Primary action polish
- Panel alignment
- Empty-state polish
- Loading-state polish
- Error-state polish
- Button hierarchy review
- Card hierarchy review
- Scroll behavior review
- Theme consistency review
- 1280x800 review
- Desktop review
- Keyboard/controller focus review

## 10.1 Workspace / Main AI Shell

Upgrade the workspace to feel like the flagship screen.

Polish:

- Chat/message cards
- Prompt input area
- Agent/persona selectors
- Context panels
- Session metadata
- Status meters
- Model indicators
- Token/latency indicators
- Streaming response presentation
- Attachment/file states if present
- Command palette integration
- Empty first-run state
- Error/retry state

The workspace should feel like the command deck of the app, not a plain chat box with sidebars.

## 10.2 Dashboard / Home

Upgrade:

- Hero/header region
- Quick actions
- Recent sessions
- Model status
- Feature cards
- System health cards
- Onboarding continuation
- Empty/recent state

The dashboard must immediately communicate what NEURODECK is and what the user can do next.

## 10.3 Model Manager

Upgrade:

- Model cards
- Provider badges
- Local/remote status
- Download/install states
- Active model indicator
- Compatibility labels
- Performance metrics
- Filter/search controls
- Empty/no models state
- Error/provider unavailable state

No fake availability. Cosmetic clarity only.

## 10.4 Agent Manager

Upgrade:

- Agent cards
- Role icons
- Skill chips
- Status indicators
- Activate/deactivate actions
- Agent detail panels
- Empty state
- Configuration panels

Agents should feel like specialized tools, not random profile cards.

## 10.5 Sessions / History

Upgrade:

- Session list rows
- Timeline grouping
- Search/filter UI
- Tags/labels
- Archive/delete states
- Selected session state
- Empty history state
- Restore/open actions

## 10.6 Settings

Upgrade:

- Settings layout
- Section grouping
- Toggles/selects/sliders
- Danger zone
- Theme selector
- Accessibility controls
- Profile/preferences controls
- Save/reset feedback

Settings should feel organized and premium, not like a landfill with checkboxes.

## 10.7 Theme Manager

Upgrade:

- Theme preview cards
- Color swatches
- Contrast indicators
- Active theme state
- Preview/apply controls
- Accessibility variant labels
- Reduced motion/high contrast previews if present

## 10.8 Plugin / Extension Views

Upgrade:

- Plugin cards
- Install/enable states
- Permission badges
- Version metadata
- Error states
- Security warnings
- Configuration controls

## 10.9 Terminal / Browser / Tools Views

Upgrade without breaking native-like behavior:

- Tab chrome
- Address/tool bars
- Terminal viewport framing
- Status indicators
- Action buttons
- Empty states
- Connection/security states
- Scrollbars
- Split panes if present

These views must feel integrated into NEURODECK, not embedded strangers from another planet.

## 10.10 Diagnostics / Telemetry

Upgrade:

- Metric cards
- Charts if present
- Logs
- Severity colors
- Filter controls
- Live indicators
- Copy/export controls
- Empty/no data state

Clarity beats decoration here.

---

# 11. Empty-State and Story-Flow Cosmetic Pass

Every empty state must feel intentionally designed.

Upgrade empty states with:

- Clear title
- Short useful explanation
- Primary action
- Secondary action if appropriate
- Small visual motif using existing icons/shapes
- Contextual controller/keyboard hint where helpful
- No generic “No data found” unless absolutely unavoidable

## 11.1 First-Run Story Flow

Improve cosmetic presentation of:

- First launch
- Onboarding steps
- Feature introductions
- Tool demonstrations
- Permissions/setup steps
- Theme selection
- Model connection/setup
- Completion screen

Rules:

- Onboarding must remain fast
- Do not add unnecessary steps
- Do not slow the app
- Use viewfinder windows, guided highlights, callouts, or framed previews where helpful
- Animation must be lightweight and skippable
- Each step must teach one clear thing
- The user should always know what is happening, why it matters, and how to continue

## 11.2 Visual Storytelling

NEURODECK should feel like it has a coherent product story:

- Launch → command environment ready
- Home → choose mission/task
- Workspace → execute with AI/tools
- Models/Agents → configure capability
- Sessions/Memory → preserve intelligence
- Settings/Themes → personalize workstation
- Diagnostics → trust and control

This story should be reflected visually through headings, empty states, action hierarchy, and navigation clarity.

---

# 12. Iconography AAAA Pass

Audit and standardize all icons.

Requirements:

- One primary icon library unless already justified
- Consistent stroke width
- Consistent size scale
- Consistent alignment
- Consistent meaning
- Icons paired with labels where ambiguity exists
- Icon-only controls must have accessible labels
- Status icons must be color + shape distinct
- Destructive icons must not be reused casually

Suggested icon sizing:

- 12px micro metadata
- 14px compact labels
- 16px default inline
- 18px nav items
- 20px toolbar/actions
- 24px feature/card headers
- 32px+ only for empty states or hero moments

Do not use icons as glitter. Every icon must earn its keep.

---

# 13. Motion and Micro-Interaction Enhancement

Upgrade motion to feel smooth, quick, and helpful.

Allowed motion:

- Subtle fade
- Short slide
- Scale from 0.98 to 1.0 on popovers/modals
- Smooth color transitions
- Focus ring transitions
- Lightweight loading shimmer/skeleton
- Token streaming polish
- Progress indicator easing
- Toast entrance/exit
- Tab/nav active indicator movement

Avoid:

- Bounce
- Elastic overshoot
- Heavy blur animation
- Long cinematic transitions
- Particle storms
- Full-screen animated backgrounds
- Continuous motion that distracts
- Anything that tanks Steam Deck performance

## 13.1 Motion Tokens

Use consistent timings:

```ts
motion.instant = 75ms
motion.fast = 120ms
motion.normal = 180ms
motion.slow = 240ms
motion.modal = 180ms
motion.toast = 220ms
```

Honor reduced motion.

If the user has reduced motion enabled, motion must collapse to simple opacity or instant state changes.

---

# 14. Backgrounds, Borders, Shadows, and Depth

Upgrade the app’s visual depth carefully.

## 14.1 Backgrounds

Use backgrounds that support readability:

- Dark app base
- Subtle radial/linear accents only if performance-safe
- No loud wallpaper behind dense text
- No high-frequency patterns under content
- No random gradients per screen

## 14.2 Borders

Borders should create structure:

- Use subtle borders for panels
- Stronger borders for active focus
- Danger/success borders only for semantic states
- Avoid inconsistent border widths
- Avoid low-contrast borders that look accidental

## 14.3 Shadows and Glow

Use shadows/glow sparingly:

- Low elevation for cards
- Medium elevation for dropdowns/popovers
- High elevation for modals
- Glow only for accent/focus/active states
- No glowing everything
- No blurry neon puddles

The UI should feel like premium hardware glass, not a Vegas sign having a panic attack.

---

# 15. CSS and Tailwind Cosmetic Cleanup

Cosmetic improvements must be implemented cleanly.

Audit and reduce:

- Repeated long className strings
- Inline style objects
- Hard-coded colors
- Hard-coded arbitrary spacing
- Hard-coded arbitrary font sizes
- Duplicate component variants
- Conflicting CSS selectors
- Unused CSS
- Dead animation classes
- Global styles leaking into components
- Overly specific selectors
- Random z-index values

Prefer:

- Shared component variants
- Tailwind theme tokens
- CSS variables
- Semantic utility composition
- `clsx`, `cva`, `tailwind-variants`, or existing project pattern if already used
- Clear component props for visual variants
- Small, local, intentional CSS where Tailwind is insufficient

Do not introduce a new styling library unless the repo already uses it or the benefit is obvious and low-risk.

---

# 16. Accessibility Preservation and Enhancement

Cosmetic polish must improve accessibility, not sabotage it.

Validate:

- Contrast ratios
- Focus-visible states
- Keyboard navigation
- Controller focus clarity
- Touch target sizing
- Reduced motion support
- Semantic HTML
- ARIA labels where needed
- Tooltips not required for critical info
- Color not used as the only status indicator
- Text remains readable at Steam Deck handheld distance
- Disabled states are visibly disabled but still legible

Target:

- WCAG AA minimum
- WCAG AAA where practical
- High contrast theme must remain clean
- Colorblind-safe status language
- Reduced motion mode fully respected

---

# 17. Steam Deck and Responsive Visual QA

Validate cosmetic improvements at:

- 1280x800 Steam Deck native
- 1280x720 fallback
- 1366x768 small laptop
- 1920x1080 desktop
- 2560x1440 desktop
- Windowed small-width mode if app supports resizing

## 17.1 Steam Deck Requirements

At 1280x800:

- No clipped primary actions
- No microscopic text
- No inaccessible nav items
- No modals taller than the viewport without internal scroll
- No horizontal scrolling unless deliberately designed
- No crowded controller hint bars
- No overlapping toasts/modals
- No important controls hidden behind hover-only behavior
- Focus ring must be visible from handheld distance

## 17.2 Desktop Requirements

At desktop sizes:

- Layout should breathe without wasting absurd space
- Cards should not stretch into unreadable line lengths
- Max-widths should be intentional
- Panels should align on grid
- Empty states should not float awkwardly
- Top-level navigation should feel native to a desktop app

---

# 18. Electron Desktop Polish

Because this is an Electron app, ensure the cosmetic pass respects desktop expectations.

Upgrade where applicable:

- Custom titlebar visual polish
- Window drag regions
- Window controls alignment
- Frameless window spacing
- Native-feeling menu/action placement
- Scrollbar styling
- App shell edge padding
- System tray/status affordances if present
- Resize behavior
- Docked/external display presentation

Do not break `-webkit-app-region: drag` behavior.

Do not place clickable controls inside draggable regions unless they are explicitly marked `no-drag`.

---

# 19. Visual QA Evidence

After implementation, produce a written report with:

## 19.1 Inventory

- Screens reviewed
- Components reviewed
- Themes reviewed
- Layout wrappers reviewed
- CSS files reviewed

## 19.2 Changes Made

For each area:

- Files changed
- What was improved
- Why it was improved
- Risk level
- Any known follow-up

## 19.3 Before/After Notes

For major screens/components, describe:

- Before issue
- After improvement
- Design system alignment
- Accessibility impact
- Steam Deck impact

## 19.4 Validation Matrix

Include results for:

- 1280x800
- 1280x720
- 1920x1080
- Keyboard navigation
- Controller/focus navigation if supported
- Theme switching
- Reduced motion
- High contrast
- Primary flows

## 19.5 Remaining Risks

List anything not completed, blocked, ambiguous, or requiring design/product decision.

Be honest. Do not claim perfection if something was not verified.

---

# 20. Required Testing

Run all available relevant tests.

Use whatever the repo provides:

- TypeScript type check
- ESLint
- Prettier or formatting check
- Unit tests
- Component tests
- Playwright/E2E tests
- Storybook build
- Visual regression tests
- Electron build smoke test
- Production build

If a test command fails, do not hide it. Report:

- Exact command
- Failure summary
- Likely cause
- Whether it is related to your changes
- What you did to resolve it or why it remains unresolved

---

# 21. Implementation Guardrails

While editing:

- Make small coherent changes
- Prefer shared components over per-screen hacks
- Preserve working behavior
- Preserve existing data flows
- Preserve existing IPC boundaries
- Preserve accessibility behavior
- Preserve keyboard shortcuts
- Preserve controller mappings
- Preserve tests unless they are updated for intentional UI changes
- Avoid unrelated backend edits
- Avoid broad dependency churn
- Avoid “while I’m here” rewrites

If a cosmetic issue requires structural cleanup, do the smallest safe refactor that creates long-term consistency.

---

# 22. Specific Cosmetic Upgrade Checklist

Complete this checklist across the app:

## Global Shell

- [ ] App background feels intentional
- [ ] Main shell has consistent spacing
- [ ] Window chrome/titlebar is polished
- [ ] Navigation active states are obvious
- [ ] Status bars are aligned and readable
- [ ] Scrollbars match the theme
- [ ] Z-index layers are predictable

## Components

- [ ] Buttons use consistent variants/sizes/states
- [ ] Cards use consistent radius/padding/elevation
- [ ] Panels use consistent headers and borders
- [ ] Forms use consistent labels/help/error states
- [ ] Modals feel premium and accessible
- [ ] Toasts/notifications are consistent
- [ ] Tooltips are readable and not overused
- [ ] Tabs/segmented controls feel tactile
- [ ] Badges/chips are standardized
- [ ] Icons are optically aligned

## Screens

- [ ] Dashboard/home feels flagship-quality
- [ ] Workspace/chat feels like the core command deck
- [ ] Settings are clean and grouped
- [ ] Theme manager previews are useful
- [ ] Model manager cards/states are polished
- [ ] Agent manager feels intentional
- [ ] Sessions/history is easy to scan
- [ ] Plugin/tool views feel integrated
- [ ] Diagnostics are clear and not noisy
- [ ] Empty states are useful and styled
- [ ] Error states are calm and actionable
- [ ] Loading states are lightweight and polished

## Responsive

- [ ] 1280x800 Steam Deck passes
- [ ] 1280x720 fallback passes
- [ ] 1920x1080 desktop passes
- [ ] Text does not clip
- [ ] Modals scroll correctly
- [ ] Primary actions remain visible

## Accessibility

- [ ] Keyboard focus is visible
- [ ] Controller focus is visible
- [ ] Contrast passes
- [ ] Reduced motion works
- [ ] Color is not the only status signal
- [ ] Hit targets are sane
- [ ] Icon-only controls have labels

## Performance

- [ ] No heavy blur stacks
- [ ] No expensive constant animations
- [ ] No layout thrash from animation
- [ ] No huge CSS bloat added
- [ ] Production build remains healthy

---

# 23. Definition of Done

This AAAA cosmetic pass is complete only when:

- The entire UI visibly shares one design language
- Buttons, cards, panels, forms, modals, nav, and states feel cohesive
- Theme switching remains stable
- Steam Deck 1280x800 remains clean and usable
- Desktop layouts feel polished
- Accessibility is preserved or improved
- Motion is smoother but not distracting
- Empty/loading/error states feel intentionally designed
- CSS/Tailwind is cleaner, not messier
- No working functionality is broken
- No real data flows are replaced with mocked UI
- Typecheck/build/test status is reported honestly
- A final visual QA report is provided

The final result should make NEURODECK feel like a premium product, not a prototype that got a gradient slapped on five minutes before the demo.

---

# 24. Final Response Format Required From The Coding Agent

When finished, respond with:

```md
# NEURODECK AAAA Cosmetic UI Enhancement Pass — Completion Report

## Summary
Briefly explain what was improved.

## Screens Reviewed
List all screens/views reviewed.

## Components Enhanced
List all components improved.

## Design System / Theme Updates
Explain token, theme, CSS, Tailwind, typography, spacing, motion, and surface updates.

## Major Visual Improvements
Describe the biggest UI upgrades.

## Steam Deck Validation
Report 1280x800 and controller/focus findings.

## Accessibility Validation
Report contrast, focus, reduced motion, keyboard, and semantic improvements.

## Performance Notes
Report any blur/motion/rendering concerns and mitigations.

## Tests / Commands Run
List exact commands and results.

## Files Changed
List changed files grouped by purpose.

## Known Issues / Follow-Up
Be honest about anything remaining.

## Final Verdict
State whether the UI is ready for the next production QA pass.
```

Do not give vague claims. Provide concrete evidence.

---

# 25. Extra Polish Targets If Time Allows

Only after the core pass is complete, optionally improve:

- Small status animations
- Better theme previews
- Subtle app shell background treatment
- Premium onboarding frame styling
- Controller hint strip polish
- Command palette visual hierarchy
- AI response streaming readability
- Skeleton loaders
- Empty-state icon compositions
- Better settings section descriptions
- Copy polish for labels and microcopy
- Consistent “danger zone” treatment
- Better desktop titlebar affordances
- More refined active nav indicator
- Improved first-run hero panel

These are optional, not excuses to avoid the core work.

---

# 26. The Taste Test

Before finalizing, evaluate the app with this brutal question:

> If someone opened NEURODECK for the first time on a Steam Deck, would they believe this is a serious premium AI workstation, or would they think it is a themed web dashboard trying too hard?

If the answer is not clearly “premium AI workstation,” keep refining.

Do not ship vibes. Ship taste.
