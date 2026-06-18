# 10. Workspace / Chat (Neural Command Window)

**Category:** C — AI Workspace  
**Complexity:** Tier 3  
**Status:** Exists (`features/workspace/WorkspaceView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Provide the primary AI interaction environment — a structured conversation space with tool integration, context management, and multi-modal prompt input.

---

## Primary User Goal

Send a prompt and receive a high-quality AI response, with tools, memory, and context in reach.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · [Session Name]   [Model ●] [Context: 12k/128k] [─][□][×]│
├──────┬──────────────────────────────────────┬──────────────┬────────────────────┤
│ Nav  │  [CHAT HEADER ZONE]                  │ CONTEXT LENS │ AGENT / TOOL      │
│ Rail │  📋 Research session  ·  Developer   │ PANEL        │ TIMELINE          │
│      │  [Persona ▾]  [Model ▾]  [Focus ⊞]  │              │                   │
│      ├──────────────────────────────────────┤ 📌 Pinned    │ ► Step 1 (done)   │
│      │  [CONVERSATION CANVAS — scrollable]  │ memories     │ ► Step 2 (done)   │
│      │                                      │ (3 items)    │ ◌ Step 3 (run.)   │
│      │  ┌──────────────────────────────┐   │              │                   │
│      │  │ 👤 USER                      │   │ 📄 Project   │ Tool: bash        │
│      │  │ How does RAG work?            │   │ context      │ [output...]       │
│      │  └──────────────────────────────┘   │ (2 files)    │                   │
│      │                                      │              │                   │
│      │  ┌──────────────────────────────┐   │ [Add →]      │                   │
│      │  │ 🤖 AI  [Copy] [Retry] [Save] │   │ [Clear]      │                   │
│      │  │ RAG uses cosine similarity…   │   │              │                   │
│      │  │ [Code block — bash]           │   │              │                   │
│      │  │   $ curl ... [Copy] [Run]     │   │              │                   │
│      │  └──────────────────────────────┘   │              │                   │
│      │                                      │              │                   │
│      ├──────────────────────────────────────┴──────────────┴────────────────────┤
│      │  [PROMPT COMMAND DOCK]                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │ /  Prompt or slash command…                    [📎] [🧠] [⚙] [↑]│  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │  [Chat] [Code] [Analyze] [Refactor] [Research] [Terminal] [Agent Task] │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Send  [B] Back  [X] Mode  [Y] Tools  [L4] Persona     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Chat Header | Custom bar | Session name, persona selector, model selector, focus mode button | Sticky |
| Conversation Canvas | `ChatViewport` scrollable | Message cards (user + AI + tool calls) | Auto-scrolls on new message; `aria-live="polite"` |
| Context Lens Panel | Right panel | Pinned memories, project files, source chips | Collapsible; 200px |
| Agent / Tool Timeline | Right panel | Tool call steps with status | Collapsible; shares space with Context Lens |
| Prompt Command Dock | `InputConsole` | Multiline textarea, mode pills, attach/memory/tools/send buttons | Sticky at bottom; Shift+Enter = newline |

---

## Message Card Types

### User Message Card
```
┌────────────────────────────────────────────┐
│  👤 You                          [12:34]   │
│  [message text]                            │
└────────────────────────────────────────────┘
```

### AI Response Card
```
┌────────────────────────────────────────────┐
│  🤖 Developer (gemini-2.5-flash)  [12:34] │
│  [response text — markdown rendered]       │
│  ┌─────────────────────────────────────┐   │
│  │ ```bash                             │   │
│  │ $ git status                        │   │
│  │ [Copy] [Run in Terminal] [Save]     │   │
│  └─────────────────────────────────────┘   │
│  [📋 Copy] [🔄 Retry] [📌 Save to Memory] │
└────────────────────────────────────────────┘
```

### Tool Call Card
```
┌────────────────────────────────────────────┐
│  ⚡ Tool: web_search               Running │
│  Query: "RAG pipeline best practices"      │
│  ▸ Show output                             │
└────────────────────────────────────────────┘
```

### Memory Reference Chip (inline)
```
[🧠 From memory: "cosine similarity..."]
```

### Citation Chip (inline)
```
[📄 Source: docs/architecture.md:L42]
```

---

## Prompt Modes

| Mode | Icon | System prompt modifier | Use case |
|------|------|----------------------|---------|
| Chat | `MessageSquare` | None (default) | General conversation |
| Code | `Code` | "You are an expert coder..." | Code generation |
| Analyze | `Search` | "Analyze this carefully..." | Analysis tasks |
| Refactor | `RefreshCw` | "Refactor this code..." | Code improvement |
| Research | `Globe` | "Research and cite sources..." | Information gathering |
| Terminal | `Terminal` | "Provide shell commands..." | CLI help |
| Agent Task | `Bot` | Activates agent loop | Multi-step tasks |

---

## Primary Action

**Label:** ↑ Send (button) / Enter  
**IPC:** `window.neurodeck.ai.sendCommand({ prompt, persona, model, context, mode })`  
**Outcome:** Message added to conversation, streaming response via WebSocket `ai:token` events

---

## Secondary Actions

- **Regenerate** (Y button / `R4` on deck) — resends last prompt, replaces last response
- **Persona selector** — switches active persona (dispatches `set-persona`)
- **Model selector** — switches active model (dispatches `set-active-model`)
- **Focus mode (⊞)** — enters Neural Command Window Focus Mode (#11)
- **Attach context (📎)** — opens file picker, adds to context
- **Add to memory (🧠)** — opens memory add modal
- **Tool toggle (⚙)** — opens tool permission panel
- **Copy response** — copies AI text to clipboard
- **Run code block** — sends code to terminal (`window.neurodeck.terminal.ptySpawn`)
- **Save to memory** — saves response or snippet

---

## States

### Empty Chat (new session)
- `EmptyState` (variant `deck`) in conversation canvas
- Icon: `MessageSquare`
- Title: "Neural Command Window"
- Description: "[Persona name] is ready. What are you working on?"
- Suggested prompts: 4 chip shortcuts below empty state

### Streaming Response
- AI card renders in real-time, token by token
- Streaming indicator (pulsing dot after last token)
- Send button replaced with "Stop ■" button
- Input disabled during stream

### Tool Call Running
- Tool card shows `StatusChip` `pulse` mode "Running"
- Timeline panel shows active step

### Tool Call Failed
- Tool card shows `StatusChip` tone `error`
- Inline error: "Tool failed: [reason]" with "Retry" link

### Model Unavailable
- `ErrorState` banner: "Model unavailable — [reason]"
- Input disabled; model selector pulsing amber

### Offline
- Banner: "Offline mode — AI features unavailable"
- Input disabled; cached context still visible

### IPC Disconnected
- `ErrorState` banner full-canvas: "Backend disconnected"
- "Retry Connection" button

### Context Limit Warning
- Banner above input: "Context at 90% capacity (115k/128k tokens)"
- "Start new session" and "Summarize context" actions

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|------------------|
| `window.neurodeck.ai` | `sendCommand()`, `stop()`, `regenerate()` |
| WebSocket | `ai:token`, `ai:done`, `ai:error`, `tool:start`, `tool:result`, `tool:error` |
| `window.neurodeck.sessions` | `save()`, `getMessages()` |
| `window.neurodeck.memory` | `search()`, `addFact()` |
| `window.neurodeck.terminal` | `ptySpawn()` (for Run in Terminal) |

---

## Controller Navigation

- **D-pad Up/Down:** Scroll conversation canvas
- **D-pad (in input):** Navigate slash command suggestions
- **A (confirm):** Send message / confirm suggestion
- **B:** Clear prompt input or collapse tool panel
- **X:** Cycle through prompt modes
- **Y:** Regenerate last response
- **L4:** Switch persona (quick cycle)
- **R4:** Regenerate
- **L5:** Save session
- **R5:** New session
- **Hint bar:** `[A] Send  [B] Clear  [X] Mode  [Y] Regen  [L4] Persona`

---

## Keyboard / Mouse Fallback

- **Enter:** Send message (not Shift+Enter)
- **Shift+Enter:** New line in input
- **↑ (in empty input):** Edit last user message
- **Ctrl+/:** Toggle command suggestions
- **Esc:** Stop streaming / clear suggestions
- **Tab (in conversation):** Navigate between message action buttons

---

## Accessibility Notes

- Conversation: `role="log"`, `aria-live="polite"`, `aria-label="AI conversation"` — each new message announced
- Input: `aria-label="Prompt input"`, `aria-multiline="true"`
- Send button: `aria-label="Send message"`
- Streaming response: `aria-busy="true"` on AI card during stream
- Code blocks: `role="region"`, `aria-label="Code: [language]"`, Copy button has `aria-label="Copy code"`
- Run button: `aria-label="Run in terminal"` with confirm gate for bash
- Persona/model selectors: `<select>` or custom combo with `aria-label`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/workspace/WorkspaceView.tsx` (exists)

**Key sub-components:**
- `ChatViewport` — scrollable message history
- `InputConsole` — prompt input + mode pills
- `ResponseCard` — AI response rendering (markdown, code blocks)
- `ToolCallCard` — inline tool call display

**Streaming (WebSocket):**
```typescript
listen("ai:token", (token) => appendToLastMessage(token))
listen("ai:done", () => setStreaming(false))
listen("ai:error", (err) => showError(err))
```

**RAG context injection:** Handled server-side in `commands/mod.rs` `"send_command"` arm — top-3 memory results prepended to prompt automatically. Frontend shows memory reference chips from returned metadata.

**Code block execution gate:**
```typescript
// In ResponseCard: bash/sh/powershell code blocks show "Run" button
// Clicking opens window.confirm() gate before calling ptySpawn
```
