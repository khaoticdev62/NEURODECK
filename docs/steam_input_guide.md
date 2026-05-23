# Steam Input Configuration Guide — NEURODECK v1.0

This guide covers the official Steam Input profile for NEURODECK on Steam Deck.
The profile ships at `assets/steam_input/neurodeck_gamepad.vdf`.

---

## How to Install the Profile

1. **Desktop Mode** → Open Steam → Library → right-click NEURODECK → **Properties**
2. Go to **Controller** → **Override for NEURODECK** → **Edit Layout**
3. Click the gear icon (⚙) → **Import Config** → browse to:
   ```
   ~/Applications/neurodeck/neurodeck_gamepad.vdf
   ```
   (or wherever you installed NEURODECK — the VDF is in the same folder as the binary after `install.sh`)
4. Save and switch back to **Game Mode**.

Alternatively, you can manually apply the mappings below through the Controller Settings UI.

---

## Input Mapping Reference

### Physical Controls → NEURODECK Actions

| Steam Deck Control | Gamepad API Index | NEURODECK Action |
|---|---|---|
| **A** | `buttons[0]` | Confirm / click focused element |
| **B** | `buttons[1]` | Cancel / close overlay / dismiss cursor |
| **X** | `buttons[2]` | Jump to Chat tab + focus input |
| **Y** | `buttons[3]` | Cycle active AI persona |
| **L1** | `buttons[4]` | Cycle tabs left / navigate SSH profiles |
| **R1** | `buttons[5]` | Cycle tabs right |
| **L2 (hold)** | `buttons[6].value` | Radial menu — left stick selects view, release activates |
| **R2** | `buttons[7]` | Controller Prompt Picker overlay |
| **Select** | `buttons[8]` | Run Canvas code |
| **Start** | `buttons[9]` | Toggle Settings modal |
| **L3 (click)** | `buttons[10]` | — |
| **R3 (click)** | `buttons[11]` | Click at touchpad cursor position |
| **D-pad Up** | `buttons[12]` | Move gamepad focus up |
| **D-pad Down** | `buttons[13]` | Move gamepad focus down |
| **D-pad Left** | `buttons[14]` | Move gamepad focus / adjust slider |
| **D-pad Right** | `buttons[15]` | Move gamepad focus / adjust slider |
| **L4 (grip)** | `buttons[17]` | Toggle left Sidebar |
| **R4 (grip)** | `buttons[18]` | Toggle right Context Drawer |
| **L5 (grip)** | `buttons[19]` | Clear Canvas |
| **R5 (grip)** | `buttons[20]` | Cycle Theme |

### Analog Inputs

| Steam Deck Control | Gamepad API | NEURODECK Action |
|---|---|---|
| **Left stick** | `axes[0]` / `axes[1]` | Radial segment selection (L2 held) OR scroll active panel (L2 up) |
| **Right stick** | `axes[2]` / `axes[3]` | Touchpad cursor movement (Sprint C fallback — see below) |

### Touchpad Controls (via Steam Input profile)

| Steam Deck Control | Steam Input Mode | Result |
|---|---|---|
| **Right touchpad** | `absolute_mouse` | Precision OS cursor — WebKit sees native `mousemove`/`click` events |
| **Right touchpad tap** | Mouse left button | Left click at cursor position |
| **Right touchpad double-tap** | Mouse right button | Right click |
| **Left touchpad swipe** | `scroll_wheel` | Scroll active panel natively via OS scroll events |
| **Left touchpad click** | xinput JOYSTICK_LEFT | — |

---

## Two-Layer Touchpad Architecture

NEURODECK has **two independent touchpad input layers**:

### Layer 1 — Steam Input (Game Mode, recommended)
When the Steam Input profile is active (you're launching from Steam Game Mode with the VDF applied):
- **Right touchpad** → Steam converts to OS mouse cursor events → WebKit receives `mousemove`/`click` natively
- **Left touchpad** → Steam converts to OS scroll wheel events → all `overflow-y: auto` containers scroll natively
- No JavaScript cursor overlay appears — the OS cursor is used
- This is the highest-fidelity path

### Layer 2 — JS Cursor Overlay (non-Steam / gamescope / direct launch)
When launching via `./neurodeck` or `./launch_gamescope.sh` without Steam Input:
- **Right stick** (`axes[2]`/`axes[3]`) → drives a crosshair cursor overlay (`#tp-cursor`)
- Cursor fades after 2.5 seconds of inactivity
- **R3 click** (`buttons[11]`) → dispatches `click` event on element under cursor
- **Left stick** (`axes[0]`/`axes[1]`) when L2 is not held → scrolls the active panel
- A scroll indicator briefly appears on screen when scroll is active

---

## Radial Menu Details

- **L2 (hold)** → opens the 10-segment radial menu
- **Left stick** → move stick in a direction to highlight the target segment (label shows at center)
- **Release L2** → activates the highlighted view
- **Backtick `` ` ``** (keyboard) → same as L2, toggle open/close

### Radial Segments (clockwise from top)

| Stick Direction | View |
|---|---|
| Up | 💬 Chat |
| Up-Right | 🎨 Canvas |
| Right | 💻 Terminal |
| Down-Right | 🔑 SSH |
| Down | 🔗 Tunnel |
| Down-Left | 🌐 Browser |
| Left | 🤖 Agent |
| Up-Left | 🧠 Memory |
| — | 📤 Share |
| — | 📱 Remote |

---

## Virtual Keyboard

When NEURODECK detects a touch event followed by text input focus, a full QWERTY keyboard panel slides up from the bottom of the screen. This is designed for **touchscreen use** (the Steam Deck's 1280×800 display).

- The keyboard appears automatically when you tap any text input in touch mode
- The **B button** dismisses it
- Shift auto-releases after one character
- Ctrl / Alt are sticky toggles (press again to release)

---

## Configuring Without the VDF

If you prefer to configure manually in Steam's Controller Settings UI:

1. Set **Right Touchpad** → **Mouse** (Absolute, Sensitivity: ~350, No trackball)
2. Set **Left Touchpad** → **Scroll Wheel** (Sensitivity: ~60, Invert: Off)
3. Set all face buttons to **Gamepad Button** (pass-through xinput)
4. Set both **Triggers** to **Analog Trigger** (pass-through)
5. Set all **Shoulder / Back / Grip buttons** to **Gamepad Button**
6. Leave both **Joysticks** as **Joystick Move** (pass-through)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Radial menu doesn't open | Ensure L2 trigger axis is pass-through (not keyboard mapped) |
| Right touchpad has no cursor | Apply the VDF profile, or use Sprint C's JS cursor (right stick) as fallback |
| Left touchpad doesn't scroll | Check Left Touchpad is set to Scroll Wheel in Steam Input, not Click/Joystick |
| A/B/X/Y not responding | Ensure face buttons are xinput pass-through, not keyboard key mappings |
| Virtual keyboard appears in desktop mode | Expected — tap anywhere outside the keyboard or press B to dismiss |
