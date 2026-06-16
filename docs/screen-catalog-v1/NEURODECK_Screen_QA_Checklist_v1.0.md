# NEURODECK Screen QA Checklist v1.0

**Date:** 2026-06-09

## P0 Screen QA Gate

Every P0 screen must pass this checklist before merge.

### Visual/Layout

- [ ] Fits 1280×800 without clipped primary controls.
- [ ] Fits 1280×720 with acceptable degraded layout.
- [ ] Fits 1920×1080 without stretched awkward spacing.
- [ ] Uses approved tokens only.
- [ ] No unregistered custom component for common UI patterns.
- [ ] Text remains readable at Steam Deck handheld distance.

### Controller

- [ ] Default focus appears on route entry.
- [ ] All primary actions reachable with controller.
- [ ] All overlays close with `B`.
- [ ] No focus trap except modal confirmation.
- [ ] Grip-button shortcuts have non-grip alternatives.
- [ ] Virtual keyboard does not hide active text field.

### Accessibility

- [ ] Keyboard navigation complete.
- [ ] Accessible names on all controls.
- [ ] Status uses icon/text plus color.
- [ ] High contrast mode works.
- [ ] Reduced motion mode works.
- [ ] Screen reader labels are meaningful where supported.

### IPC/Security

- [ ] Renderer uses preload API only.
- [ ] No direct Node imports in renderer route code.
- [ ] No arbitrary shell calls.
- [ ] No raw filesystem access.
- [ ] Secrets never display in plaintext.
- [ ] Errors/logs redact sensitive values.
- [ ] Destructive action requires confirmation.

### States

- [ ] Loading state implemented.
- [ ] Empty state implemented where applicable.
- [ ] Error state implemented.
- [ ] Recovery action implemented.
- [ ] Offline state implemented where applicable.
- [ ] Long-running operation can be canceled where applicable.

### Testing

- [ ] Unit tests for state logic.
- [ ] Component tests for key UI components.
- [ ] Playwright happy path.
- [ ] Playwright error path.
- [ ] Playwright 1280×800 visual test.
- [ ] Axe/accessibility check.
- [ ] IPC contract mock test.

## Per-Screen QA Ownership

| Screen ID | Priority | Required Before Alpha | Required Before Beta | Required Before v1.0 |
|---|---|---:|---:|---:|
| SCR-BOOT | P0 | Yes | Yes | Yes |
| SCR-ONB | P0 | Yes | Yes | Yes |
| SCR-WKS | P0 | Yes | Yes | Yes |
| SCR-CMD | P0 | Yes | Yes | Yes |
| SCR-MDL | P0 | Yes | Yes | Yes |
| SCR-AGT | P1 | Basic route only | Yes | Yes |
| SCR-MEM | P1 | Basic route only | Yes | Yes |
| SCR-SES | P0 | Yes | Yes | Yes |
| SCR-PLG | P0 | Yes | Yes | Yes |
| SCR-SET | P0 | Yes | Yes | Yes |
| SCR-SEC | P0 | Yes | Yes | Yes |
| SCR-DIAG | P0 | Yes | Yes | Yes |
| SCR-THEME | P1 | Basic route only | Yes | Yes |
| SCR-EXP | P1 | Basic route only | Yes | Yes |
| SCR-UPD | P1 | Basic route only | Yes | Yes |
| SCR-ERR | P0 | Yes | Yes | Yes |


## Blocking Failures

The following block release:

- Blank screen on route failure.
- Controller cannot reach a primary action.
- Secret visible in renderer, logs, reports, or screenshots.
- Destructive action without confirmation.
- P0 screen clipped at 1280×800.
- Unhandled IPC exception visible to user.
- Accessibility focus invisible.
- App cannot recover from corrupted config.
