# Chat UI Kit

A multi-workspace client-comms hub for **Khaotic Labs**, the solo studio. Combines the strongest patterns from **Telegram**, **WhatsApp**, **Discord**, and **Signal** — rendered in the Khaotic Ultraviolet/Lime system.

## Reframed for the studio

Khaotic Labs is solo, so a "team chat" wouldn't make sense. Instead, this kit models a **client-comms hub** the founder runs day-to-day:

- **Internal channels** (`#studio`, `#sprint-board`, `#agents-live`, `#corrections-log`) — where the founder posts SDLC notes, agent-status pings, and bug-pattern logs.
- **Client DMs** — one thread per active engagement (Vector Health, Riftworks, Maple Loop, Northbeam, fractional-CTO retainers).
- **Other workspaces** — AI Cohort and Indie Makers communities the founder participates in (left rail).

Messages reference real services and stack (Sprint 04, Turso upsert, Groq stream, Cloudflare deploy, n8n workers).

## What's here

| File | Purpose |
|---|---|
| `index.html` | The whole app shell. Open this. |
| `app.jsx` | Root `<App>` — state, channel routing, sends. |
| `components.jsx` | Every component (workspaces / sidebar / chat / composer / members). Exported to `window`. |
| `data.js` | Fake clients, channels, messages, reactions. |
| `styles.css` | Token bindings + scrollbar styles + a few things Tailwind can't express cleanly. Aliases the older `--forge-*` and `--phos-*` token names to the new UV/lime system. |

## Patterns lifted from each app

| From | Pattern | Where |
|---|---|---|
| Discord | Workspace rail on the far left (64px) | `<WorkspaceRail/>` |
| Discord | Channel list with `#` prefix and category headers | `<ChannelList/>` |
| Discord | Right-side member list with online/offline groups | `<MembersList/>` |
| Telegram | Two-pane conversation row (avatar + last msg + unread count) | `<ConversationRow/>` |
| Telegram | Pinned message banner at top of chat | `<PinnedBanner/>` |
| WhatsApp | Message bubbles with grouped sender avatar | `<Message/>` |
| WhatsApp | Read receipts (single / double / lime-double check) | `<ReadReceipt/>` |
| Signal | Padlock + "Encrypted end-to-end" header line | `<ChatHeader/>` |
| Signal | Disappearing-message timer chip | `<DisappearChip/>` |
| All four | Reaction tray + emoji reactions on bubble | `<ReactionTray/>` |
| All four | Reply-to / quote with vertical accent bar | `<Reply/>` |

## Khaotic Labs treatment

- The main chat panel is wrapped in a `[root@khaotic:~/chat/#sprint-board]$` window frame.
- **Online dots are Electric Lime** (`#A3E635`) — `status: accepting_clients` energy.
- Unread indicators, mention highlights, send button, and the composer focus state are **lime**.
- Active channel left-border is **ultraviolet** (the structural accent).
- Code blocks in messages use the terminal palette and are first-class — paste a `pkg/rag/ingest.go` snippet, it lights up.
- Voice messages render as a waveform with a `[ VOICE · 0:14 ]` bracket label.
- Encryption status is a **`[E2E]`** bracket pill — uses the lime+UV brand voice, not a generic padlock.

## Run

```
open index.html
```

No build step. Tailwind comes from CDN; React + Babel are pinned UMD scripts with integrity hashes.

## Disclaimers

- Messages send into local state only; refreshing resets.
- Clients (Maya Lin, Alex Johansson, Kira Reyes, Daniyar M., Rumi Nakata) are fictional. The cadence of the messages is the reference.
- Voice messages, file uploads, video calls, and search use realistic-looking placeholder states.
- No actual encryption — the `[E2E]` chip is visual.
