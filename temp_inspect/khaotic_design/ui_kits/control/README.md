# Mission Control UI Kit

The internal studio dashboard — how Khaotic Labs runs its operations as a one-person unicorn. Built entirely on the Khaotic Ultraviolet/Lime system + the shared glass surfaces.

## Why this exists

The studio runs from a terminal, but Mission Control is the "single pane of glass" view: what's shipping right now, which AI agents are hot, which automations ran, where each client stands, and the running log of bug-patterns worth promoting to `pkg/`. It demonstrates how the brand handles a **dense product UI** — not just marketing.

## Screens (sidebar nav)

| View | What it shows |
|---|---|
| **Overview** | Stat strip + active sprint (with phase pips + checklist) + live activity feed + agent fleet grid + automations table + client table. The whole studio at a glance. |
| **Agent Fleet** | Larger agent cards — Claude / Gemini / Groq / OpenRouter — with load meters, p50 latency, 24h call counts. |
| **Automations** | Full n8n workflow table — trigger, last run, run count, status chip. |
| **Clients** | Full engagement table — tier, stage, type, value, next action, health dot. |
| **Corrections** | The `.corrections.log` — recurring patterns tagged `PATTERN` / `FIX` / `WARN`, the Antigravity principle in action. |

## Components (`components.jsx`, exported to `window`)

`Sidebar` · `Topbar` (live clock) · `StatStrip` · `SprintPanel` (phase pips + progress bar + checklist) · `FeedPanel` · `AgentCell` (load meter) · `AutomationsPanel` · `ClientsPanel` (compact + `full`) · `LogPanel`.

All panels use `.glass` / `.glass-tile` from the root token sheet, so they inherit the tvOS-premium depth + neon hover.

## Run

```
open index.html
```

React + Babel pinned UMD + the shared `colors_and_type.css`. No build step. `data.js` holds all the fake operations data — swap it for a real feed.

## Disclaimers

- All sprint/agent/client/log data is fictional and lives in `data.js`.
- Nav switches views in local state; nothing persists.
- Agent load/latency numbers are static (no live polling).
- **Note on previews:** the in-tool screenshot capture can't render this kit's glass+gradient panels (it shows the main column black). The page renders correctly in a real browser — verified via DOM inspection (all panels laid out, opaque, hit-testable). Open `index.html` to see it.
