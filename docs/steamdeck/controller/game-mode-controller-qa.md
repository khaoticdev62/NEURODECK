# Game Mode Controller QA

## Must-pass checks

- Launch NEURODECK directly from Game Mode without a keyboard or mouse.
- Reach the main shell, command palette, onboarding, settings, browser chrome, sessions, memory, and plugin manager with controller only.
- Open and close every modal with `A`/`B`.
- Focus a text field, open the Steam keyboard with `Steam + X`, enter text, and return safely.
- Recover from a disconnected controller by reconnecting and continuing without restarting the app.

## Browser-specific checks

- `Y` focuses the address bar.
- `X` reloads the active page.
- `B` exits browser interaction before leaving the browser view.
- Downloads, permission prompts, and profile switches remain reachable.

## Terminal-specific checks

- Terminal focus mode is explicit.
- `B` exits terminal-adjacent overlays and returns to app navigation.
- Steam keyboard entry remains usable.

## Failure handling checks

- Controller disconnect shows a non-blocking recovery path.
- If Gamepad API is unavailable, keyboard and mouse remain fully usable.
- Unknown controller type still uses generic prompts and semantic actions.
