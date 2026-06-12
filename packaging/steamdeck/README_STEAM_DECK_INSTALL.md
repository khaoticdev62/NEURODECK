# NEURODECK Steam Deck Install

The Steam Deck installer is now rooted in `scripts/steamdeck` and `packaging/steamdeck`.

Use the canonical flows:

```bash
bash scripts/steamdeck/package-steamdeck.sh
bash scripts/steamdeck/install.sh --artifact /path/to/NEURODECK.AppImage
bash scripts/steamdeck/validate-installer.sh --artifact /path/to/NEURODECK.AppImage
bash scripts/steamdeck/validate-runtime.sh
bash scripts/steamdeck/validate-game-mode.sh
bash scripts/steamdeck/validate-proton.sh --windows-artifact /path/to/win-unpacked
```

## Installed Paths

- App files: `~/.local/share/neurodeck/app`
- Launchers: `~/.local/share/neurodeck/bin`
- Config: `~/.config/neurodeck`
- Logs: `~/.local/state/neurodeck/logs`
- Cache: `~/.cache/neurodeck`
- Plugins: `~/.local/share/neurodeck/plugins`

## Packaging Outputs

- Linux AppImage
- Linux portable tarball
- Steam Deck Desktop/Game Mode launchers and desktop entries
- Windows x64 installer plus unpacked/zip layout for Proton validation

## Validation Contracts

- `validate-installer.sh` is preflight only. It checks manifests, checksums, artifact completeness, and host readiness without mutating the system.
- `validate-runtime.sh` launches `--self-test --steam-deck --exit-after-self-test` and writes JSON/Markdown/log output.
- `validate-game-mode.sh` verifies launchers and generated helper entries. It emits a partial result with a manual checklist when Steam library mutation cannot be proven safe.
- `validate-proton.sh` attempts a real Proton launch when Steam + Proton are available. Missing Proton returns `not_available`, not `pass`.

## Troubleshooting

- If AppImage FUSE support is unavailable, the generated launchers set `APPIMAGE_EXTRACT_AND_RUN=1`.
- To disable plugins during diagnosis, add `NEURODECK_SAFE_MODE=1` to `~/.config/neurodeck/env`.
- To collect install evidence, run `bash scripts/steamdeck/collect-diagnostics.sh`.
