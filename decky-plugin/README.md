# NeuroDeck Bridge (Decky Loader plugin)

A separate, standalone Decky Loader plugin — Python backend + a small React frontend built with Decky's own tooling — that talks to NeuroDeck OS's real local control-plane bridge (`src/core/decky/DeckyBridgeService.ts` in the main repo). This package intentionally lives outside the Electron app's build; it has its own dependencies, its own build step, and is sideloaded into Decky separately.

## What this plugin does

- Shows whether NeuroDeck is running and reachable (real status, not fabricated).
- Brings the NeuroDeck window to the front.
- Triggers a small, fixed set of allowlisted quick actions (open AI Chat, open the AI Command Canvas, open the terminal, go home) — never a generic command channel.

## What this plugin does not do

- It cannot run arbitrary commands in NeuroDeck. `main.py` only ever calls the bridge's fixed, documented endpoints (`/status`, `/quick-actions`, `/focus`, `/quick-actions/{id}/trigger`) — the same allowlist enforced on the NeuroDeck side.
- It is not published to the community Decky plugin store. That's a separate, unstarted effort (store submission, review, versioning policy).
- It does not map Steam Deck's rear buttons (L4/L5/R4/R5) — that's a distinct, still-genuinely-deferred platform gap tracked elsewhere in NeuroDeck's docs (no native Steam Input adapter exists), unrelated to this bridge.

## How the two sides find each other

1. When you enable "Decky Loader bridge" in NeuroDeck's Integrations screen, `DeckyBridgeService` starts a real HTTP server bound to `127.0.0.1` on an OS-assigned port, generates a random 256-bit bearer token, and writes both to `~/.config/neurodeck-os/decky-bridge.json` (owner-read-only).
2. This plugin's `main.py` reads that file before every call. If it's missing (NeuroDeck isn't running, or the bridge is disabled), every method returns `{"available": false, "reason": "..."}` — the frontend shows a real "not connected" state instead of crashing.
3. Every real request carries `Authorization: Bearer <token>`; NeuroDeck rejects anything else with 401.

If NeuroDeck ships under a different Electron `app.getName()` than `neurodeck-os`, update `CANDIDATE_CONFIG_DIR_NAMES` at the top of `main.py`.

## Building

This needs Decky Loader's own SDK packages (`@decky/api`, `@decky/ui`, `@decky/rollup`), which aren't installed in the main NeuroDeck repo and weren't installed as part of building this skeleton — building requires network access to fetch them:

```bash
cd decky-plugin
pnpm install   # or npm install
pnpm run build # produces dist/index.js
```

## Sideloading for testing

Decky Loader must already be installed on the target device (SteamOS or a Linux desktop running Decky's non-Steam-Deck loader build) with Developer Mode enabled in its settings.

1. Build the plugin (above).
2. Copy this entire `decky-plugin/` directory (including `plugin.json`, `main.py`, and the built `dist/`) into Decky's plugin directory — typically `~/homebrew/plugins/NeuroDeck Bridge/` on SteamOS.
3. Restart Decky Loader (or use its "Reload Plugins" developer action).
4. Open the Quick Access Menu (the `...` button) and confirm "NeuroDeck" appears in the plugin list.

## Manual verification checklist (not exercised by CI)

Nothing here runs in this repo's Vitest/Playwright suite — there's no Decky runtime in CI, and this is Python, not TypeScript. Verify by hand on a real or emulated SteamOS/Linux environment with Decky Loader installed:

- [ ] With the NeuroDeck bridge **disabled**, the plugin panel shows "Not connected" (not an error, not a crash).
- [ ] Enable the bridge from NeuroDeck's Integrations screen; the plugin panel updates to "Connected — NeuroDeck &lt;version&gt;" on next open/refresh.
- [ ] "Bring to front" actually focuses/restores the NeuroDeck window from a minimized or background state.
- [ ] Each listed quick action navigates NeuroDeck to the expected real screen.
- [ ] Disabling the bridge in NeuroDeck, then triggering any plugin action, shows "Not connected" again rather than hanging or erroring.
- [ ] Quitting NeuroDeck entirely (bridge process gone) behaves the same as "disabled" — no crash on either side.
- [ ] Restarting NeuroDeck with the bridge previously enabled brings the listener back up automatically (settings persist across restarts), without needing to reopen Integrations.

## What's real vs. what's a documented gap

- Real: the NeuroDeck-side bridge (loopback binding, bearer-token auth, allowlist enforcement) — covered by `src/core/decky/__tests__/DeckyBridgeService.test.ts` in the main repo.
- Real: this plugin's Python client logic (discovery-file parsing, HTTP calls, graceful "unavailable" handling) — syntax-checked, but not executed against a live Decky Loader instance from the environment that built it.
- Documented gap: this hasn't been sideloaded and clicked through on real hardware yet. Do that before relying on it.
