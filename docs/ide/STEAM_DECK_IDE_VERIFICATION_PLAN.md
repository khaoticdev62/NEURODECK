# Steam Deck IDE Verification Plan

Manual verification checklist for NEURODECK's controller-first IDE on Steam Deck (1280×800).

## Environment Setup

```bash
# On Steam Deck in Game Mode:
./launch_gamescope.sh   # Resolution: 1280×800, fullscreen

# Or in Desktop Mode:
npm run dev             # Electron + sidecar on localhost:9477
```

## Verification Sections

---

### 1. Layout Integrity at 1280×800

| Test | Expected | Pass/Fail |
|---|---|---|
| Open IDE view | Full 1280×800 window, no scroll | |
| File tree visible | Left sidebar ~208px, not overflowing | |
| Editor takes remaining width | 100% minus sidebar and tab bar | |
| PredictiveBar visible | 56px bar at bottom of editor, not overlapping status bar | |
| ControllerHintBar visible | 32px bar at top, shows mode hints | |
| LanguageModeBadge visible | Bottom-right of editor area, pill shape | |
| No horizontal scroll | No scrollbar on body | |
| Log panel visible | Bottom of view, scrollable | |

---

### 2. File Operations via Controller

| Test | Button | Expected |
|---|---|---|
| Navigate file tree | DPad Up/Down | Focus moves between files |
| Open a file | A button | File opens in editor tab |
| Switch tabs | L1 / R1 | Active tab changes |
| Save file | Y + Save action | File saved, dirty indicator clears |
| New file prompt | Opens | Keyboard/Steam KB appears |
| Close tab | B button on tab | Tab closes |

---

### 3. Predictive Bar Interaction

| Test | Button | Expected |
|---|---|---|
| Open .ts file | — | PredictiveBar populates with suggestions |
| Cycle predictions | DPad Down | Next prediction highlighted |
| Cycle predictions | DPad Up | Previous prediction highlighted |
| Accept top prediction | A | Text inserted at cursor |
| Dismiss predictions | B | Bar cleared |
| LSP completion shown | — | Confidence 0.95, type: lsp_completion |
| Snippet shown | — | Confidence 0.6, type: snippet |
| Command shown | — | Confidence 0.5, type: command |

---

### 4. Radial Command Wheel

| Test | Button | Expected |
|---|---|---|
| Open wheel | Y (in IDE_EDIT mode) | 8-segment wheel overlays editor |
| Select Run segment | Left Stick → Run sector | Run segment highlighted, preview text shown |
| Confirm command | A | Command runs, output in log panel |
| Cancel wheel | B | Wheel closes, no command runs |
| Segment count | — | 8 segments visible: Run, Test, Build, Format, Lint, Refactor, Diagnostics, Snippets |

---

### 5. Safe Command Execution

| Test | Expected |
|---|---|
| `cargo build` from Rust project | Runs immediately (safe tier) |
| `npm install` | Shows confirm dialog before running |
| `rm -rf /` | Rejected with BLOCKED message, never executes |
| `git reset --hard` | Shows dangerous dialog, requires typing CONFIRM |
| Output streams in log panel | Each line appears as command runs |
| Cancel long-running command | R2 cancels, SIGTERM sent |

---

### 6. LSP Diagnostics

| Test | Expected |
|---|---|
| Open .ts file with type error | Red underline after ~1 second |
| Cursor on error | DiagnosticFixPanel slides up |
| Navigate fixes with DPad | Fix options highlighted |
| Apply a fix | A applies, code changes, diagnostic clears |
| LanguageModeBadge shows ●ready | LSP started successfully |
| LanguageModeBadge shows ○missing | LSP not installed, graceful degradation |

---

### 7. Controller Mode Transitions

| Test | Button/Trigger | Expected Mode |
|---|---|---|
| Initial IDE open | — | IDE_NAVIGATION |
| Focus editor area | A | IDE_EDIT |
| Trigger completions | X (in IDE_EDIT) | IDE_PREDICTION |
| Press Y in IDE_EDIT | Y | IDE_COMMAND |
| Press B to dismiss | B | Returns to IDE_EDIT |
| ControllerHintBar updates | — | Hints match current mode |

---

### 8. Performance at 1280×800

| Test | Target | Pass/Fail |
|---|---|---|
| File tree render (100 files) | < 100ms | |
| LSP completion response | < 500ms | |
| Predictive bar update on cursor move | < 250ms (200ms debounce + render) | |
| Radial wheel open animation | < 100ms | |
| Command output streaming | No frame drops during output | |

---

### 9. Accessibility (Steam Deck keyboard fallback)

| Test | Expected |
|---|---|
| Backtick opens radial menu | Works in desktop mode |
| Ctrl+S saves file | Works with keyboard attached |
| Tab key in editor | Indentation inserted |
| Escape dismisses predictions | PredictiveBar clears |
| Arrow keys navigate file tree | Focus moves between entries |

---

### 10. Degraded State Handling

| Scenario | Expected |
|---|---|
| LSP server not installed | Badge shows ○missing, editing continues without completions |
| Command exits with error code | Exit code shown in log, error highlighted |
| Workspace path does not exist | Error message in log, file tree shows empty state |
| Network unavailable (LSP needed) | Local-only LSP continues working |

---

## Automated Gate (CI)

```bash
npm run production:ide-gate
```

This runs all 7 verification scripts + exports the readiness report. Must pass before merging to main.

## Hardware Required for Full Verification

- Steam Deck (1280×800 display)
- Steam Input profile: `assets/steam-input/neurodeck.vdf`
- LSP servers installed: `typescript-language-server`, `pyright-langserver`, `rust-analyzer`, `gopls`
- Sample workspace with mixed languages

Controller E2E tests (`tests/e2e/steam_deck_ide.test.ts`) are marked `requires-hardware` and are skipped in CI.
