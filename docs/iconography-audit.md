# Iconography Audit

Updated: 2026-06-06

## Icon System

- Icon library: local SVG registry in `frontend/src/icons.js`
- Default size: component-dependent, commonly 14-20px
- Default stroke: currentColor SVG strokes
- Filled/outlined style: outlined
- Color behavior: inherits CSS token colors
- Accessibility approach: decorative SVG hidden, parent controls named

## Icon Inventory

| Location | Icon | Purpose | Size | Accessible Name | Decorative | Issue | Status |
|---|---|---:|---:|---|---:|---|---|
| Settings nav | `cpu` | Models section | 16 | Models | Yes | Missing icon entry | Fixed |
| Command actions | `send` | Send/execute action | 16 | Parent label | Yes | Missing icon entry | Fixed |
| Workflow view | `workflow` | workflow action | 16 | Parent label | Yes | Missing icon entry | Fixed |
| Memory refresh | refresh icon via enhancer | Refresh memory | 16 | Refresh memory | No | Text removed by icon-only pass | Fixed |
| Browser buttons | back/forward/refresh | browser controls | 16 | aria-label/title | No | Confirmed named | Passing |

## Icon Rules

- Standard icon sizes: 14px in compact controls, 16px in buttons/nav, 20px in larger actions.
- Standard nav icon size: 16px.
- Standard button icon size: 16px.
- Standard empty state icon size: 24-32px when used.
- Standard status icon size: 14-16px.
- Stroke/fill rules: use currentColor SVG strokes.
- Color/token rules: inherit from text/accent tokens.
- Labeling rules: icon-only interactive controls require `aria-label` or `title`.

## Issues Found

- Missing icons caused blank or inconsistent enhanced controls.
- Icon-only conversion removed the accessible name from Memory refresh.
- Hidden file inputs were unlabeled.

## Fixes Applied

- Added `check`, `cpu`, `database`, `quote`, `cornerDownLeft`, `send`, and `workflow`.
- Added stable labels for icon-only and file controls caught by axe.
- Kept command palette buttons as named buttons instead of forcing a listbox role.

