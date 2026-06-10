# Volume I — Steam Deck UX Bible: Controller Navigation Foundations

## Golden Rule
The user should never be forced to touch the screen, open a keyboard, use a mouse, guess where focus is, or memorize hidden shortcuts.

## Global Controller Layers

- **Layer 0 — Navigation:** always active.
- **Layer 1 — Prompt Layer:** activated by L4.
- **Layer 2 — Command Layer:** activated by R5.
- **Layer 3 — Agent Layer:** activated by L4 hold.
- **Layer 4 — Macro Layer:** activated by L5 + R5.

## Global Input Rules

- **A:** confirm, accept, select, open.
- **B:** back, cancel, close. Never executes actions.
- **X:** edit, modify, configure.
- **Y:** context actions, inspect, duplicate, rename, details.

## Grip Button System

| Grip | Tap | Hold | Double Tap |
|---|---|---|---|
| L4 | Prompt Library | Agent Wheel | Recent Prompts |
| L5 | Save | Snippet Vault | Undo |
| R4 | Accept Suggestion | Regenerate | Next Suggestion |
| R5 | Command Palette | Execute | New Session |

## Chords

- L4 + R4: complete current prompt.
- L5 + R5: macro recording.
- L4 + L5: quick save session.
- R4 + R5: execute with current agent.

## Focus Rules

Every interactive element must define up, down, left, right, enter, and back paths. No dead ends. B always returns to previous focus state. Focus must always be visible.

## Workspace Navigation

```text
Status Bar
  ↓
Workspace Viewport
  ↓
Memory / Agent Panels
  ↓
Prompt Composer
```

## UX Success Criteria

- 100% controller navigable.
- No required keyboard.
- No required touchscreen.
- Every screen reachable in three actions.
- Every action discoverable, remappable, and accessible.
