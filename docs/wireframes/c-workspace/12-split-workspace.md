# 12. Split Workspace Mode

**Category:** C — AI Workspace  
**Complexity:** Tier 3  
**Status:** New — layout compositor inside WorkspaceView  
**Shell:** Full App Shell (replaces single WorkspaceView content area with split panels)

---

## Purpose

Support IDE-style multitasking — run the AI workspace alongside a terminal, browser, memory panel, or file viewer simultaneously.

---

## Primary User Goal

See AI responses and related tool output side-by-side without switching views.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Workspace (Split)                     [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [SPLIT SELECTOR BAR — 32px]                                           │
│ Rail │  Split: [Chat+Terminal ✓] [Chat+Browser] [Chat+Memory] [Chat+Logs] [✕] │
│      ├──────────────────────────────────┬──────────────────────────────────────┤
│      │  [LEFT PANEL — Chat]             │  [RIGHT PANEL — Terminal]           │
│      │                                  │                                      │
│      │  [Conversation canvas]           │  [Terminal viewport]                 │
│      │  (same as #10 workspace)         │  (same as #36 terminal)              │
│      │                                  │                                      │
│      │  [Prompt dock]                   │  [Terminal input]                    │
│      ├──────────────────────────────────┤──────────────────────────────────────┤
│      │              ◀ ║ ▶              (resize handle — drag to adjust split)  │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Confirm  [B] Back  [LB/RB] Switch Panel  [Y] Layout  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Split Selector Bar | Tab chip row + close button | Active split layout + ✕ exit split | 32px; sticky at top of content area |
| Left Panel | `WorkspaceView` (constrained) | Chat conversation + prompt dock | 50% default; resizable |
| Resize Handle | Draggable divider | `◀ ║ ▶` drag handle | Mouse drag or D-pad to adjust; min width 300px per panel |
| Right Panel | Swappable content panel | Terminal / Browser / Memory / Logs | Swapped via split selector |

---

## Split Layout Options

| Layout | Left | Right | Use Case |
|--------|------|-------|---------|
| Chat + Terminal | WorkspaceView | TerminalView (embedded) | Send bash commands from AI response to terminal |
| Chat + Browser | WorkspaceView | BrowserView (embedded) | Research while chatting |
| Chat + Memory | WorkspaceView | MemoryView (embedded) | Review context while chatting |
| Chat + Diagnostics | WorkspaceView | DiagnosticsView (embedded) | Debug while chatting |
| Chat + File Preview | WorkspaceView | IDEView file viewer (embedded) | Review code files while chatting |

---

## Primary Action

**Label:** Switch panel focus (LB/RB on controller, click on panel with mouse)  
**Outcome:** Keyboard and controller input routes to focused panel

---

## Secondary Actions

- **Split selector** — change right panel to a different view
- **Resize handle** — drag to adjust left/right width ratio
- **Send to chat** — "Send output to chat" button in right panel (e.g., terminal output → chat input)
- **Send to terminal** — code block "Run" button sends command to right terminal panel (no tab switch needed)
- **✕ Exit split** — returns to single-panel Workspace view; animated transition

---

## States

### Split Active
- Active panel has visible focus ring on the resize handle
- Focused panel's title bar tinted slightly

### Panel Unavailable (IPC down)
- Right panel shows `ErrorState`: "Terminal unavailable — backend disconnected"
- Left chat panel still functional

### Permission Required (right panel)
- Right panel shows `EmptyState` with `ShieldAlert` icon: "Permission required"
- Action: "Open Settings" link

### Runtime Unavailable
- Specific to Chat + Browser if browser service not running
- `EmptyState` in right panel: "Browser session unavailable — click to retry"

---

## IPC Dependencies

Inherits from both panels — see Workspace (#10) and the respective right panel view (#36, #38, #26, etc.).

---

## Controller Navigation

- **LB:** Move focus to left panel
- **RB:** Move focus to right panel
- **D-pad (within panel):** Standard navigation for that panel
- **A:** Confirm action in focused panel
- **B:** Exit split mode (back to single workspace)
- **Y:** Open layout selector (split selector bar focused)
- **L stick left/right:** Adjust resize ratio (fine control, 5% per step)
- **Hint bar:** `[A] Confirm  [B] Exit Split  [LB/RB] Switch Panel  [Y] Layout`

---

## Keyboard / Mouse Fallback

- **Tab (cross-panel):** Cycles between panels
- **Ctrl+Shift+Left/Right:** Switch focused panel
- **Drag (resize handle):** Mouse drag adjusts split
- **Alt+1/2:** Focus left/right panel

---

## Accessibility Notes

- Both panels: full `<main>` landmark semantics preserved within each
- Active panel: `aria-label="Left panel — active"` / `aria-label="Right panel — active"` with `aria-current`
- Resize handle: `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` (percentage), keyboard adjustable with Left/Right arrows
- Panel switch: announcement via `aria-live="polite"`: "Focus moved to [panel name]"

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/workspace/SplitWorkspaceLayout.tsx` — **New sub-component**, rendered inside WorkspaceView when split mode active

**Split state:** Local state in WorkspaceView:
```typescript
const [splitMode, setSplitMode] = useState<SplitLayout | null>(null)
// SplitLayout = "terminal" | "browser" | "memory" | "diagnostics" | "file"
```

**Panel sizing:**
```typescript
const [splitRatio, setSplitRatio] = useState(50) // percentage
// CSS: grid-template-columns: `${splitRatio}% ${100 - splitRatio}%`
```

**Resize handle:** Use `onMouseDown` + `document.onMouseMove` + `document.onMouseUp` pattern. Throttle updates to 60fps. Clamp to `[20%, 80%]`.

**Embedded views:** Right panel renders a constrained version of the target view (no nav rail, no title bar, no hint bar) via a `<FeaturePanel>` wrapper that strips shell chrome.

**Send to chat integration:**
```typescript
// In TerminalView when embedded:
// "Send to chat" button appends terminal output to workspace composer
dispatch({ type: "set-composer", value: terminalOutput })
```
