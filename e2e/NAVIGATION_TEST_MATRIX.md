# Navigation → View Test Matrix

> Maps every nav tab to its E2E coverage status.

| Nav Tab | `data-view` | Test File | Test Name | Status |
|---|---|---|---|---|
| Chat | `chat` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Canvas | `canvas` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Terminal | `terminal` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| SSH | `ssh` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Tunnel | `tunnel` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Share | `share` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Browser | `browser` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Agent | `agent` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Memory | `memory` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Prompt Lab | `prompt-lab` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Remote | `remote` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |
| Docs | `docs` | `settings-shell.spec.ts` | "all primary nav tabs remain clickable across the full strip" | ✅ |

## View-Specific Depth Coverage

| View | Deep Test | File | Status |
|---|---|---|---|
| Chat | Send message + stream response | `chat.spec.ts` | ✅ |
| Chat | Stream error rendering | `chat.spec.ts` | ✅ |
| Chat | Shell hierarchy (kicker) | `settings-shell.spec.ts` | ✅ |
| Canvas | Toolbar icons | `settings-shell.spec.ts` | ✅ |
| Canvas | Toolbar wrap on compact | `settings-shell.spec.ts` | ✅ |
| Terminal | — | — | ⬜ (nav-only) |
| SSH | Shell hierarchy (kicker) | `settings-shell.spec.ts` | ✅ |
| Tunnel | Shell hierarchy (kicker) | `settings-shell.spec.ts` | ✅ |
| Browser | Shell hierarchy (kicker + home) | `settings-shell.spec.ts` | ✅ |
| Agent | Agent switcher open/close | `settings-shell.spec.ts` | ✅ |
| Memory | Shell hierarchy (kicker + search) | `settings-shell.spec.ts` | ✅ |
| Prompt Lab | Shell hierarchy (kicker + icons) | `settings-shell.spec.ts` | ✅ |
| Remote | Horizontal overflow check | `settings-shell.spec.ts` | ✅ |
| Docs | Horizontal overflow check | `settings-shell.spec.ts` | ✅ |
| Share | Inner tab switch (torrent) | `settings-shell.spec.ts` | ✅ |

## Settings Panel Coverage

| Panel | `data-panel` | Test File | Status |
|---|---|---|---|
| General | `sp-general` | `settings-shell.spec.ts` | ✅ (tab switch + theme persistence) |
| AI Model | `sp-ai` | `settings-tabs.spec.ts` | ✅ |
| Appearance | `sp-appearance` | `settings-shell.spec.ts` | ✅ |
| Terminal | `sp-terminal` | `settings-shell.spec.ts` | ✅ |
| Extensions | `sp-extensions` | `settings-tabs.spec.ts` | ✅ |
| Memory | `sp-memory` | `settings-tabs.spec.ts` | ✅ |
| Network | `sp-network` | `settings-shell.spec.ts` | ✅ (compact viewport) |
| Computer | `sp-computer` | `settings-tabs.spec.ts` | ✅ |
| Sync | `sp-sync` | `settings-tabs.spec.ts` | ✅ |
| Voice | `sp-voice` | `settings-tabs.spec.ts` | ✅ |

## Modal / Overlay Coverage

| Overlay | Trigger | Test File | Status |
|---|---|---|---|
| Settings | `#settings-btn` or `Start` | `settings-shell.spec.ts` | ✅ |
| Command Palette | `Ctrl+K` | `settings-shell.spec.ts` | ✅ |
| Shortcuts Help | `?` | `settings-shell.spec.ts` | ✅ |
| Quick Switcher | `Ctrl+Tab` | `settings-shell.spec.ts` | ✅ |
| Notifications | `#notif-btn` | `settings-shell.spec.ts` | ✅ |
| Controller Prompt Picker | `Ctrl+Shift+P` | `settings-shell.spec.ts` | ✅ |
| Agent Switcher | `#model-name` | `settings-shell.spec.ts` | ✅ |
