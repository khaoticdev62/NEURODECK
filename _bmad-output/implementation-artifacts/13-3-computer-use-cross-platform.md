# Story 13.3: Resolve computer-use cross-platform support boundary

Status: pending

## Story

As a Developer maintaining the computer-use automation feature,
I want every unsupported-platform code path to be an explicit, documented decision rather than a silent gap,
so that users on uncommon platforms get a clear error and the team has made a deliberate choice about platform scope.

## Acceptance Criteria

1. `capture_screenshot_to_path` (`src-tauri/src/computer_use.rs` ~line 250) — the platform fallback for non-Windows/Linux/macOS targets is reviewed and either: (a) gains a real implementation for one additional target platform (e.g. BSD via X11 tools), or (b) keeps the explicit `Err("Desktop screenshots are not supported on this platform.")` but the error is verified to be reachable only via `#[cfg]`-gated dead code elimination (i.e. it never fires on any of the three supported platforms) and is documented as an intentional boundary.
2. `platform_mouse_move` (~line 298) — same review/decision applied to mouse movement.
3. `platform_mouse_click` (~line 368) — same review/decision applied to mouse clicks.
4. `platform_type_text` (~line 404) — same review/decision applied to keyboard typing.
5. `platform_key` (~line 431) — same review/decision applied to keyboard key press.
6. Whatever decision is made, it is applied **consistently** across all 5 functions — no mixing where some get real implementations and others stay stubbed without documented rationale.
7. The decision and its rationale are recorded in `docs/MOCK_DATA_WIRING_HANDOFF.md` and in this story's Dev Notes (see Open Question below) so future contributors understand the platform-support boundary is intentional, not an oversight.
8. If the decision is "no new platform support, error stays" — the error message text is reviewed for clarity (e.g. naming exactly which platforms ARE supported) so it's actionable for a user who hits it.

## Tasks / Subtasks

- [ ] Audit `src-tauri/Cargo.toml` and `tauri.conf.json` target/platform configuration to confirm which OS targets NEURODECK is actually built/shipped for today (Windows, Linux/Steam Deck, macOS per the `#[cfg(target_os = ...)]` blocks already present).
- [ ] Get a product/maintainer decision on whether any 4th platform (BSD, or a more granular Linux Wayland-vs-X11 split) needs explicit support, given the existing Linux branch already special-cases `xdotool`/`grim`/`gnome-screenshot`/`spectacle`/`ImageMagick import` per-tool fallbacks (see `capture_screenshot_to_path` ~line 230-249 and `find_text_with_tesseract` chain).
- [ ] If no new platform support is added: update the 5 fallback error strings (currently slightly inconsistent wording: "Desktop screenshots are not supported on this platform." / "Mouse movement is not supported on this platform." / "Mouse click is not supported on this platform." / "Keyboard typing is not supported on this platform." / "Keyboard key press is not supported on this platform.") to a single consistent template that names the 3 supported platforms explicitly.
- [ ] If new platform support IS added: implement it following the existing per-OS pattern (each function already has a `#[cfg(target_os = "...")]` block per platform — add one more block).
- [ ] Add a code comment above each `#[allow(unreachable_code)]` fallback explaining that it is intentionally unreachable on supported builds and is a defensive fallback for build configs that disable all 3 `#[cfg]` blocks (verify this assumption is actually true by checking Cargo feature flags don't make 0 platforms match in a default build).
- [ ] Write the platform-support boundary decision into `docs/MOCK_DATA_WIRING_HANDOFF.md`'s computer-use section.
- [ ] Manual verification: confirm computer-use screenshot/mouse/keyboard actions still work on at least one currently-supported platform (regression check) after any error-message or structural changes.

## Dev Notes

- OPEN QUESTION / PRODUCT DECISION NEEDED: Unlike Stories 13.1, 13.2, 13.4, and 13.5 — where "zero mocked data" clearly means "replace the stub with a real implementation" — Story 13.3's correct resolution may simply be "this is already correct: explicit unsupported-platform errors ARE the desired real behavior, not a mock." NEURODECK ships for Windows, Linux (Steam Deck/SteamOS), and macOS per the existing `#[cfg(target_os = ...)]` coverage; there is no current product requirement for BSD or other platforms. Before any code changes are scoped, get an explicit answer to: "Do we need computer-use support on any platform beyond Windows/Linux/macOS?" If the answer is no, this story's deliverable is documentation + consistent error messaging only, not new platform code — and that should be stated plainly in the handoff doc so it isn't mistaken for unfinished work in a future audit.
- The existing Linux screenshot path already demonstrates graceful multi-tool fallback (`grim` → `gnome-screenshot` → `spectacle` → ImageMagick `import`) — if BSD support is ever added, follow that same "try several known tools, give a clear combined error" pattern rather than picking one tool and failing hard.
- macOS paths require Accessibility permission (`require_macos_accessibility()`, ~line 128) — any new platform work for mouse/keyboard control will likely need an equivalent OS-level permission gate; research this before implementing.

## Dev Agent Record
### Agent Model Used
[unassigned]
