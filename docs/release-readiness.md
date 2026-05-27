# Release Readiness

## Build Gates

Run these before releasing:

- `cargo check`
- `cargo test`
- `npm run frontend:test`
- `npm run frontend:build`
- `npm run build`
- `cargo audit`
- `npm audit`

If CI is available, prefer the repo-level gates:

- `npm run ci:lint`
- `npm run ci:test`
- `npm run ci:build`
- `npm run ci:security`

## Manual QA

- Open the app at 1280x800 and confirm every tab fits without horizontal scroll
- Verify keyboard navigation across tabs, dialogs, and the radial menu
- Verify gamepad navigation on the Steam Deck layout
- Confirm chat streaming, terminal output, and agent execution still work end to end
- Confirm session save/load, memory search, and settings changes persist
- Confirm loading and error states are usable when Gemini, Ollama, or local tools are unavailable
- Confirm reduced-motion behavior does not block essential interaction

## Release Blockers

- Security regressions in command execution, file handling, or network flows
- Broken build, test, or bundle output
- Version metadata drift across runtime, docs, and KFMS metadata
- Layout regressions on Steam Deck resolution
- Focus traps, inaccessible dialogs, or keyboard dead ends

## Notes

- This project ships as a desktop app, so the release bar is not just "it builds".
- The release must preserve the local trust boundary: IPC commands, plugins, and execution helpers should remain validated and bounded.
