# Design System Audit

Updated: 2026-06-06

## Design System Overview

- Token source: CSS custom properties in `frontend/src/app.css`
- Component source: static HTML plus JS-enhanced DOM modules
- Theme system: CSS variables and settings theme cards
- Supported themes: built-in themes from backend plus custom themes
- Styling approach: custom CSS, no UI package
- Icon system: local SVG registry in `frontend/src/icons.js`
- Typography system: CSS classes and system/terminal font stacks
- Animation system: CSS transitions plus JS state changes

## Design Tokens

| Token Category | Source | Usage Quality | Issues | Status |
|---|---|---|---|---|
| Color | CSS variables | Solid | theme controls depend on stable IDs | Monitored |
| Spacing | CSS classes | Solid | monolithic CSS makes drift easy | Monitored |
| Typography | CSS classes | Partial | no formal type scale doc before this audit | Documented |
| Radius | CSS variables/classes | Solid | no new drift introduced | Stable |
| Shadow | CSS classes | Solid | no change | Stable |
| Z-index | CSS classes | Partial | overlays need consistent hidden/inert state | Fixed |
| Motion | CSS transitions | Partial | strict visual baselines still fail after shell repair | Gap |
| Breakpoints | CSS media rules | Partial | Steam Deck target tested, broader desktop visual coverage missing | Partial |

## Component Inventory

| Component | Variants | States | Token Usage | Accessibility | Test Coverage | Status |
|---|---|---|---|---|---|---|
| Primary nav tab | 12 views | active, inactive, focus | existing classes | correct tab roles | E2E | Fixed |
| View panel | 12 views | active, hidden | existing classes | `hidden` plus `inert` | E2E/axe | Fixed |
| Settings modal | 11 panels | open, closed, active panel | existing settings tokens | focus trap, labels | E2E/axe | Fixed |
| Command palette | grouped commands | open, search, execute | existing classes | role mismatch fixed | E2E/axe | Fixed |
| Share inner tabs | LAN/SFTP/FTP | selected, unselected | existing classes | tab roles fixed | axe | Fixed |
| Memory controls | import/refresh/export | default, icon-enhanced | existing classes | labels fixed | axe | Fixed |

## Design Drift Issues

- Static shell markup was absent from production HTML, so runtime modules could not apply the design system reliably.
- Settings markup lacked theme metadata expected by CSS and JS.
- Icon registry had references to icons that did not exist.

## Required Fixes

Implemented:

- Restored production renderer shell in `frontend/index.html`.
- Added missing icon definitions.
- Repaired hidden/inert state handling.
- Repaired settings theme metadata.
- Repaired command palette and Share ARIA contracts.
- Added terminal tab placeholder/chrome styling during PTY initialization.
- Restored collapsed-by-default sidebar, breadcrumb strip, chat composer classes, and welcome starter cards to reduce visual drift against the committed chat baseline.

Remaining:

- Playwright visual snapshots still fail and should not be updated until the final repaired shell is explicitly accepted as the new visual baseline.
