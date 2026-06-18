# 53. Settings

**Category:** J — Settings  
**Complexity:** Tier 2  
**Status:** Exists (`features/settings/SettingsView.tsx`, 1528 lines, 10 panels)  
**Shell:** Full App Shell (also accessible as Modal overlay from nav footer)

---

## Purpose

Configure every aspect of NEURODECK — appearance, AI, models, privacy, controls, storage, networking, and developer options — from a single organized panel.

---

## Primary User Goal

Find and change a specific setting without hunting through menus.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Settings                              [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  ┌────────────────┐  ┌──────────────────────────────────────────────┐  │
│ Rail │  │  [SECTION NAV] │  │  [SETTINGS CONTENT PANEL]                   │  │
│      │  │                │  │                                              │  │
│      │  │  ⚙ General   ◀│  │  General                                     │  │
│      │  │  🎨 Appearance │  │  ───────────────────────────────────────     │  │
│      │  │  🤖 AI         │  │  App Name                                    │  │
│      │  │  🔌 Extensions │  │  ┌───────────────────────────┐               │  │
│      │  │  🎮 Input      │  │  │ NEURODECK                 │               │  │
│      │  │  📚 Knowledge  │  │  └───────────────────────────┘               │  │
│      │  │  ⚡ Performance│  │                                              │  │
│      │  │  🔒 Privacy    │  │  Auto-save sessions           ●──── On       │  │
│      │  │  🎤 Voice      │  │                                              │  │
│      │  │  📦 Packages   │  │  Start in deck mode           ○──── Off      │  │
│      │  │                │  │                                              │  │
│      │  │  [Last saved   │  │  Default view                                │  │
│      │  │   2s ago]      │  │  ┌─────────────────────────────────────────┐│  │
│      │  │                │  │  │ Workspace                           ▾   ││  │
│      │  │  [Reset all]   │  │  └─────────────────────────────────────────┘│  │
│      │  └────────────────┘  │                                              │  │
│      │                      │                          [Save]  [Reset]      │  │
│      │                      └──────────────────────────────────────────────┘  │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [LB/RB] Section  [X] Save          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Section Nav | `<aside>` with button list | 10 section items + Last saved timestamp + Reset All link | Sticky; `aria-label="Settings sections"` |
| Settings Content | `<section>` + `Panel` body | Form fields for current section | Scrollable independently |

---

## Settings Sections

### 1. General
- App name (text, cosmetic)
- Auto-save sessions (toggle)
- Start in deck mode (toggle)
- Default view on launch (select)
- Language (select, display only — future)

### 2. Appearance
- Theme selector (card grid, 7 themes)
- Wallpaper / ambient background (link to #52)
- Font family (select, 19 options)
- Font size (select: sm/md/lg)
- Opacity / glass effect (slider)
- High contrast mode (toggle)
- Colorblind-safe palette (toggle)
- Reduced motion (toggle)

### 3. AI
- Active provider (select: Gemini / Ollama / OpenAI-compat)
- API key (masked input → link to API Key Vault #23)
- Default model (select — populated from provider)
- Active persona (select — 9 built-in + custom)
- Context length limit (select)
- Temperature (slider 0–2)
- RAG enabled (toggle)
- RAG context count (number input 1–10)
- Streaming enabled (toggle)

### 4. Extensions (Plugins)
- Link to Plugin Manager (#46)
- Link to Lua Scripts (#49)
- Plugin auto-update (toggle)
- Allowed plugin permissions overview (link to #48)

### 5. Input
- Control mode (radio: Gamepad / Keyboard+Mouse / Both)
- Controller profile editor (link to #57)
- Keyboard shortcuts (link to #58)
- Gamepad sensitivity (slider)
- Haptic feedback (toggle, Steam Deck only)

### 6. Knowledge
- Memory save enabled (toggle)
- Max memory items (number)
- RAG embedding model (select)
- Project context auto-index (toggle)
- Indexed doc count (display + "Clear index" action)

### 7. Performance
- Rust runtime threads (number)
- Max PTY sessions (number)
- Canvas preview enabled (toggle)
- Image compression in context (toggle)
- Clear cache on exit (toggle)

### 8. Privacy
- Offline mode (toggle) — disables all external calls
- Session history saving (toggle)
- Telemetry (select: Full / Anonymous / None)
- Clear all local data (danger button → ConfirmDialog)
- Export privacy report (button)
- Link to Privacy Center (#54)

### 9. Voice
- STT enabled (toggle)
- Input language (select)
- STT model path (text input)
- Voice activation threshold (slider)

### 10. Packages
- npm package installer UI (link to PackagesView or inline)

---

## Primary Action

**Label:** Save  
**IPC:** `window.neurodeck.system.saveConfig(config)` → updates `llm-term.toml` via bridge  
**Outcome:** Toast "Settings saved" + "Last saved [timestamp]" updated in section nav

---

## Secondary Actions

- **Reset** (per section) — resets only current section to defaults (ConfirmDialog)
- **Reset All** — resets entire config (danger; ConfirmDialog with "This cannot be undone")
- **Link buttons** — navigate to related deep screens (#23, #48, #52, #54, #57, #58)

---

## States

### Unsaved Changes
- "Unsaved changes" badge appears next to section name in nav
- Save button highlights (accent)
- Navigating away shows: "You have unsaved changes. Save before leaving?"

### Save Success
- Toast tone `success`: "Settings saved"
- "Last saved [timestamp]" updates in nav footer

### Save Failed
- `ErrorState` banner: "Settings could not be saved — [reason]"
- Retry Save action

### Permission Required
- Some settings (haptic feedback, hardware accel) show lock icon
- Tooltip: "Requires [permission]"
- Greyed but focusable; ConfirmDialog on activate

### Restart Required
- `Badge` tone `warning` "Restart required" appears next to changed field
- Banner in content area: "Some changes require a restart to take effect"
- "Restart Now" and "Restart Later" buttons

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getConfig()`, `saveConfig()` |
| `window.neurodeck.models` | `list()` — for model selector in AI section |
| `window.neurodeck.security` | Link to API Key Vault |

---

## Controller Navigation

- **D-pad Up/Down (left panel focused):** Move between sections
- **D-pad Up/Down (right panel focused):** Scroll settings fields
- **D-pad Left/Right:** Toggle focused toggle / adjust slider
- **A (confirm):** Activate focused control; open select dropdown
- **B:** Go back to previous view
- **LB / RB:** Previous / next section (while in left or right panel)
- **X:** Save current section
- **L / R stick press:** Switch focus between nav panel and content panel
- **Hint bar:** `[A] Select  [B] Back  [LB/RB] Section  [X] Save`

---

## Keyboard / Mouse Fallback

- **Tab:** Moves through section nav then content fields in DOM order
- **Arrow keys:** Navigate section list (left panel), adjust toggles/sliders (right panel)
- **Enter / Space:** Activate toggle, open select, submit form
- **Escape:** Navigate back / close unsaved changes dialog

---

## Accessibility Notes

- Two-panel layout: `<nav aria-label="Settings sections">` + `<main aria-label="[Section name] settings">`
- Active section button: `aria-current="page"`
- Each form field: `<label>` with `htmlFor` — no unlabelled inputs
- Toggles: `role="switch"`, `aria-checked`
- Sliders: `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- Danger buttons: `aria-describedby` pointing to consequence text
- Live region: `aria-live="polite"` on "Last saved" timestamp

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/settings/SettingsView.tsx` (exists, 1528 lines)  
**Panels dir:** `frontend/src/react/features/settings/panels/`

**Section persistence:** Active panel stored in `localStorage("settingsActivePanel")`

**Config loading:**
```typescript
useEffect(() => {
  window.neurodeck.system.getConfig().then(config => setForm(config))
}, [])
```

**Auto-save option:** Settings support both explicit Save button and an auto-save-on-change mode (debounced 1s). Debounce avoids excessive IPC calls during slider drag.

**Restart-required fields:** Track a `requiresRestart: string[]` list; show banner when any are modified.
