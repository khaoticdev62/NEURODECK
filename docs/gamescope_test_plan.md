# Gamescope Validation Test Plan

Since this environment does not have access to a display or the Gamescope compositor, this document serves as the test plan and validation guide for running the SteamOS LLM Terminal (Neurodeck) in SteamOS Game Mode.

## Test Environment Setup

1. **Prerequisites**: A Steam Deck or a Linux PC with `gamescope` installed.
2. **Build**: Build the Linux binary (already in `neurodeck` or use `go build`).
3. **Launch Command**:
   ```bash
   gamescope -W 1280 -H 800 -f -- ./neurodeck
   ```
   *Note: Adjust resolution if testing on a different screen (e.g., 1920x1080).*

## Test Cases

### 1. Rendering and Scaling (AC 1)
- [ ] **Full Screen Fill**: Verify the terminal fills the entire screen without black bars or stretching.
- [ ] **Font Legibility**: Verify that text is crisp and readable at default size.
- [ ] **Color Accuracy**: Verify that the Signal Cyan and other theme colors render correctly.
- [ ] **Resize Handling**: Simulate a resolution change if possible, or verify it starts correctly at the requested resolution.

### 2. Input Handling (AC 2)
- [ ] **Keyboard Input**: If a keyboard is attached, verify typing works.
- [ ] **Steam Input (Controller)**: Map controller buttons according to the `steam_input_guide.md` and verify:
  - Button A sends Enter.
  - Button B sends Esc.
  - Trackpad click opens the keyboard or handles custom bindings.
- [ ] **On-Screen Keyboard**: Bring up the Steam on-screen keyboard (Steam + X) and verify typing works.

### 3. Stability and Performance (AC 3)
- [ ] **No Visual Artifacts**: Look for flickering, tearing, or rendering glitches.
- [ ] **Performance**: Verify smooth scrolling in the viewport and no lag while typing.
- [ ] **Exit Cleanly**: Exit the application and verify Gamescope closes or returns to the terminal correctly.

## Known Issues and Workarounds

- *To be filled by the tester.*
