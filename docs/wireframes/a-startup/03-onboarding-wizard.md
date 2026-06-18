# 03. First Launch Onboarding Wizard

**Category:** A — Startup  
**Complexity:** Tier 2  
**Status:** Exists (`components/onboarding/OnboardingModal.tsx` + `steps/`)  
**Shell:** Full-Screen Overlay — modal over blank app shell; not dismissible until completion or explicit skip

---

## Purpose

Guide first-time users through core setup without wasting time, covering control mode, model setup, API keys, privacy, and storage.

---

## Primary User Goal

Complete setup and reach the main workspace ready to use NEURODECK.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────┐   │
│   │  [WIZARD CHROME]                                                       │   │
│   │  Step 3 of 14 · Choose Control Mode           [✕ Skip Setup]          │   │
│   │  ━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │   │
│   ├────────────────────────────────────────────────────────────────────────┤   │
│   │                                                                        │   │
│   │  [STEP VISUAL / DIAGRAM ZONE]                                          │   │
│   │  (icon, illustration placeholder, or interactive demo)                 │   │
│   │                                                                        │   │
│   │  [STEP CONTENT ZONE]                                                   │   │
│   │  [Step Title — h2]                                                     │   │
│   │  [Short explanation — 1–2 sentences max]                               │   │
│   │                                                                        │   │
│   │  [PRIMARY INPUT / SELECTION ZONE]                                      │   │
│   │  (varies per step: radio cards, toggles, key input, etc.)              │   │
│   │                                                                        │   │
│   │  [CONTROLLER HINT BAR (in-wizard)]                                     │   │
│   │  [A] Select  [B] Back  [X] Skip Step  [Y] Help                        │   │
│   ├────────────────────────────────────────────────────────────────────────┤   │
│   │  [FOOTER ZONE]                                                         │   │
│   │  [← Back]                              [Skip]   [Next →]              │   │
│   └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Wizard Chrome | Custom header | Step X of 14, step title, progress bar, Skip button | `aria-label="Setup wizard"` |
| Progress Bar | `<progress>` | Linear fill per step | `aria-valuenow={step}` `aria-valuemax="14"` |
| Step Visual | SVG / icon block | Large icon or diagram relevant to step | Changes per step; not decorative — describes the step |
| Step Content | `h2` + `p` | Title + short explanation | Max 2 sentences |
| Primary Input | Varies | Radio cards, toggles, `TextInput`, `Select` | See per-step breakdown |
| In-wizard Hint Bar | `DeckButtonHint` row | Contextual controller hints | Different from app shell hint bar |
| Footer | `Button` row | Back / Skip / Next | Back hidden on step 1; Next changes to "Finish" on step 14 |

---

## Step Definitions

| # | Step Title | Visual | Primary Input | Notes |
|---|-----------|--------|--------------|-------|
| 1 | Welcome to NEURODECK | App icon + wordmark | None | Auto-advances available; just "Get Started →" |
| 2 | Choose Control Mode | Controller vs keyboard icon split | Radio: Gamepad / Keyboard+Mouse / Both | Persists to `controllerSettings.mode` |
| 3 | Steam Deck Controls Overview | Button diagram | None (read-only) | Skip if "Keyboard+Mouse" chosen in step 2 |
| 4 | Local Model Setup | Model + gear icon | File picker or path input for model file | Optional; "Skip for now" |
| 5 | Remote Provider Setup | Cloud icon | Provider selector (`Select`) + Base URL field | Optional |
| 6 | API Key Vault Setup | Key icon | Masked `TextInput` for API key | Optional; security note inline |
| 7 | Privacy / Offline Mode | Eye-off icon | Toggle: Offline Mode, Toggle: Save History | Stored in settings |
| 8 | Storage / Session Setup | Database icon | Directory picker or default path display | Shows storage estimate |
| 9 | Plugin Permissions | Puzzle icon | Permission toggle list (3–5 toggles) | "Deny all" shortcut |
| 10 | Theme Selection | Palette grid | Theme card picker (7 themes) | Live preview applies immediately |
| 11 | Learn Neural Command Window | Chat icon | Interactive mini-demo: type a sample prompt | Can be skipped |
| 12 | Run Diagnostics | Activity icon | Auto-runs `run_onboarding_diagnostics`; shows results | Retry on failure |
| 13 | Choose Quick Start | Grid of 3 cards | Card picker: "Start chatting" / "Set up agent" / "Open terminal" | Sets initial `activeView` |
| 14 | Finish | Checkmark / launch icon | None | "Launch NEURODECK →" button |

---

## Primary Action

**Label:** Next → (steps 1–13) / Launch NEURODECK → (step 14)  
**Outcome:** Advances wizard; on step 14 sets `localStorage("neurodeck_onboarding_complete", "true")` and dismisses modal

---

## Secondary Actions

- **← Back** — returns to previous step (unavailable on step 1)
- **Skip** — skips optional steps (4, 5, 6, 9, 11); not available on required steps (1, 2, 7, 10, 12, 14)
- **Skip Setup** (✕ in chrome) — exits wizard entirely, goes to workspace; marks onboarding complete

---

## States

### Fresh (Step 1)
- Back hidden, Next prominent

### Skipped Step
- Step indicator shows a `—` instead of ✓
- Later steps can still reference the skipped config

### Diagnostics Running (Step 12)
- Inline loading spinner
- Check list animates in as each check resolves
- Retry button if any check fails

### Diagnostics Failed (Step 12)
- Failed items show `ErrorState` inline
- "Continue Anyway" available
- "Open Full Diagnostics" link

### Validation Error (Steps with input)
- Inline error below input field
- Next button disabled until resolved

---

## IPC Dependencies

| Connector | Commands Used | Step |
|-----------|--------------|------|
| `window.neurodeck.system` | `run_onboarding_diagnostics()` | 12 |
| `window.neurodeck.models` | `list()`, `importModel()` | 4 |
| `window.neurodeck.security` | `saveApiKey()` | 6 |
| `window.neurodeck.plugins` | `getPermissions()` | 9 |
| `window.neurodeck.themes` | `apply()` | 10 |

---

## Controller Navigation

- **D-pad Left/Right:** Move between option cards (steps with card pickers)
- **D-pad Up/Down:** Move between toggle rows (steps with toggle lists)
- **A (confirm):** Select highlighted card / activate toggle / advance
- **B (back):** Previous step
- **X:** Skip current step (if skippable)
- **Y:** Open contextual help for current step
- **Hint bar:** `[A] Select  [B] Back  [X] Skip  [Y] Help`

---

## Keyboard / Mouse Fallback

- **Tab:** Move through inputs in DOM order
- **Enter:** Activate "Next" button
- **Escape:** Opens "Are you sure you want to skip setup?" confirm dialog
- **Arrow keys:** Navigate radio card groups

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="NEURODECK Setup Wizard"`
- `FocusTrapContainer` wraps entire wizard
- Focus returns to triggering element on close
- Progress bar: `role="progressbar"`, `aria-valuenow={currentStep}`, `aria-valuemax="14"`, `aria-label="Setup progress"`
- Each step title is `<h2>` — establishes heading hierarchy within dialog
- Input validation: `aria-describedby` links field to its error message
- Live region `aria-live="polite"` announces step title on advance

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/onboarding/OnboardingModal.tsx` (713 lines — exists, refine don't rewrite)  
**Steps dir:** `frontend/src/react/components/onboarding/steps/`

**Reuse:**
- `Modal` for the outer frame (size `xl`, `trap=true`, no `closeOnBackdrop`)
- `FocusTrapContainer` already applied
- `Button` for footer actions
- `Tabs` NOT used — wizard is linear, not tabbed
- Per-step: `TextInput`, `Select`, `Toggle`, `StatusChip`

**State:** `localStorage("neurodeck_onboarding_complete")` gates first-run display; `onboardingMode` in global state (`"welcome" | "setup" | "none"`)

**Persisted data from wizard:**
```typescript
// Persisted at wizard completion:
dispatch({ type: "set-controller-settings", settings: { mode } })
dispatch({ type: "set-theme", theme: selectedTheme })
dispatch({ type: "set-active-view", view: quickStartChoice })
localStorage.setItem("neurodeck_onboarding_complete", "true")
```
