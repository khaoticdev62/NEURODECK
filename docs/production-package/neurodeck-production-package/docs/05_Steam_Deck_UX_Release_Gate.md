# NEURODECK Steam Deck UX Release Gate

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Display Constraints

| Constraint | Value | Enforcement |
|---|---|---|
| Primary resolution | 1280×800 | Fixed window size, no resize |
| Orientation | Landscape only | No rotation support |
| Touch | Capacitive + resistive (LCD) / capacitive (OLED) | All targets ≥ 44×44px |
| Controller | Required for Game Mode | No mouse-only critical paths |

---

## 2. Controller Navigation

### 2.1 Input Map

| Input | Action |
|---|---|
| D-pad Left/Right | Cycle outer nav tabs (when no slider/select focused) |
| D-pad Up/Down | Cycle inner tabs (Share: LAN/FTP/SFTP), SSH profile list |
| A button | Activate focused element, open modal |
| B button | Back, close modal, cancel |
| X button | Context action (copy, delete, etc.) |
| Y button | Secondary action (save, export, etc.) |
| L2 (hold) | Open radial menu (15 segments) |
| Left stick (while L2 held) | Select radial segment |
| L2 (release) | Navigate to selected view |
| L1/R1 | SSH profile load (when profile focused) |
| Backtick `` ` `` (keyboard) | Toggle radial menu |
| Ctrl+K | Open Command Palette |

### 2.2 Radial Menu Segments (15)

```
Chat, Canvas, Terminal, SSH, Tunnel, Share,
Browser, Agent, Memory, Dashboard, PromptLab,
Remote, Docs, Workflow, Scheduler
```

Each segment: 24° arc. Selection via stick angle math with 18° half-sector offset.

---

## 3. Layout Rules

### 3.1 CSS Specificity Trap (CRITICAL)

> **Never add `display: flex` or `display: block` to `#view-*` ID rules.**
>
> ID selectors have specificity 100, which beats `.view-content.active` (specificity 20). Adding display to an ID rule permanently overrides the hide rule and breaks tab switching.
>
> **Correct:** Use `flex-direction`, `overflow`, `background` on ID rules only.

### 3.2 View Container

```css
.view-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}
.view-content { display: none; }
.view-content.active { display: flex; }
```

### 3.3 Modal Constraints

- All modals must use `FocusTrap`
- Max width: 1200px, max height: 760px
- Centered with `margin: auto`
- Backdrop click or B button closes
- Escape key closes (keyboard fallback)

### 3.4 Scroll Behavior

- View roots: `overflow: hidden`
- Internal scroll: `overflow-y: auto` with custom scrollbar styling
- Never horizontal scroll at 1280×800

---

## 4. SteamOS Game Mode Requirements

### 4.1 Launch

```bash
# Gamescope wrapper (1280×800 fullscreen)
./launch_gamescope.sh

# Contents:
gamescope -W 1280 -H 800 -f -- ./neurodeck
```

### 4.2 Steam Input

- `assets/steam_input/steam_input.vdf` — Controller mapping for Steam Deck
- Radial menu: L2 trigger
- D-pad navigation: mapped to arrow keys
- A/B buttons: mapped to Enter/Escape
- Import via Steam → Controller → Import

### 4.3 Steam Grid Assets

| Asset | Size | Location |
|---|---|---|
| Hero | 1920×620 | `assets/steam-grid/hero.png` |
| Logo | 640×360 | `assets/steam-grid/logo.png` |
| Icon | 256×256 | `assets/steam-grid/icon.png` |
| Capsule | 460×215 | `assets/steam-grid/capsule.png` |

---

## 5. Release Gate Checklist

### Layout
- [ ] All 19+ views fit within 1280×800
- [ ] No horizontal overflow on any view
- [ ] Modals fit within viewport with padding
- [ ] FocusTrap works on all modals (keyboard + controller)

### Navigation
- [ ] D-pad cycles all outer nav tabs
- [ ] D-pad cycles inner tabs within Share and SSH
- [ ] L2 opens radial menu, stick selects, release navigates
- [ ] Backtick toggles radial (keyboard mode)
- [ ] Ctrl+K opens Command Palette
- [ ] A button activates, B button cancels on all interactive elements

### Input
- [ ] All buttons/touch targets ≥ 44×44px
- [ ] No hover-only critical actions
- [ ] Steam virtual keyboard works in all text inputs
- [ ] No mouse-only critical paths

### Game Mode
- [ ] App launches in gamescope 1280×800
- [ ] Controller works without desktop mode
- [ ] Recovery flows usable without keyboard/mouse
- [ ] Boot sequence completes in < 3s

### Performance
- [ ] Frame rate stable at 60fps in Game Mode
- [ ] No jank during tab switches
- [ ] Canvas preview renders smoothly
- [ ] Terminal scrollback doesn't drop frames
