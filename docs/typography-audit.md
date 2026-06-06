# Typography Audit

Updated: 2026-06-06

## Typography System

- Primary font: CSS-defined system/terminal stack
- Fallback stack: browser/system fallback from `app.css`
- Scale source: CSS classes and component-specific rules
- Heading scale: compact shell headings
- Body scale: view-specific compact desktop text
- Line-height system: CSS-defined
- Letter-spacing system: no new negative letter spacing introduced
- Font loading strategy: no external font loading added

## Type Scale

| Role | Size | Line Height | Weight | Token/Class | Usage |
|---|---:|---:|---:|---|---|
| Display | N/A | N/A | N/A | N/A | Not used in app shell |
| H1 | CSS-defined | CSS-defined | CSS-defined | view headings | View titles |
| H2 | CSS-defined | CSS-defined | CSS-defined | panel headings | Settings/panels |
| H3 | CSS-defined | CSS-defined | CSS-defined | section headings | Feature sections |
| Body | CSS-defined | CSS-defined | CSS-defined | base app styles | Controls/content |
| Small | CSS-defined | CSS-defined | CSS-defined | utility classes | status/meta text |
| Caption | CSS-defined | CSS-defined | CSS-defined | utility classes | hints/status |
| Button | CSS-defined | CSS-defined | CSS-defined | button classes | actions/nav |
| Label | CSS-defined | CSS-defined | CSS-defined | labels/forms | forms/settings |

## Typography Inventory

| Location | Current Style | Intended Role | Issue | Fix | Status |
|---|---|---|---|---|---|
| Primary nav | compact button labels | navigation | production labels absent with missing shell | restored shell labels | Fixed |
| Settings panels | compact labels | form labels | some controls unlabeled | added accessible labels | Fixed |
| Memory controls | button labels | action labels | icon enhancement could erase text | added explicit accessible name | Fixed |
| Command palette | grouped action labels | command search | invalid listbox role, not typography-specific | role corrected | Fixed |

## Issues Found

- The shell did not render enough static text for tests or assistive tech because the app root was empty.
- Several hidden inputs lacked labels.
- Icon enhancement made at least one text-bearing button inaccessible.

## Fixes Applied

- Restored semantic shell text and headings.
- Added labels to file and settings inputs.
- Avoided introducing large hero-scale type or viewport-scaled font sizes.

