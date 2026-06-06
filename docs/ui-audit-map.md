# UI Audit Map

Updated: 2026-06-06

## App Overview

NEURODECK is an Electron desktop app with a Rust sidecar bridge. The renderer is a zero-framework Vite app optimized for a 1280x800 Steam Deck-style shell.

## UI Stack

- Electron: 36.x
- Renderer framework: vanilla JavaScript ES modules
- Styling system: `frontend/src/app.css` with CSS variables and view-specific classes
- Component library: custom DOM/CSS components
- Icon library: local Lucide-like SVG registry in `frontend/src/icons.js`
- Font system: CSS-driven system/terminal stacks
- Animation system: CSS transitions plus small JS state controllers
- Test tools: Vitest, Playwright Electron, axe via Playwright

## Main UI Surfaces

| Surface | Route/View | Components | State Coverage | Test Coverage | Risk |
|---|---|---|---|---|---|
| App shell | all views | sidebar, nav tabs, status chrome | active, inactive, hidden, inert | navigation E2E | Low |
| Chat | `view-chat` | prompt input, message log, context drawer | send, multiline, attachment | keyboard/a11y E2E | Medium |
| Canvas | `view-canvas` | editor shell, run controls | default, run hint | navigation/a11y E2E | Medium |
| Terminal | `view-terminal` | PTY output, tabs, input chrome | initializing, active session | navigation E2E | Medium |
| Settings | overlay | sidebar buttons, panels, form controls | open, close, panel switch | keyboard/a11y E2E | Low |
| Command palette | overlay | search, grouped actions | open, search, execute | navigation/keyboard/a11y E2E | Low |
| Radial menu | overlay | 12 view segments | open, segment render | navigation E2E | Low |

## Layout Shells

| Shell | Used By | Responsive Behavior | Issues | Status |
|---|---|---|---|---|
| Main app shell | all primary views | fixed fullscreen shell, internal scrolling | Production HTML shell was missing | Fixed |
| View container | all `.view-content` panels | one active panel, inactive panels hidden | `aria-hidden` focus conflict | Fixed |
| Settings modal | settings flow | centered modal with internal panels | missing theme contract | Fixed |
| Terminal shell | terminal flow | tab chrome stays visible | empty tab bar during PTY init | Fixed |

## Shared Components

| Component | Variants | States | Accessibility | Test Coverage | Status |
|---|---|---|---|---|---|
| Nav tab | 12 primary tabs | active, inactive, focus | `role=tab`, `aria-selected`, keyboard focus | E2E | Fixed |
| Settings sidebar button | 11 panels | active, inactive, focus | native button semantics | E2E | Fixed |
| Icon button | many | default, hover, disabled | must keep `aria-label` when icon-only | axe | Fixed for audited controls |
| Dialog overlay | settings, palette, shortcuts | open, close, focus trap | `aria-hidden` plus `inert` when closed | E2E | Fixed |

## Navigation Systems

| Nav System | Location | Desktop | Compact | Keyboard | Status |
|---|---|---|---|---|---|
| Primary tabs | top nav | 12 tabs | 1280x800 verified | arrow focus, Enter activation | Fixed |
| Command palette | overlay | route commands | viewport independent | Ctrl+K, arrows, Enter | Fixed |
| Quick switcher | overlay | recent views | viewport independent | Ctrl+Tab | Fixed |
| Radial menu | overlay | 12 view segments | Steam Deck focused | backtick opens | Fixed |
| Settings sidebar | settings modal | panel buttons | modal scroll | Tab, Enter, Escape | Fixed |

## Modal / Overlay Systems

| Component | Trigger | Focus Behavior | Escape Behavior | Test Coverage | Status |
|---|---|---|---|---|---|
| Settings | settings button | focus trap, returns to button | closes | keyboard/a11y | Fixed |
| Command palette | Ctrl+K | input focused | closes | keyboard/a11y | Fixed |
| Shortcuts | `?` | overlay visible | closes | keyboard/a11y | Fixed |
| Radial menu | backtick | menu visible | closes | navigation | Fixed |

## Visual Risk Areas

- `main.js` remains monolithic and selector-heavy.
- Settings markup has many controls with direct ID contracts.
- CSS specificity remains a risk for `#view-*` selectors.
- Playwright screenshot baselines exist and currently fail after the production shell restoration; this is a design reconciliation item, not a hidden test absence.

## Accessibility Risk Areas

- Icon enhancement can erase visible text; icon-only controls need explicit names.
- Hidden views must stay `hidden` and `inert`.
- Custom tablists must keep required child roles.

## Testing Gaps

- Visual regression baselines exist, but 14 screenshots still differ from the repaired renderer shell.
- Native menu/tray flows are not covered in the focused audit suite.
- Full multi-browser E2E was not part of the focused repair pass.
