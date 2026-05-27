# Deprecated Frontend Code

This directory contains frontend code that is currently **unused** by the application but preserved for reference and potential future re-integration.

## Files

| File | Original Location | Reason for Deprecation |
|------|-------------------|------------------------|
| `OAuthLogin.tsx` | `components/OAuthLogin.tsx` | React component; app uses vanilla JS, not React runtime |
| `store.ts` | `store.ts` | Zustand store; app uses vanilla mutable `state.js` instead |
| `bindings/Intent.ts` | `bindings/Intent.ts` | `ts-rs` generated binding; never imported by any JS module |
| `bindings/StatePatch.ts` | `bindings/StatePatch.ts` | `ts-rs` generated binding; never imported by any JS module |

## Notes

- The frontend is intentionally built with **vanilla JavaScript** (~11,700 lines in `main.js`) rather than React.
- React, Zustand, and TanStack Virtual are still listed in `package.json` dependencies to preserve the option for future migration.
- If you plan to re-integrate any of these files, update imports and ensure they are wired into `main.js`.
- These bindings were generated from `core/src/ipc.rs` via `ts-rs`. If the Rust types change, regenerate them with `cargo test --package neurodeck_core`.
