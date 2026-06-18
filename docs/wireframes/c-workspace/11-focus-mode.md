# 11. Neural Command Window Focus Mode

**Category:** C — AI Workspace  
**Complexity:** Tier 2  
**Status:** New — app-level fullscreen toggle layer over WorkspaceView  
**Shell:** Full-Screen Override (hides nav rail, secondary rail, title bar chrome)

---

## Purpose

Provide a distraction-free AI workspace for users who want full attention on the conversation without sidebar clutter.

---

## Primary User Goal

Read and write without any UI chrome competing for attention.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [COMPACT HEADER — 36px]                                                        │
│ ◀ [Session Name]          [Developer · gemini-2.5-flash]          [⊞ Exit]    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                    [CONVERSATION CANVAS — full-width]                          │
│                    max-width: 760px, centered                                  │
│                                                                                │
│            ┌─────────────────────────────────────────┐                        │
│            │ 👤 You                                  │                        │
│            │ Explain cosine similarity in plain terms│                        │
│            └─────────────────────────────────────────┘                        │
│                                                                                │
│            ┌─────────────────────────────────────────┐                        │
│            │ 🤖 Developer                            │                        │
│            │ Cosine similarity measures the angle…   │                        │
│            │ [Copy] [Retry] [Save]                   │                        │
│            └─────────────────────────────────────────┘                        │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ [PROMPT DOCK — 56px]                                                           │
│ /  Prompt…                              [📎] [🧠] [⚙] [↑ Send]              │
│ [Chat] [Code] [Analyze] [Research] [Terminal]                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│ [HINT BAR — deck mode only]                                                    │
│ [A] Send  [B] Exit Focus  [X] Mode  [Y] Regen                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Compact Header | Custom bar | Back arrow + session name + active persona/model + exit button | 36px (smaller than standard 44px title bar) |
| Conversation Canvas | `ChatViewport` | Full-width message history, max-width 760px centered | Same content as Workspace #10 |
| Prompt Dock | `InputConsole` | Textarea + mode pills + action buttons | Identical to Workspace; compact vertical padding |
| Hint Bar | `ControllerHintBar` | Deck mode only; minimal hints | Reduced to 4 hints vs. standard 7 |

---

## Primary Action

**Label:** ↑ Send  
**Outcome:** Same as Workspace Chat — sends prompt, streams response

---

## Secondary Actions

- **⊞ Exit Focus Mode** — returns to normal Workspace view (nav rail + rails reappear, animate in)
- **B (controller) / Escape (keyboard):** Exit focus mode
- **[📎] [🧠] [⚙]:** Same as Workspace — attach, memory, tools
- **[← Back]** (compact header) — navigates back without exiting focus mode

---

## States

### Calm Reading
- Auto-hides compact header + prompt dock after 3s of inactivity (mouse/controller)
- Hover anywhere → header/dock reappear with `animate-fade-in`
- `prefers-reduced-motion`: no hide/show animation — elements always visible

### Active Prompting
- Header and dock always visible
- Input focused

### Streaming
- Same streaming behavior as Workspace
- Compact header shows streaming indicator dot

### Error
- `ErrorState` banner (slim variant) below compact header — same as Workspace error states

### Context Warning
- Slim banner above prompt dock: "Context 90% full"

---

## IPC Dependencies

Identical to Workspace (#10) — Focus Mode is a layout wrapper over the same view, not a separate IPC consumer.

---

## Controller Navigation

- **D-pad Up/Down:** Scroll conversation
- **A:** Send
- **B:** Exit focus mode
- **X:** Cycle prompt mode
- **Y:** Regenerate
- **Hint bar:** `[A] Send  [B] Exit  [X] Mode  [Y] Regen`

---

## Keyboard / Mouse Fallback

- **Escape:** Exit focus mode
- **Ctrl+Shift+F (or custom):** Toggle focus mode on/off
- **Mouse move:** Wake header/dock if auto-hidden

---

## Accessibility Notes

- Focus mode does not change reading order or landmarks — only hides nav elements with `display: none` / `aria-hidden="true"` on sidebar
- Compact header: still has `<header>` role, `aria-label="Focus mode header"`
- Sidebar when hidden: `aria-hidden="true"`, `tabindex="-1"` on all children
- Exit button: `aria-label="Exit focus mode"` clearly describes state change
- `prefers-reduced-motion`: disable auto-hide behavior entirely

---

## Developer Implementation Notes

**Path:** App-level toggle — no new view file needed.

**Implementation:**
```typescript
// In App.tsx or WorkspaceView.tsx:
const [focusMode, setFocusMode] = useState(false)

// CSS: when focusMode === true:
// - PrimarySidebar: display: none + aria-hidden
// - SecondaryRail: display: none + aria-hidden
// - TitleBar: replaced by CompactHeader component
// - WorkspaceView gets className="focus-mode" for layout adjustments
```

**CompactHeader:** New sub-component `components/layout/CompactHeader.tsx` (< 50 lines) — not a full rewrite.

**Toggle trigger:** "Focus mode (⊞)" button in Workspace chat header (screen #10) dispatches `setFocusMode(true)`.

**Auto-hide:** `useIdleTimer()` hook with 3s timeout; disabled when `prefers-reduced-motion`.
