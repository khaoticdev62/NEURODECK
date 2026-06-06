# Navigation Flow Map

Updated: 2026-06-06

## Navigation Inventory

| Source | Nav Item | Target | Auth Required | Expected Page | Active State | Test Status |
|---|---|---:|---:|---|---|---|
| Primary nav | Chat | `view-chat` | No | Chat workspace | `.nav-tab.active`, `.view-content.active` | Passing |
| Primary nav | Canvas | `view-canvas` | No | Code canvas | same | Passing |
| Primary nav | Terminal | `view-terminal` | No | PTY terminal | same | Passing |
| Primary nav | SSH | `view-ssh` | No | SSH profiles/session | same | Passing |
| Primary nav | Tunnel | `view-tunnel` | No | Tunnel tools | same | Passing |
| Primary nav | Share | `view-share` | No | LAN/SFTP/FTP sharing | same | Passing |
| Primary nav | Browser | `view-browser` | No | Browser shell | same | Passing |
| Primary nav | Agent | `view-agent` | No | Agent task shell | same | Passing |
| Primary nav | Memory | `view-memory` | No | Memory manager | same | Passing |
| Primary nav | Prompt Lab | `view-prompt-lab` | No | Prompt formulas | same | Passing |
| Primary nav | Remote | `view-remote` | No | Remote control | same | Passing |
| Primary nav | Docs | `view-docs` | No | Docs/RAG shell | same | Passing |

## Desktop Navigation

Desktop navigation is tab-based inside a single renderer document. There is no route URL; view state is controlled by `.nav-tab[data-view]` and matching `#view-*` panels.

Command palette actions call `window.activateViewByName()` and share the same 12-view inventory.

## Compact / Handheld Navigation

The 1280x800 Steam Deck target is covered by `navigation-validation.spec.ts`. The nav must remain clickable and must not introduce horizontal overflow.

The radial menu mirrors the 12 primary views and opens by backtick in keyboard mode.

## Native Electron Navigation

Native menu/tray paths were reviewed as out of scope for this focused renderer repair. No main/preload security APIs were changed.

## Navigation Test Requirements

- All primary nav items tested: Passing
- All secondary nav items tested: Partial, Share inner tabs covered by axe and existing shell tests
- All settings nav items tested: Passing for keyboard activation
- All menu items tested where practical: Gap
- Active state tested: Passing
- Auth redirects tested: Not applicable
- 404 tested: Not applicable, no router
- Dynamic routes tested: Not applicable
- Browser back/forward tested: Existing Browser controls present, not part of focused run
- Keyboard navigation tested: Passing
- Focus after navigation tested: Passing for settings close and primary nav
- Compact nav tested: Passing at 1280x800
- Electron native menu actions tested where practical: Gap

