# NEURODECK Controller Focus Graph v1.0

**Date:** 2026-06-09

## Global Focus Rules

1. Every route must define a default focus target.
2. Focus must never disappear after route change, modal close, failed IPC call, or layout collapse.
3. `B` must move backward through overlays before leaving the route.
4. `A` must activate only the focused item.
5. All destructive actions require a confirmation step.
6. Grip-button shortcuts may accelerate common actions but cannot be the only path.

## Global Controller Mapping

| Input | Default Action |
|---|---|
| D-pad / Left Stick | Move focus |
| A | Activate |
| B | Back / close |
| X | Secondary action |
| Y | Detail/help/action menu |
| Start/Menu | Command Palette |
| Select/View | Diagnostics shortcut where allowed |
| L1/R1 | Switch tabs/panels |
| L4 | Persona/context |
| R4 | Regenerate/retry |
| L5 | Save/export |
| R5 | New session/new item |

## Screen Default Focus Targets

| Screen ID | Default Focus | Escape Target | Notes |
|---|---|---|---|
| SCR-BOOT | Startup primary recovery action if visible, otherwise none | None / Recovery action required | No complex focus graph. |
| SCR-ONB | Current step primary control | Previous route | D-pad moves between step controls. |
| SCR-WKS | InputConsole | Previous route | Default focus is InputConsole on new session. |
| SCR-CMD | Command search input | Previous route | Opening palette focuses search box. |
| SCR-MDL | Active provider card | Previous route | D-pad left/right moves provider list to details. |
| SCR-AGT | First active agent card | Previous route | D-pad moves through cards. |
| SCR-MEM | Search input or first memory item | Previous route | A opens selected memory. |
| SCR-SES | Most recent session card | Previous route | D-pad moves session cards. |
| SCR-PLG | First extension card | Previous route | A opens extension details. |
| SCR-SET | Selected category | Previous route | D-pad left/right moves categories/details. |
| SCR-SEC | Security posture summary card | Previous route | A opens selected security item. |
| SCR-DIAG | Health score card | Previous route | D-pad navigates health cards. |
| SCR-THEME | Current theme card | Previous route | D-pad moves theme cards. |
| SCR-EXP | Export source selector | Previous route | A edits option. |
| SCR-UPD | Update status action | Previous route | A opens selected action. |
| SCR-ERR | Safest recovery action | None / Recovery action required | Default focus is safest primary action. |


## Focus Zones

```text
AppShell
├─ TopStatusBar
├─ NavRail
├─ PrimaryContent
├─ ContextRail
├─ FooterActions
└─ OverlayLayer
```

### Zone Movement Rules

- Left from PrimaryContent moves to NavRail when visible.
- Right from PrimaryContent moves to ContextRail when visible.
- Down from scrollable content moves to footer/input only when at logical end or by explicit shortcut.
- Overlays trap focus until closed or completed.
- Collapsed rails must preserve the previously focused child when reopened.

## Required Focus Tests

For each route:

1. Enter route and assert default focus.
2. Move through all focusable elements with D-pad.
3. Open and close any overlay.
4. Trigger one failed IPC action and assert focus returns to a safe element.
5. Switch to 1280×800 and repeat primary flow.
6. Enable high contrast and verify focus ring visibility.
7. Enable reduced motion and verify no focus animation dependency.
