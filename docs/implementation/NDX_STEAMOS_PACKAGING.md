# SteamOS / Linux packaging (Epic 12)

Real, scoped to: producing a correctly-identified Linux package (AppImage, snap, deb) that SteamOS Game Mode and Desktop Mode can both run, and documenting how to cross-build it from a Windows host where the native Linux packaging tools (`mksquashfs`, `dpkg-deb`/`fpm`) don't exist. This does **not** cover a signed release pipeline, an official Steam store listing, or a Decky Loader plugin — those are separate, unstarted efforts.

## What's real

- `electron-builder.yml`'s `appId`/`productName`/`linux.maintainer` no longer carry the unconfigured scaffold defaults (`com.electron.app`, `neurodeck_scaffold`, `electronjs.org`) — they're `com.neurodeck.os`, `NeuroDeck OS`, and `NeuroDeck`.
- `package.json`'s `desktopName` + `electron-builder.yml`'s `linux.syncDesktopName: true` make electron-builder auto-derive a correct `StartupWMClass` (`neurodeck-os`) that actually matches the `app_id` Electron itself reads from `desktopName` at runtime — verified by extracting a real built AppImage and inspecting its embedded `.desktop` file (see "How this was verified" below), not just by reading documentation.
- `package.json` gained a real `homepage` (the project's actual GitHub remote) — `fpm` (the tool electron-builder uses for `.deb`) refuses to build without one.
- The dead `publish` block pointing at `https://example.com/auto-updates` was removed — there is no `electron-updater` integration anywhere in this codebase (`ND-049 Updates` is intentionally scoped to a user-configured JSON feed check, not electron-builder's own update channel), so that config was never real.
- `linux.category: Development` (was `Utility`) — more accurate given the app bundles a terminal, Git control center, and Build Studio.

## How this was verified

Real Linux packaging tools (`mksquashfs`, `fpm`/`dpkg-deb`) have no Windows port — attempting `electron-builder --linux` directly on a Windows host fails at the native-tool step regardless of any config change (this is a tooling-availability limitation, not a bug in this repo). The fix isn't a config change; it's building on real Linux tooling:

1. **WSL2 with Ubuntu already had what was needed** (`mksquashfs`, `node`, `npm`) — no extra setup was required on this machine, just running the build from there.
2. The project (excluding `node_modules`/`.git`/build output) was synced into the WSL filesystem (`rsync` into `~/`, not `/mnt/c/...`, for native-module-ABI cleanliness and I/O speed) and `npm install` was run fresh inside WSL.
3. That fresh install caught a **real, previously-masked bug**: `clsx` is imported directly in `src/renderer/src/features/search/GlobalSearch.tsx` and `SearchResultRow.tsx` but was never a declared dependency in `package.json`/`package-lock.json`. The Windows dev machine's build only "worked" because of a stale `node_modules/.vite/deps/clsx.js` cache left over from before `clsx` was apparently removed as a dependency without checking that source still imported it — a fresh checkout would fail to build. **Fixed**: added `"clsx": "^2.1.1"` to `package.json`'s real `dependencies` and regenerated `package-lock.json`.
4. With that fix, `npm run build:linux` inside WSL produced real `neurodeck-os-0.0.0.AppImage`, `neurodeck-os_0.0.0_amd64.snap`, and `neurodeck-os_0.0.0_amd64.deb` artifacts — all three configured Linux targets, no errors.
5. The AppImage was extracted (`--appimage-extract`) and its embedded `.desktop` file inspected directly:
   ```
   [Desktop Entry]
   Name=NeuroDeck OS
   Exec=AppRun --no-sandbox %U
   Terminal=false
   Type=Application
   Icon=neurodeck-os
   StartupWMClass=neurodeck-os
   X-AppImage-Version=0.0.0
   Comment=NeuroDeck OS / NDX Harness — controller-native AI operating shell for Steam Deck
   Categories=Development;
   ```
   `StartupWMClass=neurodeck-os` is exactly what `desktopName: neurodeck-os.desktop` (minus the suffix) + `syncDesktopName: true` is documented to produce, confirmed against the actual installed `electron-builder`/`app-builder-lib` source (`LinuxTargetHelper.js`), not just its docs.
6. `dpkg-deb -I` on the built `.deb` confirmed real, correct control metadata (package name, vendor, maintainer, homepage, real runtime `Depends` list) — no placeholder values.

## Reproducing a Linux build from Windows

```bash
# One-time: a WSL distro with Node + npm (this machine already had Ubuntu with both)
wsl -d Ubuntu -- bash -lc "which mksquashfs node npm"

# Sync the project into the WSL filesystem (not /mnt/c — native module ABI + speed)
wsl -d Ubuntu -- bash -lc "rsync -a --delete --exclude node_modules --exclude .git --exclude dist --exclude out /mnt/c/path/to/Neurodeck/ ~/neurodeck-build/"

# Fresh install + real Linux build
wsl -d Ubuntu -- bash -lc "cd ~/neurodeck-build && npm install && npm run build:linux"

# Artifacts land in ~/neurodeck-build/dist/ inside WSL
wsl -d Ubuntu -- bash -lc "ls ~/neurodeck-build/dist/*.AppImage ~/neurodeck-build/dist/*.deb ~/neurodeck-build/dist/*.snap"
```

Re-run the `rsync` step before each build to pick up source changes (it mirrors with `--delete`, so it stays in sync with the Windows working tree without re-cloning).

## Steam Game Mode and Desktop Mode

This repo cannot automate adding itself to a user's Steam library — that's an action against the user's own Steam client/library, not something a build artifact can do for itself. What's real and documented instead:

- **Desktop Mode**: install the `.deb` (or run the AppImage directly) on a real SteamOS/Linux desktop session; the `.desktop` entry verified above gives it correct name, icon, category, and window-association metadata in any standard desktop environment (GNOME, KDE Plasma — what SteamOS Desktop Mode uses).
- **Game Mode**: add the built AppImage as a non-Steam game (Steam → Library → Add a Non-Steam Game → Browse to the `.AppImage` file). Steam Game Mode has no separate manifest format beyond this — it launches whatever executable the shortcut points at, fullscreen, with whatever controller input the app itself reads (this app's `GamepadAdapter`/Spatial Focus Engine, real and tested elsewhere in this ledger). The verified `StartupWMClass` match means Steam's own "is this game still running" window detection (used for its overlay and stop-game button) can actually find the right window.
- **Not done**: a Steam Input controller-config preset (`.vdf`) for this app, Decky Loader plugin integration, and a signed/notarized release — all separate, unstarted efforts genuinely outside this slice's scope.

## Remaining gaps

- No CI job builds the Linux targets automatically — this was a manual, one-time verification on this machine's WSL2 install, not an automated pipeline.
- `snap` packaging downloads a real Electron snap template at build time but was not installed/run via `snapd` to confirm runtime behavior beyond the artifact being produced.
- `rpm`/`pacman`/other Linux package formats `electron-builder` supports were not configured or tested — only the three already listed in `electron-builder.yml` (`AppImage`, `snap`, `deb`).
