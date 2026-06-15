# NEURODECK Design System Delta
**Version:** v7.1 (post E2E audit)  
**Date:** 2026-06-15

---

## Tokens Added

### Radius Tokens
```css
--nd-radius-xs:     4px;
--nd-radius-panel:  var(--nd-radius-md);
--nd-radius-modal:  var(--nd-radius-lg);
--nd-radius-button: var(--nd-radius-sm);
--nd-radius-input:  var(--nd-radius-sm);
--nd-radius-badge:  var(--nd-radius-full);
```

### Spacing Tokens
```css
--nd-space-16: 64px;
```

### Font Legacy Aliases
```css
--font-body:    var(--nd-font-ui);
--font-display: var(--nd-font-display);
--font-mono:    var(--nd-font-mono);
```

### Z-Index Scale Additions
```css
--z-behind:     -1;
--z-toast-peak: 30000;
```

---

## Components Standardized

### IconButton
- `aria-label` is now required at the TypeScript type level
- `disabled` and `aria-disabled` explicitly forwarded

### Tabs
- Keyboard navigation bug fixed
- Arrow/Home/End navigation verified

---

## Deprecated Styles / Patterns

| Pattern | Replacement | Status |
|---|---|---|
| `style={{ width: 56 }}` raw px | `style={{ width: 'var(--nd-shell-navrail)' }}` | Fixed |
| `style={{ width: 280 }}` raw px | `style={{ width: 'var(--nd-shell-context)' }}` | Fixed |
| `pl-[6px]` magic value | `pl-1.5` | Fixed |
| `text-[13px]` magic value | `text-sm` | Fixed |
| Icon-only buttons without aria-label | TypeScript compile error | Enforced |

---

## Layout Primitives

### Shell Dimensions (1280x800 Steam Deck)
- `--nd-shell-statusbar: 40px` — TitleBar height
- `--nd-shell-navrail: 72px` — PrimarySidebar collapsed
- `--nd-shell-context: 280px` — SecondaryRail width

### Width Budget at 1280px
- PrimarySidebar (collapsed): 72px
- Main content: ~928px
- SecondaryRail: hidden at 1280px (xl:flex)
- Total fits within 1280px

---

## Button Rules

| Variant | Use Case |
|---|---|
| `primary` | Main CTA |
| `secondary` | Supporting actions |
| `ghost` | Toolbar/nav actions |
| `danger` | Destructive actions |

---

## Spacing Rules

Use Tailwind spacing utilities matching the `--nd-space-*` scale. Avoid arbitrary values like `p-[13px]` without documented reason.
