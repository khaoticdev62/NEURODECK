# Steam Deck Install Test Matrix

## Core flows

| Scenario | Target | Expected result |
|---|---|---|
| Fresh install | Linux AppImage | Install succeeds, launchers and desktop entries created |
| Fresh install | Linux portable tarball | Install succeeds from extracted portable package |
| Reinstall | Existing install | Idempotent update with no duplicate launchers |
| Repair | Existing install | Launchers, manifests, and entries regenerated |
| Uninstall keep data | Existing install | App removed, config/data preserved |
| Uninstall remove data | Existing install | App, config, cache, and logs removed |

## Runtime validation

| Scenario | Probe | Expected result |
|---|---|---|
| Self-test launch | `validate-runtime.sh` | JSON/Markdown/log artifacts written, exit 0 |
| Terminal smoke | `echo neurodeck-terminal-ok` | Probe succeeds |
| Browser storage | local/session storage write | Probe succeeds |
| Plugin path | plugin dir present + writable | Probe succeeds |
| Missing VPN tools | Browser VPN | Warning only |
| Missing model runtime | Models | Warning only |

## Steam Deck integration

| Scenario | Probe | Expected result |
|---|---|---|
| Desktop entry | `create-desktop-entry.sh` output | Desktop entry exists and resolves launcher |
| Game Mode launcher | `validate-game-mode.sh` | Launcher exists, 1280x800 defaults confirmed |
| Steam shortcut safe path | `add-to-steam.sh` | Backup created; manual fallback emitted when automation is not proven safe |

## Proton validation

| Scenario | Expected result |
|---|---|
| Steam missing | `not_available` |
| Proton missing | `not_available` |
| Windows artifact missing | blocked / exit 4 |
| Compatdata unwritable | blocked / exit 6 |
| Successful launch | pass / exit 0 |
| Launch with warnings | warning / exit 1 |

## Hardware matrix

| Device | Desktop Mode | Game Mode | Notes |
|---|---|---|---|
| Steam Deck LCD | Manual | Manual | Verify launcher visibility and logs |
| Steam Deck OLED | Manual | Manual | Verify 1280x800 defaults and controller focus |
